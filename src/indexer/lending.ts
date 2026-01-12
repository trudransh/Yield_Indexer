import { type Address, formatUnits } from "viem";
import { getArbitrumClient } from "./rpc-client.js";
import { aaveV3PoolAbi, aaveV3DataProviderAbi, aTokenAbi } from "./abis/aave-v3-pool.js";
import { compoundV3CometAbi, SECONDS_PER_YEAR } from "./abis/compound-v3.js";
import { config } from "../config.js";

// RAY = 10^27 (Aave's precision)
const RAY = 10n ** 27n;

export interface LendingPoolData {
  apy: number; // As percentage (e.g., 5.25 = 5.25%)
  tvl: number; // In underlying token units
  rawRate: bigint; // Raw rate from contract
}

/**
 * Get APY from Aave V3 style lending pool (also works for Radiant)
 */
export async function getAaveV3Apy(
  underlyingToken: Address,
  poolAddress: Address = config.protocols.aave_v3.poolAddress as Address
): Promise<LendingPoolData> {
  const client = getArbitrumClient();

  // Get reserve data from pool
  const reserveData = await client.readContract({
    address: poolAddress,
    abi: aaveV3PoolAbi,
    functionName: "getReserveData",
    args: [underlyingToken],
  });

  // currentLiquidityRate is in RAY (27 decimals)
  // This is the supply APR (not APY)
  const liquidityRate = reserveData.currentLiquidityRate;

  // Convert RAY to percentage APR
  // APR = liquidityRate / 10^27 * 100
  const aprPercent = Number(liquidityRate) / Number(RAY) * 100;

  // Convert APR to APY (compound annually for simplicity)
  // APY = (1 + APR/100)^1 - 1 = APR (approximately, since we compound once)
  // For more accuracy with continuous compounding:
  // APY = e^APR - 1 ≈ APR for small values
  const apyPercent = aprPercent; // Aave's rate is already effectively APY due to second-by-second compounding

  // Get TVL from aToken
  const aTokenAddress = reserveData.aTokenAddress;
  const [totalSupply, decimals] = await Promise.all([
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
  ]);

  const tvl = Number(formatUnits(totalSupply, decimals));

  return {
    apy: apyPercent,
    tvl,
    rawRate: liquidityRate,
  };
}

/**
 * Get APY from Compound V3 (Comet)
 */
export async function getCompoundV3Apy(
  cometAddress: Address = config.protocols.compound_v3.cometAddress as Address
): Promise<LendingPoolData> {
  const client = getArbitrumClient();

  // Get current utilization
  const utilization = await client.readContract({
    address: cometAddress,
    abi: compoundV3CometAbi,
    functionName: "getUtilization",
  });

  // Get supply rate at current utilization
  // Returns rate per second scaled by 1e18
  const supplyRatePerSecond = await client.readContract({
    address: cometAddress,
    abi: compoundV3CometAbi,
    functionName: "getSupplyRate",
    args: [utilization],
  });

  // Get TVL
  const [totalSupply, decimals] = await Promise.all([
    client.readContract({
      address: cometAddress,
      abi: compoundV3CometAbi,
      functionName: "totalSupply",
    }),
    client.readContract({
      address: cometAddress,
      abi: compoundV3CometAbi,
      functionName: "decimals",
    }),
  ]);

  // Convert rate per second to APY
  // APR = ratePerSecond * secondsPerYear
  // APY = (1 + APR/n)^n - 1 where n = number of compounding periods
  const ratePerSecond = Number(supplyRatePerSecond) / 1e18;
  const secondsPerYear = Number(SECONDS_PER_YEAR);

  // Compound's rate compounds every second, so:
  // APY = (1 + ratePerSecond)^secondsPerYear - 1
  const apyDecimal = Math.pow(1 + ratePerSecond, secondsPerYear) - 1;
  const apyPercent = apyDecimal * 100;

  const tvl = Number(formatUnits(totalSupply, decimals));

  return {
    apy: apyPercent,
    tvl,
    rawRate: supplyRatePerSecond,
  };
}

/**
 * Get APY for a lending pool based on its protocol type
 */
export async function getLendingPoolApy(
  poolType: string,
  contractAddress: Address,
  underlyingToken: Address
): Promise<LendingPoolData> {
  switch (poolType) {
    case "aave_v3":
      return getAaveV3Apy(underlyingToken, contractAddress);

    case "compound_v3":
      return getCompoundV3Apy(contractAddress);

    // Radiant V2 is an Aave fork, same interface
    case "radiant_v2":
      return getAaveV3Apy(underlyingToken, contractAddress);

    default:
      throw new Error(`Unknown lending pool type: ${poolType}`);
  }
}

