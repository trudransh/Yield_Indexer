/**
 * Update Metrics Job
 * Runs daily to recalculate stability scores for all pools
 */

import prisma from "../db/client.js";
import { updateAllPoolMetrics, getPoolsRankedByAdjustedApy } from "../metrics/stability.js";

async function main() {
  console.log("📈 Running metrics update job...");
  console.log(`   Time: ${new Date().toISOString()}`);

  try {
    await updateAllPoolMetrics();

    // Print pools ranked by adjusted APY
    const rankedPools = await getPoolsRankedByAdjustedApy();

    if (rankedPools.length > 0) {
      console.log("\n🏆 Pools ranked by Adjusted APY (NAM equation):");
      console.log("   APY × σ × (1 - R)\n");
      console.log(
        "   " +
          "Pool".padEnd(40) +
          "APY".padStart(8) +
          "σ".padStart(8) +
          "R".padStart(8) +
          "Adj APY".padStart(10)
      );
      console.log("   " + "-".repeat(74));

      for (const pool of rankedPools.slice(0, 10)) {
        console.log(
          "   " +
            pool.name.slice(0, 38).padEnd(40) +
            `${pool.currentApy.toFixed(2)}%`.padStart(8) +
            pool.stabilityScore.toFixed(2).padStart(8) +
            pool.riskScore.toFixed(2).padStart(8) +
            `${pool.adjustedApy.toFixed(2)}%`.padStart(10)
        );
      }
    }
  } catch (error) {
    console.error("❌ Metrics update job failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

