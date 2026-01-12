import { type Address, formatUnits } from "viem";
import { getArbitrumClient } from "./rpc-client.js";
import { erc4626Abi } from "./abis/erc4626.js";
import { calculateApyFromPPS, APY_CONSTANTS } from "./apy-calculator.js";

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
 * 
 * Handles different token decimals (USDC = 6, DAI = 18, etc.)
 */
export async function getVaultData(vaultAddress: Address): Promise<VaultData> {
  const client = getArbitrumClient();

  try {
    // First get decimals to know the correct share unit
    const decimals = await client.readContract({
      address: vaultAddress,
      abi: erc4626Abi,
      functionName: "decimals",
    });

    // Use 10^decimals as ONE_SHARE (not hardcoded 1e18)
    // USDC vaults use 6 decimals, DAI uses 18, etc.
    const ONE_SHARE = 10n ** BigInt(decimals);

    const [pricePerShare, totalAssets] = await Promise.all([
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
    ]);

    return {
      pricePerShare,
      pricePerShareDecimal: Number(formatUnits(pricePerShare, decimals)),
      totalAssets: Number(formatUnits(totalAssets, decimals)),
      decimals,
    };
  } catch (error) {
    // Some vaults may be empty, paused, or not fully ERC-4626 compliant
    // Try fallback approach: just get totalAssets
    try {
      const [totalAssets, decimals] = await Promise.all([
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

      const ONE_SHARE = 10n ** BigInt(decimals);
      
      return {
        pricePerShare: ONE_SHARE, // Default to 1:1 if convertToAssets fails
        pricePerShareDecimal: 1,
        totalAssets: Number(formatUnits(totalAssets, decimals)),
        decimals,
      };
    } catch {
      // Complete failure - return zeros
      throw new Error(`Vault ${vaultAddress} is not ERC-4626 compliant or is empty/paused`);
    }
  }
}

/**
 * Calculate APY for an ERC-4626 vault based on price per share change
 *
 * Uses Yearn's logarithmic formula for accurate continuous compounding:
 * APY = e^(ln(price_ratio) × annualization_factor) - 1
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
  let currentData: VaultData;
  
  try {
    currentData = await getVaultData(vaultAddress);
  } catch (error) {
    // Vault is not accessible - return zeros
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to get vault data: ${errorMsg}`);
  }

  // If no previous data, we can't calculate APY yet
  // Return 0 APY and store current PPS for next calculation
  if (!previousPPS || !previousTimestamp) {
    return {
      apy: 0,
      tvl: currentData.totalAssets,
      rawRate: currentData.pricePerShare,
    };
  }

  // Calculate time elapsed in seconds
  const now = new Date();
  const elapsedSeconds = (now.getTime() - previousTimestamp.getTime()) / 1000;

  // Need at least 1 hour of data for meaningful APY
  if (elapsedSeconds < APY_CONSTANTS.SECONDS_PER_HOUR) {
    return {
      apy: 0,
      tvl: currentData.totalAssets,
      rawRate: currentData.pricePerShare,
    };
  }

  // Calculate APY using Yearn's logarithmic formula
  const currentPPS = Number(currentData.pricePerShare);
  const prevPPS = Number(previousPPS);

  if (prevPPS <= 0) {
    return {
      apy: 0,
      tvl: currentData.totalAssets,
      rawRate: currentData.pricePerShare,
    };
  }

  // Use the shared Yearn-style APY calculator
  const apy = calculateApyFromPPS(currentPPS, prevPPS, elapsedSeconds);

  return {
    apy,
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

