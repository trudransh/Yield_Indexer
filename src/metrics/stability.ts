import prisma from "../db/client.js";

/**
 * Calculate stability score (σ) for a pool based on NAM equation:
 *
 * σ = 1 − min(CV_weighted, 0.5)
 * CV_weighted = 0.50×CV₁ₕ + 0.30×CV₆ₕ + 0.20×CV₂₄ₕ
 * CV = StdDev(APY) / Mean(APY)
 */

interface StabilityMetrics {
  avgApy1h: number | null;
  avgApy24h: number | null;
  avgApy7d: number | null;
  cv1h: number | null;
  cv6h: number | null;
  cv24h: number | null;
  cvWeighted: number | null;
  stabilityScore: number | null;
}

/**
 * Calculate stability metrics for a single pool
 */
export async function calculatePoolStability(poolId: number): Promise<StabilityMetrics> {
  const now = new Date();

  // Get APY snapshots for different time windows
  const [snapshots1h, snapshots6h, snapshots24h, snapshots7d] = await Promise.all([
    prisma.apySnapshot.findMany({
      where: {
        poolId,
        timestamp: { gte: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
      },
      select: { apy: true },
    }),
    prisma.apySnapshot.findMany({
      where: {
        poolId,
        timestamp: { gte: new Date(now.getTime() - 6 * 60 * 60 * 1000) },
      },
      select: { apy: true },
    }),
    prisma.apySnapshot.findMany({
      where: {
        poolId,
        timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: { apy: true },
    }),
    prisma.apySnapshot.findMany({
      where: {
        poolId,
        timestamp: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { apy: true },
    }),
  ]);

  const calculateStats = (snapshots: { apy: unknown }[]) => {
    if (snapshots.length === 0) return { mean: null, stddev: null, cv: null };

    const values = snapshots.map((s) => Number(s.apy));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    if (mean === 0) return { mean, stddev: 0, cv: 0 };

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);
    const cv = stddev / mean;

    return { mean, stddev, cv };
  };

  const stats1h = calculateStats(snapshots1h);
  const stats6h = calculateStats(snapshots6h);
  const stats24h = calculateStats(snapshots24h);
  const stats7d = calculateStats(snapshots7d);

  // Calculate weighted CV (from NAM equation)
  // CV_weighted = 0.50×CV₁ₕ + 0.30×CV₆ₕ + 0.20×CV₂₄ₕ
  let cvWeighted: number | null = null;
  let stabilityScore: number | null = null;

  if (stats1h.cv !== null && stats6h.cv !== null && stats24h.cv !== null) {
    cvWeighted = 0.5 * stats1h.cv + 0.3 * stats6h.cv + 0.2 * stats24h.cv;

    // σ = 1 − min(CV_weighted, 0.5)
    stabilityScore = 1 - Math.min(cvWeighted, 0.5);
  }

  return {
    avgApy1h: stats1h.mean,
    avgApy24h: stats24h.mean,
    avgApy7d: stats7d.mean,
    cv1h: stats1h.cv,
    cv6h: stats6h.cv,
    cv24h: stats24h.cv,
    cvWeighted,
    stabilityScore,
  };
}

/**
 * Update stability metrics for a single pool
 */
export async function updatePoolMetrics(poolId: number): Promise<void> {
  const metrics = await calculatePoolStability(poolId);

  await prisma.poolMetrics.upsert({
    where: { poolId },
    update: {
      avgApy1h: metrics.avgApy1h,
      avgApy24h: metrics.avgApy24h,
      avgApy7d: metrics.avgApy7d,
      cv1h: metrics.cv1h,
      cv6h: metrics.cv6h,
      cv24h: metrics.cv24h,
      cvWeighted: metrics.cvWeighted,
      stabilityScore: metrics.stabilityScore,
      updatedAt: new Date(),
    },
    create: {
      poolId,
      avgApy1h: metrics.avgApy1h,
      avgApy24h: metrics.avgApy24h,
      avgApy7d: metrics.avgApy7d,
      cv1h: metrics.cv1h,
      cv6h: metrics.cv6h,
      cv24h: metrics.cv24h,
      cvWeighted: metrics.cvWeighted,
      stabilityScore: metrics.stabilityScore,
    },
  });
}

/**
 * Update stability metrics for all active pools
 */
export async function updateAllPoolMetrics(): Promise<void> {
  console.log("\n📈 Updating stability metrics...");

  const activePools = await prisma.pool.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  for (const pool of activePools) {
    try {
      await updatePoolMetrics(pool.id);
      console.log(`   ✅ ${pool.name}`);
    } catch (error) {
      console.error(`   ❌ ${pool.name}:`, error);
    }
  }

  console.log("✅ Metrics update complete");
}

/**
 * Get pools ranked by adjusted APY (for NAM decision making)
 *
 * Adjusted APY = APY × σ × (1 − R)
 * Where:
 * - APY = current APY
 * - σ = stability score
 * - R = protocol risk score
 */
export async function getPoolsRankedByAdjustedApy(): Promise<
  Array<{
    id: number;
    name: string;
    currentApy: number;
    stabilityScore: number;
    riskScore: number;
    adjustedApy: number;
  }>
> {
  const pools = await prisma.pool.findMany({
    where: { isActive: true },
    include: {
      protocol: true,
      metrics: true,
    },
  });

  const rankedPools = pools
    .map((pool) => {
      const currentApy = Number(pool.currentApy) || 0;
      const stabilityScore = Number(pool.metrics?.stabilityScore) || 0.5; // Default to 0.5 if no data
      const riskScore = Number(pool.protocol.riskScore) || 0.1;

      // Adjusted APY from NAM equation
      const adjustedApy = currentApy * stabilityScore * (1 - riskScore);

      return {
        id: pool.id,
        name: pool.name,
        currentApy,
        stabilityScore,
        riskScore,
        adjustedApy,
      };
    })
    .sort((a, b) => b.adjustedApy - a.adjustedApy);

  return rankedPools;
}

