import { ethers } from 'ethers'

import adapterAbi from '../config/abi/HedgepieAdapter.json'

const provider = new ethers.providers.JsonRpcProvider(
  'https://bsc.nodereal.io',
  56
)

export const getAdapterInfo = async (adapter: string, info = 'pid') => {
  const adapterContract = new ethers.Contract(adapter, adapterAbi, provider)

  let adapterInfo: any
  if (info == 'pid') adapterInfo = await adapterContract.pid()
  else if (info == 'strategy') adapterInfo = await adapterContract.strategy()
  else if (info == 'staking_token') { adapterInfo = await adapterContract.stakingToken() }

  return adapterInfo
}

export const getAlpacaInterest = async (
  token: string,
  utilization: number
): Promise<number> => {
  // https://docs.alpacafinance.org/our-protocol-1/global-parameters/interest-rate-model
  console.log(token, utilization)
  let m: number = 0
  let b: number = 0
  if (token.includes('cake')) {
    if (utilization <= 80) {
      m = 0.25
      b = 0
    } else if (utilization <= 90) {
      m = 0
      b = 0.2
    } else {
      m = 13
      b = -11.5
    }
  } else if (token.includes('alpaca')) {
    if (utilization <= 60) {
      m = 0.333
      b = 0
    } else if (utilization <= 90) {
      m = 0
      b = 0.2
    } else {
      m = 13
      b = -11.5
    }
  } else if (token.includes('bnb')) {
    if (utilization <= 50) {
      m = 0.2
      b = 0
    } else if (utilization <= 90) {
      m = 0
      b = 0.1
    } else {
      m = 14
      b = -12.5
    }
  } else if (token.includes('busd')) {
    if (utilization <= 30) {
      m = 0.267
      b = 0
    } else if (utilization <= 90) {
      m = 0
      b = 0.08
    } else {
      m = 14.2
      b = -12.7
    }
  } else if (token.includes('usdt')) {
    if (utilization <= 40) {
      m = 0.2
      b = 0
    } else if (utilization <= 90) {
      m = 0
      b = 0.08
    } else {
      m = 14.2
      b = -12.7
    }
  } else if (token.includes('eth')) {
    if (utilization <= 70) {
      m = 0.286
      b = 0
    } else if (utilization <= 90) {
      m = 0
      b = 0.2
    } else {
      m = 13
      b = -11.5
    }
  } else {
    if (utilization <= 60) {
      m = 0.3333
      b = 0
    } else if (utilization <= 90) {
      m = 0
      b = 0.2
    } else {
      m = 13
      b = -11.5
    }
  }

  const borrowInterest = (m * utilization) / 100 + b
  const performanceFee = 0.19

  const poolApr = borrowInterest * (utilization / 100) * (1 - performanceFee)
  const poolApy = Math.pow(2.71828, poolApr) - 1
  return poolApy * 100
}

export const getApeswapLendInterest = async (
  token: string,
  utilization: number
): Promise<number> => {
  let kinkRate = 0
  let baseAprRate = 0
  let multiplier = 0
  let kinkAprRate = 0
  let jumpMultiplier = 0
  let reserveFactor = 0

  if (
    token.includes('usdc') ||
    token.includes('usdt') ||
    token.includes('busd')
  ) {
    baseAprRate = 0 // F16
    kinkRate = 90 // G16
    multiplier = 9.5323
    kinkAprRate = 9.5323
    jumpMultiplier = 1004.9447
    reserveFactor = token.includes('usdt') ? 25 : 20
  } else if (token.includes('banana')) {
    baseAprRate = 1.9803
    kinkRate = 70
    multiplier = 37.9191
    kinkAprRate = 39.8994
    jumpMultiplier = 413.9119
    reserveFactor = 30
  } else if (token.includes('bnb')) {
    baseAprRate = 0
    kinkRate = 75
    multiplier = 5.9217
    kinkAprRate = 5.9217
    jumpMultiplier = 478.2795
    reserveFactor = 25
  } else {
    baseAprRate = 1.9803
    kinkRate = 80
    multiplier = 20.3409
    kinkAprRate = 22.3209
    jumpMultiplier = 589.0943
    reserveFactor = token.includes('eth') || token.includes('btcb') ? 25 : 30
  }

  let interest =
    utilization <= kinkRate
      ? baseAprRate + (utilization * multiplier) / kinkRate
      : kinkAprRate + ((utilization - kinkRate) * jumpMultiplier) / 1e2
  interest = Math.pow(1 + interest / 36500, 365) - 1

  const apy = (interest * (100 - reserveFactor) * utilization) / 1e2
  return apy
}
