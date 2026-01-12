"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const processor_arbitrum_1 = require("./processor.arbitrum");
// Entry point - run the Arbitrum yield processor
(0, processor_arbitrum_1.runArbitrumProcessor)().catch((err) => {
    console.error("Processor failed:", err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map