import prisma from "../db/client.js";
import { fetchArbitrumPools, type DiscoveredPool } from "./defillama.js";

/**
 * Sync discovered pools to database
 * - Inserts new pools
 * - Updates existing pools with latest APY/TVL from API
 */
export async function syncPoolsToDb(): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
}> {
  console.log("\n🔄 Syncing pools to database...");

  const discoveredPools = await fetchArbitrumPools();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const pool of discoveredPools) {
    try {
      // Get protocol ID
      const protocol = await prisma.protocol.findUnique({
        where: { name: pool.protocol },
      });

      if (!protocol) {
        console.log(`   ⚠️ Unknown protocol: ${pool.protocol}, skipping ${pool.name}`);
        skipped++;
        continue;
      }

      // Check if pool already exists (by contract address + underlying token)
      const existingPool = await prisma.pool.findFirst({
        where: {
          contractAddress: pool.contractAddress,
          underlyingToken: pool.underlyingToken,
        },
      });

      if (existingPool) {
        // Update existing pool with latest API data
        await prisma.pool.update({
          where: { id: existingPool.id },
          data: {
            currentApy: pool.currentApy,
            currentTvl: pool.currentTvl,
            defillamaPoolId: pool.defillamaPoolId, // Update in case it changed
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        // Insert new pool
        await prisma.pool.create({
          data: {
            protocolId: protocol.id,
            contractAddress: pool.contractAddress,
            name: pool.name,
            underlyingToken: pool.underlyingToken,
            underlyingSymbol: pool.underlyingSymbol,
            poolType: pool.poolType,
            currentApy: pool.currentApy,
            currentTvl: pool.currentTvl,
            discoveredVia: "defillama",
            defillamaPoolId: pool.defillamaPoolId,
            isActive: true,
          },
        });

        console.log(`   ✅ New pool: ${pool.name}`);
        inserted++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${pool.name}:`, error);
      skipped++;
    }
  }

  console.log(`\n📊 Sync complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);

  return { inserted, updated, skipped };
}

/**
 * Manually add a pool that might not be in DefiLlama
 */
export async function addManualPool(params: {
  protocolName: string;
  contractAddress: string;
  name: string;
  underlyingToken: string;
  underlyingSymbol: string;
  poolType: "lending" | "vault";
}): Promise<void> {
  const protocol = await prisma.protocol.findUnique({
    where: { name: params.protocolName },
  });

  if (!protocol) {
    throw new Error(`Unknown protocol: ${params.protocolName}`);
  }

  await prisma.pool.upsert({
    where: { contractAddress: params.contractAddress },
    update: {
      name: params.name,
      underlyingToken: params.underlyingToken,
      underlyingSymbol: params.underlyingSymbol,
    },
    create: {
      protocolId: protocol.id,
      contractAddress: params.contractAddress,
      name: params.name,
      underlyingToken: params.underlyingToken,
      underlyingSymbol: params.underlyingSymbol,
      poolType: params.poolType,
      discoveredVia: "manual",
      isActive: true,
    },
  });

  console.log(`✅ Added/updated manual pool: ${params.name}`);
}

