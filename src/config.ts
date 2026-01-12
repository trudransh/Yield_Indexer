import "dotenv/config";

export const config = {
  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Arbitrum
  arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  arbitrumChainId: 42161,

  // Indexer intervals
  indexIntervalHours: parseInt(process.env.INDEX_INTERVAL_HOURS || "1"),
  discoveryIntervalHours: parseInt(process.env.DISCOVERY_INTERVAL_HOURS || "24"),

  // Stablecoins we care about on Arbitrum
  stablecoins: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "USDC.e": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    FRAX: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
  } as Record<string, string>,

  // Protocol configs
  protocols: {
    aave_v3: {
      poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      riskScore: 0.0, // Blue chip
    },
    compound_v3: {
      // Compound v3 USDC market on Arbitrum
      cometAddress: "0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA",
      riskScore: 0.0, // Blue chip
    },
    radiant_v2: {
      poolAddress: "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1",
      poolDataProvider: "0x596B0cc4C5094507C50b579a662FE7e7b094A2cC",
      riskScore: 0.05, // Established
    },
  },
} as const;

// Validate required config
if (!config.databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

