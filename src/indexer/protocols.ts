/**
 * Protocol-specific handlers for non-ERC4626 vaults
 * 
 * This file handles:
 * - Aave aTokens
 * - Beefy Moo vaults
 * - Venus/Compound V2 vTokens
 * - Stargate LP tokens
 * - Hop LP tokens
 * - Overnight USD+
 * - Sky/Maker Savings USDS
 */

import { type Address, formatUnits } from "viem";
import { getArbitrumClient } from "./rpc-client.js";
import { aTokenAbi } from "./abis/atoken.js";
import { beefyVaultAbi } from "./abis/beefy.js";
import { venusVTokenAbi } from "./abis/venus.js";
import { stargatePoolAbi } from "./abis/stargate.js";
import { genericTokenAbi, hopLpTokenAbi, skyUsdsAbi } from "./abis/generic.js";
import { aaveV3PoolAbi } from "./abis/aave-v3-pool.js";
import { calculateApyFromPPS, APY_CONSTANTS } from "./apy-calculator.js";

export interface ProtocolData {
  apy: number;
  tvl: number;
  rawRate: bigint;
}

// RAY = 10^27 (Aave's precision)
const RAY = 10n ** 27n;

/**
 * Detect protocol type from pool name
 */
export function detectProtocolType(poolName: string): string {
  const name = poolName.toLowerCase();
  
  // Aave aTokens (from vaults.fyi - these are aToken addresses, not the Pool)
  if (name.includes("aave v3") && !name.includes("compound")) {
    return "atoken";
  }
  
  // Beefy Moo vaults
  if (name.includes("moo ") || name.includes("beefy")) {
    return "beefy";
  }
  
  // Venus vTokens
  if (name.includes("venus")) {
    return "venus";
  }
  
  // Stargate LP
  if (name.includes("stargate")) {
    return "stargate";
  }
  
  // Hop LP
  if (name.includes("hop ")) {
    return "hop";
  }
  
  // Overnight USD+
  if (name.includes("overnight") || name.includes("usd+")) {
    return "overnight";
  }
  
  // Sky/Maker Savings USDS
  if (name.includes("savings usds") || name.includes("susds") || name.includes("sky ")) {
    return "sky";
  }
  
  // Compound v3 from vaults.fyi (different from our manual pools)
  if (name.includes("compound v3") || name.includes("compound-v3")) {
    return "compound_wrapper";
  }
  
  return "unknown";
}

/**
 * Get data for Aave aTokens
 * 
 * aTokens are interest-bearing and their value increases over time.
 * We get TVL from totalSupply and APY from the underlying Pool contract.
 */
export async function getATokenData(aTokenAddress: Address): Promise<ProtocolData> {
  const client = getArbitrumClient();
  
  try {
    // Get basic aToken data
    const [totalSupply, decimals, poolAddress, underlyingAsset] = await Promise.all([
      client.readContract({
        address: aTokenAddress,
        abi: aTokenAbi,
        functionName: "totalSupply",
      }),
      client.readContract({
        address: aTokenAddress,
        abi: aTokenAbi,
        functionName: "decimals",
      }),
      client.readContract({
        address: aTokenAddress,
        abi: aTokenAbi,
        functionName: "POOL",
      }).catch(() => null),
      client.readContract({
        address: aTokenAddress,
        abi: aTokenAbi,
        functionName: "UNDERLYING_ASSET_ADDRESS",
      }).catch(() => null),
    ]);
    
    const tvl = Number(formatUnits(totalSupply, decimals));
    
    // Try to get APY from Pool if we have the addresses
    let apy = 0;
    if (poolAddress && underlyingAsset) {
      try {
        const reserveData = await client.readContract({
          address: poolAddress as Address,
          abi: aaveV3PoolAbi,
          functionName: "getReserveData",
          args: [underlyingAsset as Address],
        });
        
        const liquidityRate = reserveData.currentLiquidityRate;
        apy = Number(liquidityRate) / Number(RAY) * 100;
      } catch {
        // If we can't get APY from pool, return 0 (will use vaults.fyi API data)
      }
    }
    
    return {
      apy,
      tvl,
      rawRate: totalSupply,
    };
  } catch (error) {
    throw new Error(`Failed to get aToken data: ${error}`);
  }
}

/**
 * Get data for Beefy Moo vaults
 */
