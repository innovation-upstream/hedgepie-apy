import axios from "axios";

const APY_API_URL =
  "https://api.compound.finance/api/v2/ctoken?meta=true&network=mainnet";

let compoundInfo: any;

const getCompoundApy = async (strategy: String) => {
  try {
    if (!compoundInfo) {
      compoundInfo = await axios.get(APY_API_URL);
      compoundInfo = compoundInfo.data;
    }

    if (!compoundInfo) return 0;

    const apyData = compoundInfo.cToken.filter(
      (it: any) =>
        it.token_address &&
        String(it.token_address).toLowerCase() ===
          String(strategy).toLowerCase()
    );

    if (apyData.length === 0) return 0;

    return apyData[0].supply_rate.value * 100;
  } catch (err) {
    console.log(`compound apy err: ${err}`);
    return -1;
  }
};

export default getCompoundApy;
