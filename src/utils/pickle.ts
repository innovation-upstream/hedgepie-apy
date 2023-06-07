import axios from 'axios'

const APY_API_URL = 'https://api.pickle.finance/prod/protocol/pfcore'

const getPickleApy = async (jar: String) => {
  try {
    let { data: apyData } = await axios.get(APY_API_URL)

    if (!apyData) return 0
    apyData = apyData.assets.jars
      .filter((it) => it.enablement === 'enabled')
      .filter((it) => it.contract && String(it.contract).toLowerCase() === String(jar).toLowerCase())
    if (apyData.length === 0) return 0
    return (
      apyData[0].aprStats.apy +
      (apyData[0].farm.details.farmApyComponents[0].apr + apyData[0].farm.details.farmApyComponents[0].maxApr) / 2
    )
  } catch (err) {
    console.log(`pickle apy err: ${err}`)
    return -1
  }
}

export default getPickleApy
