import fetch from 'node-fetch'

const APY_API_URL = 'https://api.venus.io/api/governance/venus'
let marketInfo: any

const getVenusApy = async (strategy: string): Promise<number> => {
  try {
    if (!marketInfo) {
      marketInfo = await fetch(APY_API_URL).then(async r => await r.json())
      marketInfo = marketInfo.data.data.markets
    }

    if (!marketInfo) return 0

    const apyData = marketInfo.filter(
      (it: any) =>
        it.address && it.address.toLowerCase() === strategy.toLowerCase()
    )

    if (!apyData || apyData.length === 0) return 0

    return Number(apyData[0].supplyApy)
  } catch (err) {
    console.log(`venus apy err: ${err}`)
    return -1
  }
}

export default getVenusApy
