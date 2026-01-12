import { type Address } from "viem";
import prisma from "../db/client.js";
import { getLendingPoolApy } from "./lending.js";
import { calculateVaultApy } from "./erc4626.js";
import { config } from "../config.js";

// Known lending pool addresses from our config
// Only these should use Aave/Compound ABIs
const KNOWN_AAVE_POOLS = new Set([
  config.protocols.aave_v3.poolAddress.toLowerCase(),
]);

const KNOWN_COMPOUND_POOLS = new Set([
  config.protocols.compound_v3.cometAddress.toLowerCase(),
]);

export interface IndexResult {
  poolId: number;
  name: string;
  apy: number;
  tvl: number;
  success: boolean;
  error?: string;
}

/**
 * Index a single pool and store APY snapshot
 */
export async function indexPool(poolId: number): Promise<IndexResult> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { protocol: true },
  });

  if (!pool) {
    return {
      poolId,
      name: "Unknown",
      apy: 0,
      tvl: 0,
      success: false,
      error: "Pool not found",
    };
  }

  try {
    let apy: number;
    let tvl: number;
    let rawRate: bigint;

    const contractAddress = pool.contractAddress as Address;
    const underlyingToken = pool.underlyingToken as Address;
    const contractLower = contractAddress.toLowerCase();

    // Check if this is a KNOWN lending pool address from our config
    // Only these should use native Aave/Compound ABIs
    // Everything else (including vaults.fyi discovered vaults) uses ERC-4626
    const isKnownAavePool = KNOWN_AAVE_POOLS.has(contractLower);
    const isKnownCompoundPool = KNOWN_COMPOUND_POOLS.has(contractLower);

    if (isKnownAavePool) {
      // Aave V3 pool - use Aave ABI
      const data = await getLendingPoolApy(
        "aave_v3",
        contractAddress,
        underlyingToken
      );
      apy = data.apy;
      tvl = data.tvl;
      rawRate = data.rawRate;
    } else if (isKnownCompoundPool) {
      // Compound V3 pool - use Compound ABI
      const data = await getLendingPoolApy(
        "compound_v3",
        contractAddress,
        underlyingToken
      );
      apy = data.apy;
      tvl = data.tvl;
      rawRate = data.rawRate;
    } else {
      // ERC-4626 vault: calculate APY from price per share change
      const data = await calculateVaultApy(
        contractAddress,
        pool.lastPricePerShare ? BigInt(pool.lastPricePerShare.toString()) : null,
        pool.lastPpsTimestamp
      );
      apy = data.apy;
      tvl = data.tvl;
      rawRate = data.rawRate;

      // Update last PPS for next calculation (only if we got valid data)
      if (rawRate > 0n) {
        await prisma.pool.update({
          where: { id: poolId },
          data: {
            lastPricePerShare: rawRate.toString(),
            lastPpsTimestamp: new Date(),
          },
        });
      }
    }

    // Store snapshot
    const now = new Date();
    await prisma.apySnapshot.create({
      data: {
        poolId,
        timestamp: now,
        apy,
        tvl,
        rawRate: rawRate.toString(), // Convert bigint to string for Decimal storage
      },
    });

    // Update pool current state
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        currentApy: apy,
        currentTvl: tvl,
        lastIndexedAt: now,
      },
    });

    return {
      poolId,
      name: pool.name,
      apy,
      tvl,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`   ❌ Error indexing pool ${pool.name}:`, errorMessage);

    return {
      poolId,
      name: pool.name,
      apy: 0,
      tvl: 0,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Index all active pools
 */
export async function indexAllPools(): Promise<IndexResult[]> {
  console.log("\n⏱️  Starting pool indexing...");

  const activePools = await prisma.pool.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  console.log(`   Found ${activePools.length} active pools`);

  const results: IndexResult[] = [];

  for (const pool of activePools) {
    console.log(`   📊 Indexing: ${pool.name}`);
    const result = await indexPool(pool.id);
    results.push(result);

    if (result.success) {
      console.log(`      ✅ APY: ${result.apy.toFixed(2)}%, TVL: $${result.tvl.toLocaleString()}`);
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n✅ Indexing complete: ${successful} successful, ${failed} failed`);

  return results;
}

