/**
 * Discovery Job
 * Runs daily to discover new vaults from vaults.fyi API
 */

import { prisma } from "../db/client.js";
import { fetchArbitrumVaults } from "../discovery/vaultsfyi.js";
import { syncVaultsToDB, deactivateMissingVaults, exportVaultAddressesToFile } from "../discovery/vaultsfyi-sync.js";
import path from "path";

async function main() {
  console.log("🔍 Running vault discovery job...");
  console.log(`   Time: ${new Date().toISOString()}`);

  try {
    // Fetch vaults from vaults.fyi API
    const vaults = await fetchArbitrumVaults();

    if (vaults.length === 0) {
      console.log("⚠️ No vaults found from vaults.fyi API");
      return;
    }

    // Sync to database
    await syncVaultsToDB(vaults);

    // Deactivate vaults that are no longer in the API
    await deactivateMissingVaults(vaults);

    // Export vault addresses for Subsquid processor
    const exportPath = path.join(process.cwd(), "vault-addresses.json");
    await exportVaultAddressesToFile(exportPath);

    console.log("\n✅ Discovery job completed successfully!");
  } catch (error) {
    console.error("❌ Discovery job failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
