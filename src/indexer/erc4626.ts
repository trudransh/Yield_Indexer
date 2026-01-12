import { type Address, formatUnits } from "viem";
import { getArbitrumClient } from "./rpc-client.js";
import { erc4626Abi } from "./abis/erc4626.js";

export interface VaultData {
  pricePerShare: bigint; // Raw value (for storing)
  pricePerShareDecimal: number; // Human readable
  totalAssets: number; // TVL in underlying
  decimals: number;
}

export interface VaultApyData {
  apy: number; // As percentage
  tvl: number; // In underlying token units
  rawRate: bigint; // pricePerShare (for reference)
}

/**
 * Get current vault data for an ERC-4626 vault
 */
export async function getVaultData(vaultAddress: Address): Promise<VaultData> {
  const client = getArbitrumClient();

  // Use 1e18 shares as standard for price calculation
  const ONE_SHARE = 10n ** 18n;

  const [pricePerShare, totalAssets, decimals] = await Promise.all([
    client.readContract({
      address: vaultAddress,
      abi: erc4626Abi,
      functionName: "convertToAssets",
      args: [ONE_SHARE],
    }),
    client.readContract({
      address: vaultAddress,
      abi: erc4626Abi,
      functionName: "totalAssets",
    }),
    client.readContract({
      address: vaultAddress,
      abi: erc4626Abi,
      functionName: "decimals",
    }),
  ]);

  return {
    pricePerShare,
    pricePerShareDecimal: Number(formatUnits(pricePerShare, decimals)),
    totalAssets: Number(formatUnits(totalAssets, decimals)),
    decimals,
  };
}

/**
 * Calculate APY for an ERC-4626 vault based on price per share change
 *
 * APY = ((currentPPS / previousPPS) - 1) * (hoursPerYear / hoursPassed) * 100
 *
 * @param vaultAddress - The vault contract address
 * @param previousPPS - Previous price per share (raw bigint)
 * @param previousTimestamp - When the previous PPS was recorded
 */
export async function calculateVaultApy(
  vaultAddress: Address,
  previousPPS: bigint | null,
  previousTimestamp: Date | null
): Promise<VaultApyData> {
  const currentData = await getVaultData(vaultAddress);

  // If no previous data, we can't calculate APY yet
  // Return 0 APY and store current PPS for next calculation
  if (!previousPPS || !previousTimestamp) {
    return {
      apy: 0,
      tvl: currentData.totalAssets,
      rawRate: currentData.pricePerShare,
    };
  }

  // Calculate time elapsed in hours
  const now = new Date();
  const hoursPassed = (now.getTime() - previousTimestamp.getTime()) / (1000 * 60 * 60);

  // Need at least 1 hour of data for meaningful APY
  if (hoursPassed < 1) {
    return {
      apy: 0,
      tvl: currentData.totalAssets,
      rawRate: currentData.pricePerShare,
    };
  }

  // Calculate APY
  // APY = ((currentPPS / previousPPS) - 1) * (8760 / hoursPassed) * 100
  const currentPPS = Number(currentData.pricePerShare);
  const prevPPS = Number(previousPPS);

  if (prevPPS === 0) {
    return {
      apy: 0,
      tvl: currentData.totalAssets,
      rawRate: currentData.pricePerShare,
    };
  }

  const ppsRatio = currentPPS / prevPPS;
  const hourlyReturn = ppsRatio - 1;
  const hoursPerYear = 8760; // 365 * 24

  // Annualized return as percentage
  // Using simple annualization: hourlyReturn * (hoursPerYear / hoursPassed)
  const apyDecimal = hourlyReturn * (hoursPerYear / hoursPassed);
  const apyPercent = apyDecimal * 100;

  // Sanity check: APY should be reasonable (0% to 1000%)
  // If outside this range, something is wrong
  const clampedApy = Math.max(0, Math.min(1000, apyPercent));

  return {
    apy: clampedApy,
    tvl: currentData.totalAssets,
    rawRate: currentData.pricePerShare,
  };
}

/**
 * Check if an address is a valid ERC-4626 vault
 */
export async function isErc4626Vault(address: Address): Promise<boolean> {
  const client = getArbitrumClient();

  try {
    // Try to call convertToAssets - if it works, it's likely an ERC-4626 vault
    await client.readContract({
      address,
      abi: erc4626Abi,
      functionName: "convertToAssets",
      args: [10n ** 18n],
    });

    // Also check totalAssets
    await client.readContract({
      address,
      abi: erc4626Abi,
      functionName: "totalAssets",
    });

    return true;
  } catch {
    return false;
  }
}

