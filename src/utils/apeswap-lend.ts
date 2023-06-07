import { BigNumber, ethers } from "ethers";

import { getApeswapLendInterest } from "./helper";

import BEPABI from "../config/abi/Erc20.json";
import alpacaLendABI from "../config/abi/apeswapLendABI.json";

const provider = new ethers.providers.JsonRpcProvider(
  "https://bsc-dataseed.binance.org",
  56
);

const getApeswapLendApy = async (
  strategy: string,
  stakingToken: string,
  stakingTokenName: string
) => {
  try {
    const stakingContract = new ethers.Contract(stakingToken, BEPABI, provider);
    const strategyContract = new ethers.Contract(
      strategy,
      alpacaLendABI,
      provider
    );

    const [totalBorrow, currentBalance] = await Promise.all([
      strategyContract.totalBorrows(),
      stakingContract.balanceOf(strategy),
    ]);

    const totalDeposit = BigNumber.from(totalBorrow).add(currentBalance);
    const utilization = Number(totalBorrow.mul(1e2).div(totalDeposit));

    return await getApeswapLendInterest(stakingTokenName, utilization);
  } catch (err) {
    console.log(`apeswap lend apy err: ${err}`);
    return -1;
  }
};

export default getApeswapLendApy;
