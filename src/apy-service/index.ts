import fetchAPY from "../fetchApy";

class ApyService {
  private moralisApiKey: string;

  constructor(moralisApiKey: string) {
    if (!moralisApiKey) {
      throw new Error('Missing Moralis api key, got: ' + moralisApiKey)
    }

    this.moralisApiKey = moralisApiKey;
  }

  getApyForPool(hedgepieLabel: string, hedgepieAdapterAddress: string): Promise<number> {
    return fetchAPY(hedgepieLabel, hedgepieAdapterAddress, this.moralisApiKey)
  }
}

export default ApyService
