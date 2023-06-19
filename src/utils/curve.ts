import curve from '@curvefi/api'

let poolNames: any

const initPools = async () => {
  await curve.init(
    'JsonRpc',
    { url: 'https://polygon-rpc.com' },
    { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 }
  )
  // Fetch factory pools
  await curve.factory.fetchPools();
  await curve.crvUSDFactory.fetchPools();
  await curve.EYWAFactory.fetchPools();
  await curve.cryptoFactory.fetchPools();
  await curve.tricryptoFactory.fetchPools();

  poolNames= curve.getPoolList()
}

const getCurveApy = async (strategy: string) => {
  try {
    if (!poolNames) {
      await initPools()
    }

    if (!poolNames) return 0

    let pool = poolNames.filter((it: any) => {
      const tmpPool = curve.getPool(it)
      return tmpPool.gauge.toLowerCase() === strategy.toLowerCase()
    })

    if (pool.length !== 1) return 0

    pool = curve.getPool(pool[0])

    const baseApy = await pool.stats.baseApy()
    // { day: '3.1587592896017647', week: '2.6522145719060752' } (as %)

    const tokenApy = await pool.stats.tokenApy()
    // [ '0.5918', '1.4796' ] (as %)

    return Number(baseApy.day) + Number(tokenApy[0])
  } catch (err) {
    console.log(`curve apy err: ${err}`)
    return -1
  }
}

export default getCurveApy
