import { type Address } from "viem";
import prisma from "../db/client.js";
import { getLendingPoolApy } from "./lending.js";
import { calculateVaultApy, getVaultData } from "./erc4626.js";

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

    if (pool.poolType === "lending") {
      // Lending pool: read APY directly from contract
      const data = await getLendingPoolApy(
        pool.protocol.poolAbiType,
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

      // Update last PPS for next calculation
      const vaultData = await getVaultData(contractAddress);
      await prisma.pool.update({
        where: { id: poolId },
        data: {
          lastPricePerShare: vaultData.pricePerShare.toString(),
          lastPpsTimestamp: new Date(),
        },
      });
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

