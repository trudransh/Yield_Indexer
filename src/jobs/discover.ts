/**
 * Discovery Job
 * Runs daily to discover new pools from DefiLlama API
 */

import prisma from "../db/client.js";
import { syncPoolsToDb } from "../discovery/sync-pools.js";

async function main() {
  console.log("🔍 Running pool discovery job...");
  console.log(`   Time: ${new Date().toISOString()}`);

  try {
    const result = await syncPoolsToDb();

    console.log("\n📊 Discovery Summary:");
    console.log(`   New pools: ${result.inserted}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Skipped: ${result.skipped}`);
  } catch (error) {
    console.error("❌ Discovery job failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

