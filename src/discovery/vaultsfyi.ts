import axios from "axios";
import { config } from "../config.js";

/**
 * vaults.fyi API Client
 * 
 * Uses REST API with proper server-side filtering to save credits.
 * Docs: https://api.vaults.fyi/v2/documentation/
 * 
 * Key Endpoints:
 * - GET /v2/detailed-vaults - List vaults with filters
 * - GET /v2/historical/{network}/{vaultAddress} - Historical data (PRO)
 */

const api = axios.create({
  baseURL: config.vaultsFyiBaseUrl,
  headers: {
    "x-api-key": config.vaultsFyiApiKey,
    "Content-Type": "application/json",
  },
});

// Types based on vaults.fyi API response
export interface VaultsFyiVault {
  address: string;
  name: string;
  network: {
    name: string;
    chainId: number;
  };
  asset: {
    address: string;
    symbol: string;
    decimals: number;
    assetGroup: string;
  };
  protocol: {
    name: string;
    product?: string;
    version?: string;
  };
  apy: {
    "1day": { base: number; reward: number; total: number };
    "7day": { base: number; reward: number; total: number };
    "30day": { base: number; reward: number; total: number };
  };
  tvl: {
    usd: string;
    native: string;
  };
  score?: {
    vaultScore: number;
    protocolTvlScore: number;
  };
  isTransactional: boolean;
  lpToken?: {
    address: string;
    symbol: string;
  };
}

// Normalized vault data for our system
export interface DiscoveredVault {
  vaultAddress: string;
  underlyingToken: string;
  name: string;
  symbol: string;
  underlyingSymbol: string;
  protocol: string;
  network: string;
  poolType: "lending" | "vault";
  currentApy: number;
  apyBase: number;
  apyRewards: number;
  currentTvl: number;
  // Additional data from API
  apy7day?: number;
  apy30day?: number;
  vaultScore?: number;
}

// Stablecoins to filter by (server-side)
const STABLECOIN_SYMBOLS = ["USDC", "USDT", "DAI", "FRAX", "LUSD", "GHO", "USDS"];

/**
 * Normalize protocol name to our internal format
 */
function normalizeProtocol(protocol: string): string {
  const map: Record<string, string> = {
    "aave-v3": "aave_v3",
    "aave v3": "aave_v3",
    "aave": "aave_v3",
    "compound-v3": "compound_v3",
    "compound v3": "compound_v3",
    "compound": "compound_v3",
    "morpho": "morpho",
    "morpho-blue": "morpho",
    "morpho blue": "morpho",
    "yearn": "yearn_v3",
    "yearn-v3": "yearn_v3",
    "yearn v3": "yearn_v3",
    "radiant": "radiant_v2",
    "radiant-v2": "radiant_v2",
    "radiant v2": "radiant_v2",
    "silo": "silo",
    "euler": "euler",
    "fluid": "fluid",
    "pendle": "pendle",
    "gearbox": "gearbox",
    "spark": "spark",
  };

  const slug = protocol.toLowerCase().trim();
  return map[slug] || slug.replace(/[\s-]+/g, "_");
}

/**
 * Determine pool type based on protocol
 */
function determinePoolType(protocol: string): "lending" | "vault" {
  const lendingProtocols = ["aave", "compound", "radiant", "silo", "euler", "morpho", "spark", "fluid"];
  const protocolLower = protocol.toLowerCase();

  if (lendingProtocols.some((p) => protocolLower.includes(p))) {
    return "lending";
  }

  return "vault";
}

/**
 * Fetch Arbitrum stablecoin vaults using the correct endpoint
 * 
 * GET /v2/detailed-vaults with:
 * - allowedNetworks: ["arbitrum"]
 * - allowedAssets: ["USDC", "USDT", "DAI", ...]
 * - minTvl: 50000
 */
