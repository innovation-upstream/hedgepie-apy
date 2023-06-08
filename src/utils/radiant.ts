import { BigNumber, ethers } from "ethers";

import BEPABI from "../config/abi/Erc20.json";
import rTokenABI from "../config/abi/rTokenABI.json";
import radiantABI from "../config/abi/radiantLendingPool.json";

const provider = new ethers.providers.JsonRpcProvider(
  "https://bsc-dataseed1.ninicoin.io",
  56
);

const radiantLendingPool = new ethers.Contract(
  "0xd50Cf00b6e600Dd036Ba8eF475677d816d6c4281",
  radiantABI,
  provider
);

const getRadiantApy = async (
  stakingToken: string,
  stakingTokenName: string
) => {
  try {
    const reserveInfo = await radiantLendingPool.getReserveData(stakingToken);
    const repayToken = reserveInfo.aTokenAddress;

    const rTokenContract = new ethers.Contract(repayToken, rTokenABI, provider);
    const stakingContract = new ethers.Contract(stakingToken, BEPABI, provider);

    const [totalSupply, currentBalance] = await Promise.all([
      rTokenContract.scaledTotalSupply(),
      stakingContract.balanceOf(repayToken),
    ]);

    const totalBorrow = BigNumber.from(totalSupply).sub(currentBalance);
    const utilization = Number(totalBorrow.mul(1e2).div(totalSupply));

    let rZero = 0,
      uOptimal = 0,
      rSlope1 = 0,
      rSlope2 = 0;
    if (
      stakingTokenName.includes("usdc") ||
      stakingTokenName.includes("busd") ||
      stakingTokenName.includes("usdt")
    ) {
      uOptimal = 80;
      rZero = 1;
      rSlope1 = 0.5;
      rSlope2 = 75;
    } else {
      // uOptimal = 45
      // rZero = 0
      // rSlope1 = 4
      // rSlope2 = 300
      uOptimal = 80;
      rZero = 1;
      rSlope1 = 0.5;
      rSlope2 = 75;
    }

    const interestRate =
      utilization <= uOptimal
        ? rZero + (rSlope1 * utilization) / uOptimal
        : rZero +
          rSlope1 +
          ((utilization - uOptimal) / (100 - uOptimal)) * rSlope2;

    const apy = Math.pow(1 + interestRate / 36500, 365) - 1;
    return apy * 100;
  } catch (err) {
    console.log(`radiant apy err: ${err}`);
    return -1;
  }
};

export default getRadiantApy;
