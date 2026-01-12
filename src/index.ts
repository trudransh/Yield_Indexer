/**
 * Yield Indexer - Main Entry Point
 *
 * Runs scheduled jobs:
 * - Hourly: Index all pools (fetch on-chain APY)
 * - Daily: Discover new pools from DefiLlama
 * - Daily: Update stability metrics
 */

import cron from "node-cron";
import prisma from "./db/client.js";
import { config } from "./config.js";
import { syncPoolsToDb } from "./discovery/sync-pools.js";
import { indexAllPools } from "./indexer/index.js";
import { updateAllPoolMetrics, getPoolsRankedByAdjustedApy } from "./metrics/stability.js";

async function runDiscovery() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 DISCOVERY JOB");
  console.log("=".repeat(60));
  try {
    await syncPoolsToDb();
  } catch (error) {
    console.error("Discovery job error:", error);
  }
}

async function runIndexing() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 INDEXING JOB");
  console.log("=".repeat(60));
  try {
    await indexAllPools();
  } catch (error) {
    console.error("Indexing job error:", error);
  }
}

async function runMetricsUpdate() {
  console.log("\n" + "=".repeat(60));
  console.log("📈 METRICS UPDATE JOB");
  console.log("=".repeat(60));
  try {
    await updateAllPoolMetrics();

    // Print rankings
    const ranked = await getPoolsRankedByAdjustedApy();
    if (ranked.length > 0) {
      console.log("\n🏆 Top pools by Adjusted APY:");
      for (const pool of ranked.slice(0, 5)) {
        console.log(
          `   ${pool.name}: ${pool.adjustedApy.toFixed(2)}% (raw: ${pool.currentApy.toFixed(2)}%, σ: ${pool.stabilityScore.toFixed(2)})`
        );
      }
    }
  } catch (error) {
    console.error("Metrics job error:", error);
  }
}

async function main() {
  console.log("🚀 Yield Indexer Starting...");
  console.log(`   Chain: Arbitrum (${config.arbitrumChainId})`);
  console.log(`   RPC: ${config.arbitrumRpcUrl}`);
  console.log(`   Index interval: ${config.indexIntervalHours} hour(s)`);
  console.log(`   Discovery interval: ${config.discoveryIntervalHours} hour(s)`);

  // Check database connection
  try {
    await prisma.$connect();
    console.log("   ✅ Database connected");
  } catch (error) {
    console.error("   ❌ Database connection failed:", error);
    process.exit(1);
  }

  // Run initial jobs
  console.log("\n📋 Running initial jobs...");
  await runDiscovery();
  await runIndexing();
  await runMetricsUpdate();

  // Schedule hourly indexing
  // Runs at minute 0 of every hour
  const indexCron = `0 */${config.indexIntervalHours} * * *`;
  cron.schedule(indexCron, async () => {
    console.log(`\n⏰ Scheduled indexing triggered at ${new Date().toISOString()}`);
    await runIndexing();
    await runMetricsUpdate();
  });
  console.log(`\n⏱️  Scheduled: Indexing every ${config.indexIntervalHours} hour(s)`);

  // Schedule daily discovery
  // Runs at 00:00 every day
  const discoveryCron = `0 0 */${Math.floor(config.discoveryIntervalHours / 24) || 1} * *`;
  cron.schedule(discoveryCron, async () => {
    console.log(`\n⏰ Scheduled discovery triggered at ${new Date().toISOString()}`);
    await runDiscovery();
  });
  console.log(`⏱️  Scheduled: Discovery every ${config.discoveryIntervalHours} hour(s)`);

  console.log("\n✅ Yield Indexer running. Press Ctrl+C to stop.");

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 Shutting down...");
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n\n🛑 Shutting down...");
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch(async (error) => {
  console.error("Fatal error:", error);
  await prisma.$disconnect();
  process.exit(1);
});