export async function getBeefyData(
  vaultAddress: Address,
  previousPPS: bigint | null,
  previousTimestamp: Date | null
): Promise<ProtocolData> {
  const client = getArbitrumClient();
  
  try {
    const [pricePerFullShare, balance, decimals] = await Promise.all([
      client.readContract({
        address: vaultAddress,
        abi: beefyVaultAbi,
        functionName: "getPricePerFullShare",
      }),
      client.readContract({
        address: vaultAddress,
        abi: beefyVaultAbi,
        functionName: "balance",
      }),
      client.readContract({
        address: vaultAddress,
        abi: beefyVaultAbi,
        functionName: "decimals",
      }),
    ]);
    
    const tvl = Number(formatUnits(balance, decimals));
    
    // Calculate APY from PPS change using Yearn's logarithmic formula
    let apy = 0;
    if (previousPPS && previousTimestamp) {
      const now = new Date();
      const elapsedSeconds = (now.getTime() - previousTimestamp.getTime()) / 1000;
      
      if (elapsedSeconds >= APY_CONSTANTS.SECONDS_PER_HOUR) {
        const currentPPS = Number(pricePerFullShare);
        const prevPPS = Number(previousPPS);
        
        if (prevPPS > 0) {
          apy = calculateApyFromPPS(currentPPS, prevPPS, elapsedSeconds);
        }
      }
    }
    
    return {
      apy,
      tvl,
      rawRate: pricePerFullShare,
    };
  } catch (error) {
    throw new Error(`Failed to get Beefy vault data: ${error}`);
  }
}

/**
 * Get data for Venus/Compound V2 style vTokens
 */
export async function getVenusData(vTokenAddress: Address): Promise<ProtocolData> {
  const client = getArbitrumClient();
  
  try {
    const [exchangeRate, totalSupply, decimals, supplyRatePerBlock] = await Promise.all([
      client.readContract({
        address: vTokenAddress,
        abi: venusVTokenAbi,
        functionName: "exchangeRateStored",
      }),
      client.readContract({
        address: vTokenAddress,
        abi: venusVTokenAbi,
        functionName: "totalSupply",
      }),
      client.readContract({
        address: vTokenAddress,
        abi: venusVTokenAbi,
        functionName: "decimals",
      }),
      client.readContract({
        address: vTokenAddress,
        abi: venusVTokenAbi,
        functionName: "supplyRatePerBlock",
      }).catch(() => 0n),
    ]);
    
    // TVL = totalSupply * exchangeRate / 1e18
    // Note: exchange rate has extra precision
    const tvlRaw = (totalSupply * exchangeRate) / (10n ** 18n);
    const tvl = Number(formatUnits(tvlRaw, decimals));
    
    // APY from supply rate (blocks per year varies by chain)
    // Arbitrum: ~4 blocks/second = ~126,144,000 blocks/year
    const blocksPerYear = 126144000n;
    const ratePerYear = supplyRatePerBlock * blocksPerYear;
    const apy = Number(ratePerYear) / 1e18 * 100;
    
    return {
      apy,
      tvl,
      rawRate: exchangeRate,
    };
  } catch (error) {
    throw new Error(`Failed to get Venus vToken data: ${error}`);
  }
}

/**
 * Get data for Stargate LP pools
 */
export async function getStargateData(poolAddress: Address): Promise<ProtocolData> {
  const client = getArbitrumClient();
  
  try {
    const [totalLiquidity, totalSupply, decimals] = await Promise.all([
      client.readContract({
        address: poolAddress,
        abi: stargatePoolAbi,
        functionName: "totalLiquidity",
      }).catch(() => 0n),
      client.readContract({
        address: poolAddress,
        abi: stargatePoolAbi,
        functionName: "totalSupply",
      }),
      client.readContract({
        address: poolAddress,
        abi: stargatePoolAbi,
        functionName: "decimals",
      }),
    ]);
    
    const tvl = Number(formatUnits(totalLiquidity || totalSupply, decimals));
    
    // Stargate APY comes from rewards, hard to calculate on-chain
    // Return 0 and use vaults.fyi API data
    return {
      apy: 0,
      tvl,
      rawRate: totalLiquidity || totalSupply,
    };
  } catch (error) {
    throw new Error(`Failed to get Stargate pool data: ${error}`);
  }
}

/**
 * Get data for Hop LP tokens
 * 
 * Hop LP tokens may have different interfaces on different chains
 */
export async function getHopData(lpTokenAddress: Address): Promise<ProtocolData> {
  const client = getArbitrumClient();
  
  // Try multiple approaches
  const approaches = [
    // Approach 1: Virtual price based TVL
    async () => {
      const [totalSupply, decimals, virtualPrice] = await Promise.all([
        client.readContract({
          address: lpTokenAddress,
          abi: hopLpTokenAbi,
          functionName: "totalSupply",
        }),
        client.readContract({
          address: lpTokenAddress,
          abi: genericTokenAbi,
          functionName: "decimals",
        }),
        client.readContract({
          address: lpTokenAddress,
          abi: hopLpTokenAbi,
          functionName: "getVirtualPrice",
        }),
      ]);
      const tvlRaw = (totalSupply * virtualPrice) / (10n ** 18n);
      return { tvl: Number(formatUnits(tvlRaw, decimals)), rawRate: virtualPrice };
    },
    // Approach 2: Just totalSupply
    async () => {
      const [totalSupply, decimals] = await Promise.all([
        client.readContract({
          address: lpTokenAddress,
          abi: genericTokenAbi,
          functionName: "totalSupply",
        }),
        client.readContract({
          address: lpTokenAddress,
          abi: genericTokenAbi,
          functionName: "decimals",
        }),
      ]);
      return { tvl: Number(formatUnits(totalSupply, decimals)), rawRate: totalSupply };
    },
  ];
  
  for (const approach of approaches) {
    try {
      const result = await approach();
      return {
        apy: 0,
        tvl: result.tvl,
        rawRate: result.rawRate,
      };
    } catch {
      continue;
    }
  }
  
  // All approaches failed - return zeros
  return {
    apy: 0,
    tvl: 0,
    rawRate: 0n,
  };
}

