import { prisma } from "../db/client.js";
import { DiscoveredVault } from "./vaultsfyi.js";

/**
 * Determine the ABI type for a protocol
 */
function getPoolAbiType(protocolName: string, poolType: "lending" | "vault"): string {
  const abiTypeMap: Record<string, string> = {
    aave_v3: "aave_v3",
    aave: "aave_v3",
    compound_v3: "compound_v3",
    compound: "compound_v3",
    radiant_v2: "aave_v3", // Radiant is an Aave fork
    radiant: "aave_v3",
  };

  // Check if we have a specific ABI type for this protocol
  if (abiTypeMap[protocolName]) {
    return abiTypeMap[protocolName];
  }

  // Default based on pool type
  return poolType === "lending" ? "aave_v3" : "erc4626";
}

/**
 * Map vaults.fyi protocol names to our database protocol IDs
 */
async function getOrCreateProtocol(
  protocolName: string,
  poolType: "lending" | "vault"
): Promise<number> {
  // Try to find existing protocol
  let protocol = await prisma.protocol.findFirst({
    where: { name: protocolName },
  });

  if (!protocol) {
    // Create new protocol if it doesn't exist
    const poolAbiType = getPoolAbiType(protocolName, poolType);
    
    protocol = await prisma.protocol.create({
      data: {
        name: protocolName,
        displayName: protocolName
          .split("_")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" "),
        riskScore: 0.1, // Default risk score, should be updated manually
        poolAbiType,
      },
    });
    console.log(`   📝 Created new protocol: ${protocol.displayName} (ABI: ${poolAbiType})`);
  }

  return protocol.id;
}

/**
 * Sync discovered vaults from vaults.fyi to the database
 */
export async function syncVaultsToDB(vaults: DiscoveredVault[]): Promise<void> {
  console.log(`\n📥 Syncing ${vaults.length} vaults to database...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const vault of vaults) {
    try {
      // Get or create protocol
      const protocolId = await getOrCreateProtocol(vault.protocol, vault.poolType);

      // Upsert the pool (vault)
      // Using composite unique key: contractAddress + underlyingToken
      const existing = await prisma.pool.findFirst({
        where: {
          contractAddress: vault.vaultAddress,
          underlyingToken: vault.underlyingToken,
        },
      });

      if (existing) {
        // Update existing pool
        await prisma.pool.update({
          where: { id: existing.id },
          data: {
            name: vault.name,
            currentApy: vault.currentApy,
            currentTvl: vault.currentTvl,
            lastIndexedAt: new Date(),
            isActive: true,
          },
        });
        updated++;
      } else {
        // Create new pool
        await prisma.pool.create({
          data: {
            protocolId,
            contractAddress: vault.vaultAddress,
            name: vault.name,
            underlyingToken: vault.underlyingToken,
            underlyingSymbol: vault.underlyingSymbol,
            poolType: vault.poolType,
            currentApy: vault.currentApy,
            currentTvl: vault.currentTvl,
            lastIndexedAt: new Date(),
            discoveredVia: "vaultsfyi",
            isActive: true,
          },
        });
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error syncing vault ${vault.name}:`, error);
      skipped++;
    }
  }

  console.log(`   ✅ Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`);
}

/**
 * Mark vaults not in the latest discovery as inactive
 */
export async function deactivateMissingVaults(discoveredVaults: DiscoveredVault[]): Promise<void> {
  const discoveredAddresses = new Set(
    discoveredVaults.map((v) => v.vaultAddress.toLowerCase())
  );

  // Find pools that were discovered via vaults.fyi but aren't in current list
  const existingPools = await prisma.pool.findMany({
    where: {
      discoveredVia: "vaultsfyi",
      isActive: true,
    },
    select: {
      id: true,
      contractAddress: true,
      name: true,
    },
  });

  let deactivated = 0;
  for (const pool of existingPools) {
    if (!discoveredAddresses.has(pool.contractAddress.toLowerCase())) {
      await prisma.pool.update({
        where: { id: pool.id },
        data: { isActive: false },
      });
      console.log(`   ⚠️ Deactivated: ${pool.name}`);
      deactivated++;
    }
  }

  if (deactivated > 0) {
    console.log(`   📉 Deactivated ${deactivated} vaults no longer in vaults.fyi`);
  }
}

/**
 * Get all active vault addresses from the database
 * (Used by Subsquid processor to know which contracts to listen to)
 */
export async function getActiveVaultAddresses(): Promise<string[]> {
  const pools = await prisma.pool.findMany({
    where: {
      isActive: true,
      poolType: "vault", // Only ERC-4626 vaults for Subsquid
    },
    select: {
      contractAddress: true,
    },
  });

  return pools.map((p) => p.contractAddress.toLowerCase());
}

/**
 * Get all active pool addresses (both lending and vaults)
 */
export async function getActivePoolAddresses(): Promise<{
  vaults: string[];
  lending: string[];
}> {
  const pools = await prisma.pool.findMany({
    where: { isActive: true },
    select: {
      contractAddress: true,
      poolType: true,
    },
  });

  return {
    vaults: pools
      .filter((p) => p.poolType === "vault")
      .map((p) => p.contractAddress.toLowerCase()),
    lending: pools
      .filter((p) => p.poolType === "lending")
      .map((p) => p.contractAddress.toLowerCase()),
  };
}

/**
 * Export vault addresses to a JSON file for Subsquid to read
 * (Alternative to querying DB from Subsquid)
 */
export async function exportVaultAddressesToFile(filePath: string): Promise<void> {
  const fs = await import("fs/promises");
  
  const addresses = await getActiveVaultAddresses();
  
  await fs.writeFile(filePath, JSON.stringify(addresses, null, 2));
  console.log(`   📄 Exported ${addresses.length} vault addresses to ${filePath}`);
}

