import axios from 'axios'
import { ethers } from 'ethers'
import bn from 'bignumber.js'
import Moralis from 'moralis'
import { EvmChain } from '@moralisweb3/common-evm-utils'

import BEPABI from '../config/abi/Erc20.json'
import uniPoolABI from '../config/abi/UniswapPool.json'

interface TokensAmount {
  amount0: number
  amount1: number
}

interface Tick {
  tickIdx: string
  liquidityNet: string
  price0: string
  price1: string
}

const Q96 = new bn(2).pow(96)
const DAYS_PER_YEAR = 365
const GRAPH_API_URL =
  'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon'

const _queryUniswap = async (query: string): Promise<any> => {
  const { data } = await axios({
    url: GRAPH_API_URL,
    method: 'post',
    data: {
      query
    }
  })

  return data.data
}

const averageArray = (data: number[]): number => {
  return data.reduce((result, val) => result + val, 0) / data.length
}

const getFeeTierPercentage = (tier: string): number => {
  if (tier === '100') return 0.01 / 100
  if (tier === '500') return 0.05 / 100
  if (tier === '3000') return 0.3 / 100
  if (tier === '10000') return 1 / 100
  return 0
}

const estimateFee = (
  liquidityDelta: bn,
  liquidity: bn,
  volume24H: number,
  feeTier: string
): number => {
  const feeTierPercentage = getFeeTierPercentage(feeTier)
  const liquidityPercentage = liquidityDelta
    .div(liquidity.plus(liquidityDelta))
    .toNumber()

  return feeTierPercentage * volume24H * liquidityPercentage
}

const expandDecimals = (n: number | string | bn, exp: number): bn => {
  return new bn(n).multipliedBy(new bn(10).pow(exp))
}

const getSqrtPriceX96 = (
  price: number,
  token0Decimal: number,
  token1Decimal: number
): bn => {
  const token0 = expandDecimals(price, token0Decimal)
  const token1 = expandDecimals(1, token1Decimal)

  return token0.div(token1).sqrt().multipliedBy(Q96)
}

const mulDiv = (a: bn, b: bn, multiplier: bn) => {
  return a.multipliedBy(b).div(multiplier)
}

const getLiquidityForAmount0 = (
  sqrtRatioAX96: bn,
  sqrtRatioBX96: bn,
  amount0: bn
): bn => {
  // amount0 * (sqrt(upper) * sqrt(lower)) / (sqrt(upper) - sqrt(lower))
  const intermediate = mulDiv(sqrtRatioBX96, sqrtRatioAX96, Q96)
  return mulDiv(amount0, intermediate, sqrtRatioBX96.minus(sqrtRatioAX96))
}

const getLiquidityForAmount1 = (
  sqrtRatioAX96: bn,
  sqrtRatioBX96: bn,
  amount1: bn
): bn => {
  // amount1 / (sqrt(upper) - sqrt(lower))
  return mulDiv(amount1, Q96, sqrtRatioBX96.minus(sqrtRatioAX96))
}

const getLiquidityDelta = (
  P: number,
  lowerP: number,
  upperP: number,
  amount0: number,
  amount1: number,
  token0Decimal: number,
  token1Decimal: number
): bn => {
  const amt0 = expandDecimals(amount0, token1Decimal)
  const amt1 = expandDecimals(amount1, token0Decimal)

  const sqrtRatioX96 = getSqrtPriceX96(P, token0Decimal, token1Decimal)
  const sqrtRatioAX96 = getSqrtPriceX96(lowerP, token0Decimal, token1Decimal)
  const sqrtRatioBX96 = getSqrtPriceX96(upperP, token0Decimal, token1Decimal)

  let liquidity: bn
  if (sqrtRatioX96.lte(sqrtRatioAX96)) {
    liquidity = getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amt0)
  } else if (sqrtRatioX96.lt(sqrtRatioBX96)) {
    const liquidity0 = getLiquidityForAmount0(
      sqrtRatioX96,
      sqrtRatioBX96,
      amt0
    )
    const liquidity1 = getLiquidityForAmount1(
      sqrtRatioAX96,
      sqrtRatioX96,
      amt1
    )

    liquidity = bn.min(liquidity0, liquidity1)
  } else {
    liquidity = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amt1)
  }

  return liquidity
}

