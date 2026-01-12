/**
 * Index Pools Job
 * Runs hourly to fetch on-chain APY data for all pools
 */

import prisma from "../db/client.js";
import { indexAllPools } from "../indexer/index.js";

async function main() {
  console.log("📊 Running pool indexing job...");
  console.log(`   Time: ${new Date().toISOString()}`);

  try {
    const results = await indexAllPools();

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log("\n📊 Indexing Summary:");
    console.log(`   Total pools: ${results.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log("\n❌ Failed pools:");
      for (const f of failed) {
        console.log(`   - ${f.name}: ${f.error}`);
      }
    }

    // Print top pools by APY
    const topPools = successful.sort((a, b) => b.apy - a.apy).slice(0, 5);
    if (topPools.length > 0) {
      console.log("\n🏆 Top 5 pools by APY:");
      for (const pool of topPools) {
        console.log(`   ${pool.name}: ${pool.apy.toFixed(2)}%`);
      }
    }
  } catch (error) {
    console.error("❌ Indexing job failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

