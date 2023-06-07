import axios from 'axios'

const APY_API_URL = 'https://ape-swap-api.herokuapp.com/stats/network/lpAprs'
let apeswapInfo

const getApeswapApy = async (chainId: number, pid: number) => {
  try {
    if (!apeswapInfo) {
      apeswapInfo = await axios.get(`${APY_API_URL}/${chainId}`)
      apeswapInfo = apeswapInfo.data.lpAprs
    }

    if (!apeswapInfo) return 0

    const apyData = apeswapInfo.filter(
      (it: any) => it.pid && String(it.pid).toLowerCase() === String(pid).toLowerCase(),
    )

    if (!apyData || apyData.length === 0) return 0

    return (Math.pow(1 + apyData[0].lpApr / 365, 365) - 1) * 100
  } catch (err) {
    console.log(`apeswap apy err: ${err}`)
    return -1
  }
}

export default getApeswapApy
