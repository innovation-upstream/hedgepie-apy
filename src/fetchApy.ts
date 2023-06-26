import getApeswapApy from './utils/apeswap'
import getApeswapLendApy from './utils/apeswap-lend'
import getBiswapApy from './utils/biswap'
import getBeefyApy from './utils/beefy'
import { getAlpacaLendAPY } from './utils/alpaca'
import getBeltApy from './utils/belt'
import getQuickswapApy from './utils/quickswap'
import getAaveApy from './utils/aave'
import getCurveApy from './utils/curve'
import getUniswapV3Apy from './utils/uniswap'
import getCompoundApy from './utils/compound'
import getYearnApy from './utils/yearn'
import getPickleApy from './utils/pickle'
import getPancakeApy from './utils/pancake'
import { getAdapterInfo } from './utils/helper'
import getVenusApy from './utils/venus'
import getRadiantApy from './utils/radiant'
import getPinkswapApy from './utils/pinkswap'

// get apy of adapter by name
const fetchAPY = async (
  adapterName: string,
  adapterAddr: string,
  moralisApiKey: string
): Promise<number> => {
  let apyVal = 0
  adapterName = adapterName.toLowerCase()

  try {
    if (adapterName.includes('apeswap::')) {
      if (adapterName.includes('lend::')) {
        const [strategy, stakingToken] = await Promise.all([
          getAdapterInfo(adapterAddr, 'strategy'),
          getAdapterInfo(adapterAddr, 'staking_token')
        ])
        apyVal = await getApeswapLendApy(
          strategy,
          stakingToken,
          adapterName.split('::')[2]
        )
      } else {
        const pid = Number(await getAdapterInfo(adapterAddr))
        apyVal = await getApeswapApy(56, pid)
      }
    } else if (adapterName.includes('radiant::')) {
      const stakingToken = await getAdapterInfo(adapterAddr, 'staking_token')
      apyVal = await getRadiantApy(stakingToken, adapterName.split('::')[2])
    } else if (adapterName.includes('pinkswap::')) {
      const pid = Number(await getAdapterInfo(adapterAddr))
      apyVal = await getPinkswapApy(pid, moralisApiKey)
    } else if (adapterName.includes('biswap::')) {
      const pid = Number(await getAdapterInfo(adapterAddr))
      apyVal = await getBiswapApy(pid, moralisApiKey)
    } else if (adapterName.includes('autofarm::')) {
      const pid = Number(await getAdapterInfo(adapterAddr))
      const respData = await fetch('/api/autofarm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chain: 'bsc',
          pid: pid.toString()
        })
      })
      apyVal = (await respData.json()).apy
    } else if (adapterName.includes('beefy::')) {
      const strategy = await getAdapterInfo(adapterAddr, 'strategy')
      apyVal = await getBeefyApy(strategy)
    } else if (adapterName.includes('alpaca::')) {
      if (adapterName.includes('stake::')) {
        // apyVal = await getAlpacaStakeAPY(28, "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82")
      } else if (adapterName.includes('lend::')) {
        const strategy = await getAdapterInfo(adapterAddr, 'strategy')
        apyVal = await getAlpacaLendAPY(strategy, adapterName)
      } else if (adapterName.includes('ausd::')) {
        const strategy = await getAdapterInfo(adapterAddr, 'strategy')
        apyVal = await getAlpacaLendAPY(strategy, adapterName)
      }
    } else if (adapterName.includes('belt::')) {
      const strategy = await getAdapterInfo(adapterAddr, 'strategy')
      apyVal = await getBeltApy(strategy)
    } else if (adapterName.includes('venus::')) {
      const strategy = await getAdapterInfo(adapterAddr, 'strategy')
      apyVal = await getVenusApy(strategy)
    } else if (adapterName.includes('quickswap::')) {
      apyVal = await getQuickswapApy(
        '0x01ebd3e57f4af47b7e96240e2b7b2227c902614a'
      )
    } else if (adapterName.includes('aave::')) {
      apyVal = await getAaveApy('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')
    } else if (adapterName.includes('curve::')) {
      apyVal = await getCurveApy('0x20759F567BB3EcDB55c817c9a1d13076aB215EdC')
    } else if (adapterName.includes('uniswap::')) {
      apyVal = await getUniswapV3Apy(
        '0xA374094527e1673A86dE625aa59517c5dE346d32', // USDC-WMATIC Uniswap v3 pool
        '500',
        moralisApiKey
      )
    } else if (adapterName.includes('pickle::')) {
      apyVal = await getPickleApy('0xde74b6c547bd574c3527316a2eE30cd8F6041525')
    } else if (adapterName.includes('yearn::')) {
      apyVal = await getYearnApy('0xF29AE508698bDeF169B89834F76704C3B205aedf')
    } else if (adapterName.includes('compound::')) {
      apyVal = await getCompoundApy(
        '0xe65cdB6479BaC1e22340E4E755fAE7E509EcD06c'
      )
    } else if (
      adapterName.toLowerCase().includes('pks::') ||
      adapterName.toLowerCase().includes('pancakeswap::')
    ) {
      const [pid, strategy] = await Promise.all([
        getAdapterInfo(adapterAddr),
        getAdapterInfo(adapterAddr, 'strategy')
      ])
      apyVal = await getPancakeApy(
        Number(pid),
        strategy,
        adapterName.includes('farm::'),
        moralisApiKey
      )
    }
  } catch (err) {
    console.error(err)
  }

  return apyVal
}

export default fetchAPY