export async function fetchArbitrumVaults(): Promise<DiscoveredVault[]> {
  console.log("📡 Fetching vaults from vaults.fyi API...");
  console.log(`   Endpoint: /v2/detailed-vaults`);
  console.log(`   Network: arbitrum`);
  console.log(`   Assets: ${STABLECOIN_SYMBOLS.join(", ")}`);
  console.log(`   Min TVL: $${config.vaultsFyiFilters.minTvl.toLocaleString()}`);

  const discoveredVaults: DiscoveredVault[] = [];
  let page = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      // Build query params - arrays need to be repeated params
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("perPage", "100");
      params.append("minTvl", config.vaultsFyiFilters.minTvl.toString());
      
      // Add network filter
      params.append("allowedNetworks", "arbitrum");
      
      // Add asset filters (each as separate param)
      for (const asset of STABLECOIN_SYMBOLS) {
        params.append("allowedAssets", asset);
      }

      console.log(`   📄 Fetching page ${page}...`);

      const response = await api.get(`/detailed-vaults?${params.toString()}`);

      const data = response.data;
      const vaults: VaultsFyiVault[] = data.data || [];
      const itemsOnPage = data.itemsOnPage || 0;

      console.log(`      Found ${itemsOnPage} vaults on page ${page}`);

      // Transform vaults to our format
      for (const vault of vaults) {
        const protocolName = vault.protocol?.name || "unknown";
        const tvlUsd = parseFloat(vault.tvl?.usd || "0");

        // Skip if TVL is below threshold (double check)
        if (tvlUsd < config.vaultsFyiFilters.minTvl) continue;

        discoveredVaults.push({
          vaultAddress: vault.address.toLowerCase(),
          underlyingToken: vault.asset.address.toLowerCase(),
          name: vault.name || `${protocolName} ${vault.asset.symbol}`,
          symbol: vault.lpToken?.symbol || "",
          underlyingSymbol: vault.asset.symbol,
          protocol: normalizeProtocol(protocolName),
          network: vault.network.name || "arbitrum",
          poolType: determinePoolType(protocolName),
          currentApy: vault.apy?.["7day"]?.total || vault.apy?.["1day"]?.total || 0,
          apyBase: vault.apy?.["7day"]?.base || 0,
          apyRewards: vault.apy?.["7day"]?.reward || 0,
          currentTvl: tvlUsd,
          apy7day: vault.apy?.["7day"]?.total,
          apy30day: vault.apy?.["30day"]?.total,
          vaultScore: vault.score?.vaultScore,
        });
      }

      // Check if there are more pages
      hasMore = data.nextPage !== undefined && data.nextPage !== null;
      page++;

      // Safety limit
      if (page > 10) {
        console.log("   ⚠️ Reached page limit, stopping pagination");
        break;
      }

      // Small delay between pages
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    console.log(`\n   ✅ Total: ${discoveredVaults.length} stablecoin vaults discovered`);

    // Sort by TVL descending
    discoveredVaults.sort((a, b) => b.currentTvl - a.currentTvl);

    // Log top vaults
    console.log("\n   Top vaults by TVL:");
    for (const vault of discoveredVaults.slice(0, 10)) {
      console.log(
        `   • ${vault.protocol} ${vault.underlyingSymbol}: ${(vault.currentApy * 100).toFixed(2)}% APY, $${(vault.currentTvl / 1e6).toFixed(2)}M TVL`
      );
    }

    return discoveredVaults;
  } catch (error: any) {
    if (error.response) {
      console.error("❌ API Error:", error.response.status, error.response.data);
    } else {
      console.error("❌ Error fetching from vaults.fyi:", error.message);
    }
    throw error;
  }
}

/**
 * Get historical APY data for a vault (uses PRO endpoint)
 * 
 * GET /v2/historical/{network}/{vaultAddress}
 * - granularity: "1hour", "1day", "1week" (use "1week" to save credits)
 */
export async function getVaultHistory(
  vaultAddress: string,
  network: string = "arbitrum",
  options: {
    granularity?: "1hour" | "1day" | "1week";
    apyInterval?: "1day" | "7day" | "30day";
    fromTimestamp?: number;
    toTimestamp?: number;
  } = {}
): Promise<{ timestamp: number; apy: number; tvlUsd: number }[]> {
  const {
    granularity = config.vaultsFyiFilters.historyGranularity as "1hour" | "1day" | "1week",
    apyInterval = "7day",
    fromTimestamp,
    toTimestamp,
  } = options;

  console.log(`📈 Fetching history for ${vaultAddress.slice(0, 10)}...`);
  console.log(`   Granularity: ${granularity} (saves credits vs 1hour)`);

  try {
    const params = new URLSearchParams();
    params.append("granularity", granularity);
    params.append("apyInterval", apyInterval);
    params.append("perPage", "500");
    
    if (fromTimestamp) params.append("fromTimestamp", fromTimestamp.toString());
    if (toTimestamp) params.append("toTimestamp", toTimestamp.toString());

    const response = await api.get(
      `/historical/${network}/${vaultAddress}?${params.toString()}`
    );

    const data = response.data.data || [];

    return data.map((point: any) => ({
      timestamp: point.timestamp,
      apy: point.apy?.total || 0,
      tvlUsd: parseFloat(point.tvl?.usd || "0"),
    }));
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error("   ⚠️ Historical endpoint requires PRO subscription");
    } else {
      console.error(`   ❌ Error fetching vault history:`, error.message);
    }
    return [];
  }
}

/**
 * Get details for a specific vault
 * 
 * GET /v2/detailed-vaults/{network}/{vaultAddress}
 */
export async function getVaultDetails(
  vaultAddress: string,
  network: string = "arbitrum"
): Promise<VaultsFyiVault | null> {
  try {
    const response = await api.get(`/detailed-vaults/${network}/${vaultAddress}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching vault details for ${vaultAddress}:`, error.message);
    return null;
  }
}

/**
 * Get APY breakdown for a specific vault
 * 
 * GET /v2/detailed-vaults/{network}/{vaultAddress}/apy
 */
export async function getVaultApy(
  vaultAddress: string,
  network: string = "arbitrum"
): Promise<{
  "1day": { base: number; reward: number; total: number };
  "7day": { base: number; reward: number; total: number };
  "30day": { base: number; reward: number; total: number };
} | null> {
  try {
    const response = await api.get(`/detailed-vaults/${network}/${vaultAddress}/apy`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching vault APY:`, error.message);
    return null;
  }
}
