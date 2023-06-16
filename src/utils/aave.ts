import { ethers } from 'ethers'

import LendingPoolABI from '../config/abi/lendingPoolABI.json'
import BigNumber from 'bignumber.js'

const lendingPool = '0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf'
const BigNumberEther = ethers.BigNumber

const provider = new ethers.providers.JsonRpcProvider(
  'https://polygon-rpc.com',
  137
)

const lendingContract = new ethers.Contract(
  lendingPool,
  LendingPoolABI as any,
  provider
)

const getAaveApy = async (underlyingAsset: string) => {
  try {
    const RAY = BigNumberEther.from(10).pow(27)
    const DAYS_PER_YEAR = 365

    const liquidityRate = (
      await lendingContract.getReserveData(underlyingAsset)
    ).currentLiquidityRate
    const depositAPR =
      BigNumberEther.from(liquidityRate)
        .mul(BigNumberEther.from(10).pow(10))
        .div(RAY)
        .toNumber() / 1e10

    const depositApy = new BigNumber(1 + depositAPR / DAYS_PER_YEAR)
      .pow(DAYS_PER_YEAR)
      .minus(1)

    return depositApy.toNumber() * 100
  } catch (err) {
    console.log(`aave apy err: ${err}`)
    return -1
  }
}

export default getAaveApy
