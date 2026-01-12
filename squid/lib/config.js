"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAY = exports.config = void 0;
exports.rayRateToApy = rayRateToApy;
exports.poolId = poolId;
exports.snapshotId = snapshotId;
exports.eventId = eventId;
const evm_processor_1 = require("@subsquid/evm-processor");
exports.config = {
    // Chain
    chainId: parseInt(process.env.CHAIN_ID || "42161"),
    chainName: "arbitrum",
    // RPC
    rpcUrl: (0, evm_processor_1.assertNotNull)(process.env.RPC_ARBITRUM_HTTP, "RPC_ARBITRUM_HTTP env var is required"),
    // Start block - Aave V3 on Arbitrum deployment (~March 2023)
    fromBlock: parseInt(process.env.FROM_BLOCK || "70000000"),
    // Protocol addresses on Arbitrum
    protocols: {
        aaveV3: {
            pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD".toLowerCase(),
            poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654".toLowerCase(),
        },
        compoundV3: {
            // USDC Comet
            cometUsdc: "0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA".toLowerCase(),
        },
        radiantV2: {
            pool: "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1".toLowerCase(),
        },
    },
    // Stablecoins we care about on Arbitrum
    stablecoins: new Map([
        ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831".toLowerCase(), "USDC"],
        ["0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8".toLowerCase(), "USDC.e"],
        ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9".toLowerCase(), "USDT"],
        ["0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1".toLowerCase(), "DAI"],
        ["0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F".toLowerCase(), "FRAX"],
    ]),
};
// RAY = 10^27 (Aave's precision for rates)
exports.RAY = 10n ** 27n;
// Helper to convert Aave's RAY rate to APY percentage
function rayRateToApy(rayRate) {
    // APY = rayRate / 10^27 * 100
    return Number(rayRate) / Number(exports.RAY) * 100;
}
// Helper to generate composite IDs
function poolId(chainId, address) {
    return `${chainId}:${address.toLowerCase()}`;
}
function snapshotId(chainId, address, blockNumber) {
    return `${chainId}:${address.toLowerCase()}:${blockNumber}`;
}
function eventId(chainId, txHash, logIndex) {
    return `${chainId}:${txHash}:${logIndex}`;
}
//# sourceMappingURL=config.js.map