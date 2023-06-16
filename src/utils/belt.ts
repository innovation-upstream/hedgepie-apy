import { BigNumber, ethers } from 'ethers'
import beltABI from '../config/abi/beltABI.json'

const provider = new ethers.providers.JsonRpcProvider(
  'https://bsc-dataseed1.ninicoin.io',
  56
)

const getPriceFormat = (priceInfo: any) => {
  return Number(ethers.utils.formatEther(priceInfo))
}

const getBeltApy = async (beltStrategy: string) => {
  try {
    const beltContract = new ethers.Contract(
      beltStrategy,
      beltABI as any,
      provider
    )

    const [strategyCnt, calcPoolValue, totalSupply] = await Promise.all([
      beltContract.strategyCount(),
      beltContract.calcPoolValueInToken(),
      beltContract.totalSupply()
    ])

    if (Number(strategyCnt) > 0) {
      let sumPoolValue: BigNumber = BigNumber.from(0)
      let sumTotalSupply: BigNumber = BigNumber.from(0)
      for (let i = 0; i < Number(strategyCnt); i++) {
        const strategyAddr = await beltContract.strategies(i)
        const strategyContract = new ethers.Contract(
          strategyAddr,
          beltABI as any,
          provider
        )

        const [strategyPoolValue, strategyTotalSupply] = await Promise.all([
          strategyContract.calcPoolValueInToken(),
          strategyContract.totalSupply()
        ])

        sumPoolValue = sumPoolValue.add(BigNumber.from(strategyPoolValue))
        sumTotalSupply = sumTotalSupply.add(
          BigNumber.from(strategyTotalSupply)
        )
      }

      const depositApy =
        (getPriceFormat(sumTotalSupply) * getPriceFormat(totalSupply)) /
        getPriceFormat(sumPoolValue) /
        getPriceFormat(calcPoolValue)

      return depositApy
    } else {
      return 0
    }
  } catch (err) {
    console.log(`belt apy err: ${err}`)
    return -1
  }
}

export default getBeltApy
