import fetch from 'node-fetch'

const APY_API_URL = 'https://api.beefy.finance/apy'
const VAULT_API_URL = 'https://api.beefy.finance/vaults'
let beefyVaults: any
let beefyInfo: any

const getBeefyApy = async (strategy: string) => {
  try {
    if (!beefyVaults) {
      beefyVaults = await fetch(VAULT_API_URL).then(async r => await r.json())
      beefyVaults = beefyVaults.data
    }

    if (!beefyInfo) {
      beefyInfo = await fetch(APY_API_URL).then(async r => await r.json())
      beefyInfo = beefyInfo.data
    }

    if (!beefyInfo || !beefyVaults) return 0

    const apyVaults = beefyVaults.filter(
      (it: any) =>
        it.chain == 'bsc' && it.earnContractAddress && it.earnContractAddress.toLowerCase() == strategy.toLowerCase()
    )

    if (apyVaults.length == 0) return 0

    const apyVault = apyVaults[0].id
    const apyData = beefyInfo[apyVault]

    if (!apyData) return 0

    return apyData * 100
  } catch (err) {
    console.log(`Beefy apy err: ${err}`)
    return -1
  }
}

export default getBeefyApy
