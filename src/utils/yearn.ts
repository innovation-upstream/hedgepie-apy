import axios from "axios";

const APY_API_URL = "https://api.yearn.finance/v1/chains/1/vaults/all";

const getYearnApy = async (strategy: String) => {
  try {
    let { data: apyData } = await axios.get(APY_API_URL);

    if (!apyData) return 0;
    apyData = apyData.filter(
      (it: any) =>
        it.address &&
        String(it.address).toLowerCase() === String(strategy).toLowerCase()
    );
    if (apyData.length === 0) return 0;

    return apyData[0].apy.net_apy * 100;
  } catch (err) {
    return -1;
  }
};

export default getYearnApy;
