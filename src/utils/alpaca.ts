import { ethers } from 'ethers'
import Moralis from 'moralis'
import { EvmChain } from '@moralisweb3/common-evm-utils'

import { getAlpacaInterest } from './helper'

import BEPABI from '../config/abi/Erc20.json'
import alpacaABI from '../config/abi/alpacaABI.json'
import alpacaVault from '../config/abi/alpacaVault.json'

import { BLOCK_GENERATION_TIME, SECONDS_PERY_YEAR } from '../constants/common'

const lendingPool = '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F'
const alpacaToken = '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F'
const provider = new ethers.providers.StaticJsonRpcProvider(
  {
    url: 'https://bsc-dataseed.binance.org',
    skipFetchSetup: true
  }, 56
)

const lendingContract = new ethers.Contract(
  lendingPool,
  alpacaABI as any,
  provider
)

const getPriceFormat = (priceInfo: any) => {
  return Number(ethers.utils.formatEther(priceInfo))
}

const startMoralis = async (apiKey: string) => {
  await Moralis.start({
    apiKey
  })
}

const getAlpacaStakeApy = async (
  pid: number,
  underlyingAsset: string,
  moralisApiKey: string
) => {
  try {
    await startMoralis(moralisApiKey)
  } catch (err) {}

  try {
    const [poolInfo, totalAlloc, perBlock] = await Promise.all([
      lendingContract.poolInfo(pid),
      lendingContract.totalAllocPoint(),
      lendingContract.alpacaPerBlock()
    ])

    const poolAlloc = poolInfo.allocPoint
    const underlyingContract = new ethers.Contract(
      poolInfo.stakeToken,
      BEPABI as any,
      provider
    )
    const totalStaked = await underlyingContract.balanceOf(lendingPool)

    const tokenPrice = await Moralis.EvmApi.token.getTokenPrice({
      address: underlyingAsset,
      chain: EvmChain.BSC
    })

    const alpacaPrice = await Moralis.EvmApi.token.getTokenPrice({
      address: alpacaToken,
      chain: EvmChain.BSC
    })

    const depositApy =
      (getPriceFormat(perBlock) *
        (SECONDS_PERY_YEAR / BLOCK_GENERATION_TIME) *
        (poolAlloc * 100) *
        alpacaPrice?.result.usdPrice) /
      tokenPrice?.result.usdPrice /
      totalAlloc /
      getPriceFormat(totalStaked)

    return depositApy
  } catch (err) {
    console.log(`alpaca stake apy err: ${err}`)
    return -1
  }
}

const getAlpacaLendApy = async (
  strategy: string,
  adapter: string
): Promise<number> => {
  try {
    const vaultContract = new ethers.Contract(strategy, alpacaVault, provider)

    const [depositToken, totalToken] = await Promise.all([
      vaultContract.token(),
      vaultContract.totalToken()
    ])

    const depositContract = new ethers.Contract(depositToken, BEPABI, provider)

    const [depositDecimal, currentBalance] = await Promise.all([
      depositContract.decimals(),
      depositContract.balanceOf(strategy)
    ])

    const utilization =
      100 *
      (1 -
        Number(
          ethers.utils.formatUnits(currentBalance, Number(depositDecimal))
        ) /
          Number(ethers.utils.formatUnits(totalToken, Number(depositDecimal))))

    return await getAlpacaInterest(adapter, utilization)
  } catch (err) {
    console.log(`alpaca lend apy err: ${err}`)
    return -1
  }
}

export {
  getAlpacaStakeApy as getAlpacaStakeAPY,
  getAlpacaLendApy as getAlpacaLendAPY
}
