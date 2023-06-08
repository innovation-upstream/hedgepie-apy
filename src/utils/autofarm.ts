import axios from "axios";

const APY_API_URL = "https://static.autofarm.network/";
let autofarmInfo: any;

const getAutofarmApy = async (chain: string, pid: string) => {
  try {
    if (!autofarmInfo) {
      autofarmInfo = await axios.get(
        `${APY_API_URL}/${chain}/farm_data_live.json`
      );
      autofarmInfo = autofarmInfo.data;
    }

    if (!autofarmInfo) return 0;

    const apyData = autofarmInfo[pid];
    if (!apyData || !apyData.allowDeposits) return 0;

    return apyData.APY_total * 100;
  } catch (err) {
    console.log(`autofarm apy err: ${err}`);
    return -1;
  }
};

export default getAutofarmApy;
