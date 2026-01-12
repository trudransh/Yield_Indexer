import prisma from "./client.js";

/**
 * Seed the database with initial protocol data
 */
async function seed() {
  console.log("🌱 Seeding database...");

  // Seed protocols
  const protocols = [
    {
      name: "aave_v3",
      displayName: "Aave V3",
      riskScore: 0.0,
      poolAbiType: "aave_v3",
    },
    {
      name: "compound_v3",
      displayName: "Compound V3",
      riskScore: 0.0,
      poolAbiType: "compound_v3",
    },
    {
      name: "radiant_v2",
      displayName: "Radiant V2",
      riskScore: 0.05,
      poolAbiType: "aave_v3", // Radiant is an Aave fork
    },
    {
      name: "morpho",
      displayName: "Morpho",
      riskScore: 0.05,
      poolAbiType: "erc4626",
    },
    {
      name: "yearn_v3",
      displayName: "Yearn V3",
      riskScore: 0.05,
      poolAbiType: "erc4626",
    },
    {
      name: "silo",
      displayName: "Silo Finance",
      riskScore: 0.08,
      poolAbiType: "erc4626",
    },
    {
      name: "unknown",
      displayName: "Unknown Protocol",
      riskScore: 0.15,
      poolAbiType: "erc4626",
    },
  ];

  for (const protocol of protocols) {
    await prisma.protocol.upsert({
      where: { name: protocol.name },
      update: protocol,
      create: protocol,
    });
    console.log(`  ✓ ${protocol.displayName}`);
  }

  console.log("✅ Seed complete!");
}

// Run if called directly
seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