/**
 * Get data for Overnight USD+
 */
export async function getOvernightData(tokenAddress: Address): Promise<ProtocolData> {
  const client = getArbitrumClient();
  
  try {
    const [totalSupply, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: genericTokenAbi,
        functionName: "totalSupply",
      }),
      client.readContract({
        address: tokenAddress,
        abi: genericTokenAbi,
        functionName: "decimals",
      }),
    ]);
    
    const tvl = Number(formatUnits(totalSupply, decimals));
    
    return {
      apy: 0, // Use vaults.fyi API data
      tvl,
      rawRate: totalSupply,
    };
  } catch (error) {
    throw new Error(`Failed to get Overnight data: ${error}`);
  }
}

/**
 * Get data for Sky/Maker Savings USDS
 * 
 * Sky sUSDS may use different function names on different chains
 */
export async function getSkyData(tokenAddress: Address): Promise<ProtocolData> {
  const client = getArbitrumClient();
  
  // Try multiple approaches to get TVL
  const approaches = [
    // Approach 1: totalAssets (ERC-4626 standard)
    async () => {
      const [totalAssets, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: skyUsdsAbi,
          functionName: "totalAssets",
        }),
        client.readContract({
          address: tokenAddress,
          abi: genericTokenAbi,
          functionName: "decimals",
        }),
      ]);
      return { tvl: Number(formatUnits(totalAssets, decimals)), rawRate: totalAssets };
    },
    // Approach 2: totalSupply (basic ERC20)
    async () => {
      const [totalSupply, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: genericTokenAbi,
          functionName: "totalSupply",
        }),
        client.readContract({
          address: tokenAddress,
          abi: genericTokenAbi,
          functionName: "decimals",
        }),
      ]);
      return { tvl: Number(formatUnits(totalSupply, decimals)), rawRate: totalSupply };
    },
  ];
  
  for (const approach of approaches) {
    try {
      const result = await approach();
      return {
        apy: 0, // Use vaults.fyi API data
        tvl: result.tvl,
        rawRate: result.rawRate,
      };
    } catch {
      continue;
    }
  }
  
  // All approaches failed - return zeros but don't throw
  // This allows the indexer to continue and use API data
  return {
    apy: 0,
    tvl: 0,
    rawRate: 0n,
  };
}

/**
 * Get data for any vault using generic token ABI (fallback)
 * 
 * This is the final fallback - it should never throw
 */
export async function getGenericTokenData(tokenAddress: Address): Promise<ProtocolData> {
  const client = getArbitrumClient();
  
  try {
    const [totalSupply, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: genericTokenAbi,
        functionName: "totalSupply",
      }),
      client.readContract({
        address: tokenAddress,
        abi: genericTokenAbi,
        functionName: "decimals",
      }).catch(() => 18), // Default to 18 decimals
    ]);
    
    const tvl = Number(formatUnits(totalSupply, decimals));
    
    return {
      apy: 0, // Use vaults.fyi API data
      tvl,
      rawRate: totalSupply,
    };
  } catch {
    // Final fallback - return zeros but don't throw
    // This allows the indexer to continue and use API data
    return {
      apy: 0,
      tvl: 0,
      rawRate: 0n,
    };
  }
}

/**
 * Main handler that routes to the correct protocol handler
 */
export async function getProtocolData(
  protocolType: string,
  contractAddress: Address,
  previousPPS: bigint | null = null,
  previousTimestamp: Date | null = null
): Promise<ProtocolData> {
  switch (protocolType) {
    case "atoken":
      return getATokenData(contractAddress);
    
    case "beefy":
      return getBeefyData(contractAddress, previousPPS, previousTimestamp);
    
    case "venus":
      return getVenusData(contractAddress);
    
    case "stargate":
      return getStargateData(contractAddress);
    
    case "hop":
      return getHopData(contractAddress);
    
    case "overnight":
      return getOvernightData(contractAddress);
    
    case "sky":
      return getSkyData(contractAddress);
    
    case "compound_wrapper":
    case "unknown":
    default:
      return getGenericTokenData(contractAddress);
  }
}

