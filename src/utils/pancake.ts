import { ethers } from 'ethers'
import { BigNumber } from 'bignumber.js'
import Moralis from 'moralis'
import { EvmChain } from '@moralisweb3/common-evm-utils'

import lpAprs56 from '../config/constants/lpAprs/56.json'
import lpAprs1 from '../config/constants/lpAprs/1.json'
import lpAbi from '../config/abi/LPPair.json'

import erc20Abi from '../config/abi/Erc20.json'
import pksPoolAbi from '../config/abi/pancakePool.json'

const BSC_BLOCK_TIME = 3
const BLOCKS_PER_DAY = (60 / BSC_BLOCK_TIME) * 60 * 24
const BLOCKS_PER_YEAR = BLOCKS_PER_DAY * 365 // 10512000

const rpcProvider = new ethers.providers.StaticJsonRpcProvider(
  {
    url: 'https://bsc-dataseed.binance.org',
    skipFetchSetup: true
  }, 56
)

const cakeToken = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'

const startMoralis = async (apiKey: string) => {
  await Moralis.start({
    apiKey
  })
}

const getPoolApr = (
  stakingTokenPrice: number,
  rewardTokenPrice: number,
  totalStaked: number,
  tokenPerBlock: number
): number => {
  const totalRewardPricePerYear = new BigNumber(rewardTokenPrice)
    .times(tokenPerBlock)
    .times(BLOCKS_PER_YEAR)
  const totalStakingTokenInPool = new BigNumber(stakingTokenPrice).times(
    totalStaked
  )
  const apr = totalRewardPricePerYear.div(totalStakingTokenInPool).times(100)
  return apr.isNaN() || !apr.isFinite() ? 0 : apr.toNumber()
}

const getLpApr = (chainId: number) => {
  switch (chainId) {
    case 56:
      return lpAprs56
    case 1:
      return lpAprs1
    default:
      return {}
  }
}

const getFarmApr = (
  chainId: number,
  poolWeight: number,
  cakePriceUsd: number,
  poolLiquidityUsd: number,
  farmAddress: string,
  regularCakePerBlock: number
): number => {
  const yearlyCakeRewardAllocation =
    poolWeight * BLOCKS_PER_YEAR * regularCakePerBlock

  const cakeRewardsApr =
    (yearlyCakeRewardAllocation * cakePriceUsd * 100) / poolLiquidityUsd / 2
  const lpRewardsApr: any =
    (((getLpApr(chainId) as any)[farmAddress?.toLowerCase()]) ||
      ((getLpApr(chainId) as any)[farmAddress])) ??
    0 // can get both checksummed or lowercase

  if (cakeRewardsApr && lpRewardsApr) {
    return cakeRewardsApr + lpRewardsApr
  } else if (cakeRewardsApr) {
    return cakeRewardsApr
  }

  return 0
}

const getPancakeApy = async (
  pid: number,
  strategy: string,
  isFarm: boolean,
  moralisApiKey: string
): Promise<number> => {
  try {
    await startMoralis(moralisApiKey)
  } catch (err) {
    console.error('error starting moralis', err)
  }

  try {
    let apyVal = 0
    const poolContract = new ethers.Contract(strategy, pksPoolAbi, rpcProvider)

    if (isFarm) {
      // is farm
      const [lpToken, poolInfo, totalRegular, totalSpecial] = await Promise.all(
        [
          poolContract.lpToken(pid),
          poolContract.poolInfo(pid),
          poolContract.totalRegularAllocPoint(),
          poolContract.totalSpecialAllocPoint()
        ]
      )

      const lpTokenContract = new ethers.Contract(lpToken, lpAbi, rpcProvider)

      const [reserves, token0, cakePerBlock] = await Promise.all([
        lpTokenContract.getReserves(),
        lpTokenContract.token0(),
        poolContract.cakePerBlock(poolInfo.isRegular)
      ])

      const token0Contract = new ethers.Contract(token0, erc20Abi, rpcProvider)

      const [token0Decimal, token0Price, cakePrice] = await Promise.all([
        token0Contract.decimals(),
        Moralis.EvmApi.token.getTokenPrice({
          address: token0,
          chain: EvmChain.BSC
        }),
        Moralis.EvmApi.token.getTokenPrice({
          address: cakeToken,
          chain: EvmChain.BSC
        })
      ])

      const liquidityUSD =
        token0Price.result.usdPrice *
        Number(ethers.utils.formatUnits(reserves[0], Number(token0Decimal)))

      apyVal = getFarmApr(
        56,
        Number(poolInfo.allocPoint) /
          Number(poolInfo.isRegular ? totalRegular : totalSpecial),
        cakePrice.result.usdPrice,
        liquidityUSD,
        lpToken,
        Number(ethers.utils.formatEther(cakePerBlock))
      )
    } else {
      // is pool
      const [bonusEndBlock, curBlockNumber] = await Promise.all([
        poolContract.bonusEndBlock(),
        rpcProvider.getBlockNumber()
      ])

      if (Number(bonusEndBlock) <= curBlockNumber) apyVal = 0
      else {
        const [stakeToken, rewardToken, rewardPerBlock] = await Promise.all([
          poolContract.stakedToken(),
          poolContract.rewardToken(),
          poolContract.rewardPerBlock()
        ])

        const stakeContract = new ethers.Contract(
          stakeToken,
          erc20Abi,
          rpcProvider
        )
        const rewardContract = new ethers.Contract(
          rewardToken,
          erc20Abi,
          rpcProvider
        )

        const [stakeDecimal, rewardDecimal] = await Promise.all([
          stakeContract.decimals(),
          rewardContract.decimals()
        ])

        const [stakePrice, rewardPrice] = await Promise.all([
          Moralis.EvmApi.token.getTokenPrice({
            address: stakeToken,
            chain: EvmChain.BSC
          }),
          Moralis.EvmApi.token.getTokenPrice({
            address: rewardToken,
            chain: EvmChain.BSC
          })
        ])

        let totalStaked = await stakeContract.balanceOf(strategy)
        totalStaked = ethers.utils.formatUnits(
          totalStaked,
          Number(stakeDecimal)
        )

        apyVal = getPoolApr(
          stakePrice.result.usdPrice,
          rewardPrice.result.usdPrice,
          Number(totalStaked),
          Number(
            ethers.utils.formatUnits(rewardPerBlock, Number(rewardDecimal))
          )
        )
      }
    }

    return apyVal
  } catch (err) {
    console.log(`pancake apy err: ${err}`)
    return -1
  }
}

export default getPancakeApy
