import { ethers } from "ethers";
import axios from "axios";
import Moralis from "moralis";
import { EvmChain } from "@moralisweb3/common-evm-utils";

import { BLOCK_GENERATION_TIME, SECONDS_PERY_YEAR } from "constants/common";

import lpAbi from "config/abi/LPPair.json";
import masterChefAbi from "config/abi/BiswapMasterChef.json";

const RPC_URL = "https://bsc-dataseed1.defibit.io";
const PRICE_URL = "https://api.binance.com/api/v3/avgPrice?symbol=";
const masterChefAddr = "0xDbc1A13490deeF9c3C12b44FE77b503c1B061739";
const blocksPerYear = SECONDS_PERY_YEAR / BLOCK_GENERATION_TIME;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const masterchefContract = new ethers.Contract(
  masterChefAddr,
  masterChefAbi,
  provider
);

const startMoralis = async (apiKey: string) => {
  await Moralis.start({
    apiKey: apiKey,
  });
};

const getPriceFormat = (priceInfo: any) => {
  return Number(ethers.utils.formatEther(priceInfo));
};

const getBiswapApy = async (pid: number, moralisApiKey: string) => {
  try {
    await startMoralis(moralisApiKey);
  } catch (err) {}

  try {
    const [totalAlloc, poolInfo, bswPerBlock] = await Promise.all([
      masterchefContract.totalAllocPoint(),
      masterchefContract.poolInfo(pid),
      masterchefContract.BSWPerBlock(),
    ]);

    const lpTokenContract = new ethers.Contract(
      poolInfo.lpToken,
      lpAbi,
      provider
    );

    let apyData: number;

    if (pid == 0) {
      const bswAmt = await lpTokenContract.balanceOf(masterChefAddr);
      apyData =
        (getPriceFormat(bswPerBlock) * (blocksPerYear * poolInfo.allocPoint)) /
        totalAlloc /
        getPriceFormat(bswAmt);
    } else {
      const [lpTokenDeposited, lpTokenTotalSupply, reserve0, token0] =
        await Promise.all([
          lpTokenContract.balanceOf(masterChefAddr),
          lpTokenContract.totalSupply(),
          lpTokenContract.getReserves(),
          lpTokenContract.token0(),
        ]);

      const bswPrice = await axios.get(`${PRICE_URL}BSWUSDT`);
      const response = await Moralis.EvmApi.token.getTokenPrice({
        address: token0,
        chain: EvmChain.BSC,
      });

      const lpPrice = response?.result;
      const lpTokenPrice =
        (getPriceFormat(reserve0[0]) * Number(lpPrice.usdPrice * 2)) /
        getPriceFormat(lpTokenTotalSupply);

      apyData =
        (getPriceFormat(bswPerBlock) *
          (blocksPerYear * poolInfo.allocPoint) *
          Number(bswPrice.data.price)) /
        (totalAlloc * lpTokenPrice) /
        getPriceFormat(lpTokenDeposited);
    }

    return apyData * 100;
  } catch (err) {
    console.log(`biswap apy err: ${err}`);
    return -1;
  }
};

export default getBiswapApy;
