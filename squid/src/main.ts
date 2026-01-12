import { runArbitrumProcessor } from "./processor.arbitrum";

// Entry point - run the Arbitrum yield processor
runArbitrumProcessor().catch((err) => {
  console.error("Processor failed:", err);
  process.exit(1);
});