const getTokensAmountFromDepositAmountUSD = (
  P: number,
  Pl: number,
  Pu: number,
  priceUSDX: number,
  priceUSDY: number,
  depositAmountUSD: number
): TokensAmount => {
  const deltaL =
    depositAmountUSD /
    ((Math.sqrt(P) - Math.sqrt(Pl)) * priceUSDY +
      (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu)) * priceUSDX)

  let deltaY = deltaL * (Math.sqrt(P) - Math.sqrt(Pl))
  if (deltaY * priceUSDY < 0) deltaY = 0
  if (deltaY * priceUSDY > depositAmountUSD) { deltaY = depositAmountUSD / priceUSDY }

  let deltaX = deltaL * (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu))
  if (deltaX * priceUSDX < 0) deltaX = 0
  if (deltaX * priceUSDX > depositAmountUSD) { deltaX = depositAmountUSD / priceUSDX }

  return { amount0: deltaX, amount1: deltaY }
}

const getPoolTicks = async (poolAddress: string): Promise<Tick[]> => {
  const PAGE_SIZE = 3
  let result: Tick[] = []
  let page = 0
  while (true) {
    const [pool1, pool2, pool3] = await Promise.all([
      _getPoolTicksByPage(poolAddress, page),
      _getPoolTicksByPage(poolAddress, page + 1),
      _getPoolTicksByPage(poolAddress, page + 2)
    ])

    result = [...result, ...pool1, ...pool2, ...pool3]
    if (pool1.length === 0 || pool2.length === 0 || pool3.length === 0) {
      break
    }
    page += PAGE_SIZE
  }
  return result
}

const _getPoolTicksByPage = async (
  poolAddress: string,
  page: number
): Promise<Tick[]> => {
  const res = await _queryUniswap(`{
      ticks(first: 1000, skip: ${
        page * 1000
      }, where: { poolAddress: "${poolAddress}" }, orderBy: tickIdx) {
        tickIdx
        liquidityNet
        price0
        price1
      }
    }`)

  return res.ticks
}

const startMoralis = async (apiKey: string) => {
  await Moralis.start({
    apiKey
  })
}

const getUniswapV3Apy = async (
  pool: string,
  feeTier: string,
  moralisApiKey: string
) => {
  try {
    await startMoralis(moralisApiKey)
  } catch (err) {
    console.log('already started')
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(
      'https://polygon-rpc.com',
      137
    )

    const poolContract = new ethers.Contract(pool, uniPoolABI as any, provider)

    const [token0, token1] = await Promise.all([
      poolContract.token0(),
      poolContract.token1()
    ])

    const token0Addr =
      token0 < token1 ? token0.toLowerCase() : token1.toLowerCase()
    const token1Addr =
      token0 < token1 ? token1.toLowerCase() : token0.toLowerCase()

    const { pools } = await _queryUniswap(`{
            pools(orderBy: feeTier, where: {
                token0: "${token0Addr}",
                token1: "${token1Addr}"}) {
              id
              tick
              sqrtPrice
              feeTier
              liquidity
              token0Price
              token1Price
            }
        }`)

    const apyData = pools.filter(
      (it: any) =>
        it.feeTier && String(it.feeTier).toLowerCase() === feeTier.toLowerCase()
    )

    if (apyData.length === 0) return 0

    const apyItem = apyData[0]
    const { poolDayDatas } = await _queryUniswap(`{
            poolDayDatas(skip: 1, first: 7, orderBy: date, orderDirection: desc, where:{pool: "${apyItem.id}"}) {
              volumeUSD
            }
        }`)

    const volumes = poolDayDatas.map((d: { volumeUSD: string }) =>
      Number(d.volumeUSD)
    )

    const token0Contract = new ethers.Contract(token0, BEPABI as any, provider)

    const token1Contract = new ethers.Contract(token1, BEPABI as any, provider)

    const [token0Decimal, token1Decimal] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals()
    ])

    const volume24H = averageArray(volumes)
    const poolTicks = await getPoolTicks(apyItem.id)
    const firstTick = poolTicks[0]
    const lastTick = poolTicks[poolTicks.length - 1]
    const Pl = Number(firstTick.price0)
    const Pu = Number(lastTick.price0)

    const token0Price = await Moralis.EvmApi.token.getTokenPrice({
      address: token0Addr,
      chain: EvmChain.POLYGON
    })

    const token1Price = await Moralis.EvmApi.token.getTokenPrice({
      address: token1Addr,
      chain: EvmChain.POLYGON
    })

    const { amount0, amount1 } = getTokensAmountFromDepositAmountUSD(
      apyItem.token0Price,
      Pl,
      Pu,
      token0Price.result.usdPrice,
      token1Price.result.usdPrice,
      1000
    )

    const deltaL = getLiquidityDelta(
      apyItem.token0Price,
      Pl,
      Pu,
      amount0,
      amount1,
      token0Decimal,
      token1Decimal
    )

    return (
      estimateFee(deltaL, new bn(apyItem.liquidity), volume24H, feeTier) *
      DAYS_PER_YEAR
    )
  } catch (err) {
    console.log(`uniswap apy err: ${err}`)
    return -1
  }
}

export default getUniswapV3Apy
