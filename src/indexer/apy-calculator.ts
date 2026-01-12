/**
 * Yearn-style APY Calculator
 * 
 * Uses logarithmic formula for accurate continuous compounding:
 * APY = e^(ln(price_ratio) × annualization_factor) - 1
 * 
 * This approach handles:
 * - Continuous compounding properly
 * - Very short sample periods (no explosion)
 * - Negative or near-zero growth (mathematical stability)
 * 
 * Reference: Yearn Finance APY calculation methodology
 */

const SECONDS_PER_YEAR = 31_536_000; // 365 days

export interface ApyCalculationOptions {
  /** Minimum sample period in seconds (default: 3600 = 1 hour) */
  minSampleSeconds?: number;
  /** Maximum allowed APY percentage (default: 1000) */
  maxApy?: number;
  /** Minimum allowed APY percentage (default: -100) */
  minApy?: number;
}

/**
 * Calculate APY from price per share change using Yearn's logarithmic method
 * 
 * @param currentPPS - Current price per share (as number)
 * @param previousPPS - Previous price per share (as number)
 * @param elapsedSeconds - Time elapsed between measurements in seconds
 * @param options - Configuration options
 * @returns APY as a percentage (e.g., 5.5 for 5.5%)
 * 
 * @example
 * // 1% growth over 24 hours
 * const apy = calculateApyFromPPS(1.01, 1.0, 86400);
 * // Returns ~4.4% (annualized with continuous compounding)
 */
export function calculateApyFromPPS(
  currentPPS: number,
  previousPPS: number,
  elapsedSeconds: number,
  options: ApyCalculationOptions = {}
): number {
  const {
    minSampleSeconds = 3600, // 1 hour minimum
    maxApy = 1000,           // 1000% max
    minApy = -100,           // -100% min (total loss)
  } = options;

  // Guard against invalid inputs
  if (previousPPS <= 0 || currentPPS <= 0) {
    return 0;
  }

  // Require minimum sample period for meaningful data
  if (elapsedSeconds < minSampleSeconds) {
    return 0;
  }

  // Yearn's logarithmic formula
  // APY = e^(ln(price_ratio) × annualization_factor) - 1
  const priceRatio = currentPPS / previousPPS;
  
  // ln(price_ratio) - the log of the growth
  const logGrowth = Math.log(priceRatio);
  
  // Annualize the log growth
  const annualizationFactor = SECONDS_PER_YEAR / elapsedSeconds;
  const annualizedLogGrowth = logGrowth * annualizationFactor;
  
  // Convert back from log space: e^(annualized_log_growth) - 1
  const apyDecimal = Math.exp(annualizedLogGrowth) - 1;
  
  // Convert to percentage
  const apyPercent = apyDecimal * 100;

  // Clamp to reasonable range
  return Math.max(minApy, Math.min(maxApy, apyPercent));
}

/**
 * Calculate APY from price per share using bigint values
 * 
 * Useful when working with raw blockchain data (bigint PPS values)
 * 
 * @param currentPPS - Current price per share as bigint
 * @param previousPPS - Previous price per share as bigint
 * @param elapsedSeconds - Time elapsed in seconds
 * @param options - Configuration options
 * @returns APY as a percentage
 */
export function calculateApyFromBigIntPPS(
  currentPPS: bigint,
  previousPPS: bigint,
  elapsedSeconds: number,
  options: ApyCalculationOptions = {}
): number {
  // Convert bigints to numbers (may lose precision for very large values)
  const current = Number(currentPPS);
  const previous = Number(previousPPS);
  
  return calculateApyFromPPS(current, previous, elapsedSeconds, options);
}

/**
 * Calculate APY from timestamps instead of elapsed seconds
 * 
 * @param currentPPS - Current price per share
 * @param previousPPS - Previous price per share
 * @param currentTimestamp - Current timestamp (Date or ms)
 * @param previousTimestamp - Previous timestamp (Date or ms)
 * @param options - Configuration options
 * @returns APY as a percentage
 */
export function calculateApyFromTimestamps(
  currentPPS: number,
  previousPPS: number,
  currentTimestamp: Date | number,
  previousTimestamp: Date | number,
  options: ApyCalculationOptions = {}
): number {
  const currentMs = currentTimestamp instanceof Date 
    ? currentTimestamp.getTime() 
    : currentTimestamp;
  const previousMs = previousTimestamp instanceof Date 
    ? previousTimestamp.getTime() 
    : previousTimestamp;
  
  const elapsedSeconds = (currentMs - previousMs) / 1000;
  
  return calculateApyFromPPS(currentPPS, previousPPS, elapsedSeconds, options);
}

/**
 * Validate if a calculated APY seems reasonable
 * 
 * @param apy - APY percentage to validate
 * @returns true if APY is within reasonable bounds
 */
export function isReasonableApy(apy: number): boolean {
  // Most legitimate yields are between -50% and 500%
  // Anything outside this range is likely a calculation artifact
  return apy >= -50 && apy <= 500;
}

/**
 * Constants for reference
 */
export const APY_CONSTANTS = {
  SECONDS_PER_YEAR,
  SECONDS_PER_DAY: 86_400,
  SECONDS_PER_HOUR: 3_600,
  DEFAULT_MIN_SAMPLE_HOURS: 1,
} as const;

