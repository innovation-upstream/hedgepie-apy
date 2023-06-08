import { ethers } from "ethers";
import Moralis from "moralis";
import { EvmChain } from "@moralisweb3/common-evm-utils";

import { BLOCK_GENERATION_TIME, SECONDS_PERY_YEAR } from "../constants/common";

import lpAbi from "../config/abi/LPPair.json";
import masterChefAbi from "../config/abi/PinkswapMasterChef.json";

const RPC_URL = "https://bsc-dataseed1.defibit.io";

const pinksToken = "0x702b3f41772e321aacCdea91e1FCEF682D21125D";
const masterChefAddr = "0xe981676633dCf0256Aa512f4923A7e8DA180C595";

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const masterchefContract = new ethers.Contract(
  masterChefAddr,
  masterChefAbi,
  provider
);

const blocksPerYear = SECONDS_PERY_YEAR / BLOCK_GENERATION_TIME;

const startMoralis = async (apiKey: string) => {
  await Moralis.start({
    apiKey: apiKey,
  });
};

const getPriceFormat = (priceInfo: any) => {
  return Number(ethers.utils.formatEther(priceInfo));
};

const getPinkswapApy = async (pid: number, moralisApiKey: string) => {
  try {
    await startMoralis(moralisApiKey);
  } catch (err) {}

  try {
    const [totalAlloc, poolInfo, pinksPerBlock] = await Promise.all([
      masterchefContract.totalAllocPoint(),
      masterchefContract.poolInfo(pid),
      masterchefContract.pinksPerBlock(),
    ]);

    const lpTokenContract = new ethers.Contract(
      poolInfo.lpToken,
      lpAbi,
      provider
    );

    let apyData: number;

    const [lpTokenDeposited, lpTokenTotalSupply, reserve0, token0, token1] =
      await Promise.all([
        lpTokenContract.balanceOf(masterChefAddr),
        lpTokenContract.totalSupply(),
        lpTokenContract.getReserves(),
        lpTokenContract.token0(),
        lpTokenContract.token1(),
      ]);

    const tokenPriceResp = await Moralis.EvmApi.token.getTokenPrice({
      address: token0 == pinksToken ? token1 : token0,
      chain: EvmChain.BSC,
    });

    const pinksPriceResp = await Moralis.EvmApi.token.getTokenPrice({
      address: pinksToken,
      chain: EvmChain.BSC,
    });

    const lpPrice = tokenPriceResp?.result;
    const lpTokenPrice =
      (getPriceFormat(reserve0[0]) * Number(lpPrice.usdPrice * 2)) /
      getPriceFormat(lpTokenTotalSupply);

    apyData =
      (getPriceFormat(pinksPerBlock) *
        (blocksPerYear * poolInfo.allocPoint) *
        Number(pinksPriceResp ? pinksPriceResp.result.usdPrice : 0)) /
      (totalAlloc * lpTokenPrice) /
      getPriceFormat(lpTokenDeposited);

    return apyData * 100;
  } catch (err) {
    console.log(`pinkswap apy err: ${err}`);
    return -1;
  }
};

export default getPinkswapApy;
