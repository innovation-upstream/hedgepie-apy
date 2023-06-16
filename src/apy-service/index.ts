import fetchAPY from '../fetchApy'

class ApyService {
  private readonly moralisApiKey: string

  constructor (moralisApiKey: string) {
    if (!moralisApiKey) {
      throw new Error('Missing Moralis api key, got: ' + moralisApiKey)
    }

    this.moralisApiKey = moralisApiKey
  }

  async getApyForPool (hedgepieLabel: string, hedgepieAdapterAddress: string): Promise<number> {
    return await fetchAPY(hedgepieLabel, hedgepieAdapterAddress, this.moralisApiKey)
  }
}

export default ApyService
