import axios from "axios";
import gql from "graphql-tag";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";

dayjs.extend(utc);

const feePercent = 0.003;
const GRAPH_V2_API_URL = "https://api.fura.org/subgraphs/name/quickswap";
const APY_API_URL =
  "https://unpkg.com/quickswap-default-staking-list-address@latest/build/quickswap-default.lpfarms.json";

let quickswapInfo;

const PairFields = `
  fragment PairFields on Pair {
    id
    reserveUSD
    trackedReserveETH
    volumeUSD
    untrackedVolumeUSD
  }
`;

const clientV2 = new ApolloClient({
  link: new HttpLink({
    uri: GRAPH_V2_API_URL,
  }),
  cache: new InMemoryCache(),
  // shouldBatch: true,
});

const TokenFields = `
  fragment TokenFields on Token {
    id
    tradeVolume
    tradeVolumeUSD
    untrackedVolumeUSD
  }
`;

const GET_BLOCK = gql`
  query blocks($timestampFrom: Int!, $timestampTo: Int!) {
    blocks(
      first: 1
      orderBy: timestamp
      orderDirection: asc
      where: { timestamp_gt: $timestampFrom, timestamp_lt: $timestampTo }
    ) {
      id
      number
      timestamp
    }
  }
`;

const get2DayPercentChange = (
  valueNow: number,
  value24HoursAgo: number,
  value48HoursAgo: number
) => {
  // get volume info for both 24 hour periods
  const currentChange = valueNow - value24HoursAgo;
  const previousChange = value24HoursAgo - value48HoursAgo;

  const adjustedPercentChange =
    ((currentChange - previousChange) / previousChange) * 100;

  if (isNaN(adjustedPercentChange) || !isFinite(adjustedPercentChange)) {
    return [currentChange, 0];
  }
  return [currentChange, adjustedPercentChange];
};

const TOKEN_INFO_OLD: any = (block: number, address: string) => {
  const queryString = `
    ${TokenFields}
    query tokens {
      tokens(block: {number: ${block}} first: 1, where: {id: "${address}"}) {
        ...TokenFields
      }
    }
  `;
  return gql(queryString);
};

const PAIRS_BULK: any = (pairs: any[]) => {
  let pairsString = `[`;
  pairs.map((pair) => {
    return (pairsString += `"${pair.toLowerCase()}"`);
  });
  pairsString += "]";
  const queryString = `
    ${PairFields}
    query pairs {
      pairs(first: ${pairs.length}, where: { id_in: ${pairsString} }, orderBy: trackedReserveETH, orderDirection: desc) {
        ...PairFields
      }
    }
  `;
  return gql(queryString);
};

const getDaysCurrentYear = () => {
  const year = Number(dayjs().format("YYYY"));
  return (year % 4 === 0 && year % 100 > 0) || year % 400 == 0 ? 366 : 365;
};

async function getBlockFromTimestamp(timestamp: number): Promise<any> {
  const result = await clientV2.query({
    query: GET_BLOCK,
    variables: {
      timestampFrom: timestamp,
      timestampTo: timestamp + 600,
    },
    fetchPolicy: "network-only",
  });
  return result?.data?.blocks?.[0]?.number;
}

const getOneYearFee = (dayVolume: number, reserveUSD: number) => {
  if (!dayVolume || !reserveUSD) {
    return 0;
  }

  return (dayVolume * feePercent * getDaysCurrentYear()) / reserveUSD;
};

const getQuickswapApy = async (lp: String) => {
  try {
    if (!quickswapInfo) {
      quickswapInfo = await axios.get(APY_API_URL);
      quickswapInfo = quickswapInfo.data;
    }

    if (!quickswapInfo) return 0;

    const apyData = quickswapInfo.active.filter(
      (it: any) =>
        it.pair && it.pair.toString().toLowerCase() === lp.toLowerCase()
    );

    if (apyData.length === 0) return 0;

    const utcCurrentTime = dayjs();
    const utcOneDayBack = utcCurrentTime.subtract(1, "day").unix();
    const utcTwoDaysBack = utcCurrentTime.subtract(2, "day").unix();
    const oneDayBlock = await getBlockFromTimestamp(utcOneDayBack);
    const twoDayBlock = await getBlockFromTimestamp(utcTwoDaysBack);

    const oneDayResult = await clientV2.query({
      query: TOKEN_INFO_OLD(oneDayBlock, apyData[0].lp),
      fetchPolicy: "network-only",
    });

    const twoDayResult = await clientV2.query({
      query: TOKEN_INFO_OLD(twoDayBlock, apyData[0].lp),
      fetchPolicy: "network-only",
    });

    const oneDayData = oneDayResult.data.tokens.reduce((obj: any, cur: any) => {
      return { ...obj, [cur.id]: cur };
    }, {});
    const twoDayData = twoDayResult.data.tokens.reduce((obj: any, cur: any) => {
      return { ...obj, [cur.id]: cur };
    }, {});

    const current = await clientV2.query({
      query: PAIRS_BULK([apyData[0].pair]),
      fetchPolicy: "network-only",
    });

    const lpInfo = current.data.pairs[0];
    const [oneDayVolumeUSD] = get2DayPercentChange(
      lpInfo.volumeUSD,
      oneDayData?.volumeUSD ? oneDayData.volumeUSD : 0,
      twoDayData?.volumeUSD ? twoDayData.volumeUSD : 0
    );

    const oneYearFeeApy = getOneYearFee(
      Number(oneDayVolumeUSD),
      Number(lpInfo.reserveUSD)
    );

    return oneYearFeeApy;
  } catch (err) {
    console.log(`quickswap apy err: ${err}`);
    return -1;
  }
};

export default getQuickswapApy;
