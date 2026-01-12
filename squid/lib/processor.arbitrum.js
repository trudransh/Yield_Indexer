"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runArbitrumProcessor = runArbitrumProcessor;
const evm_processor_1 = require("@subsquid/evm-processor");
const typeorm_store_1 = require("@subsquid/typeorm-store");
const config_1 = require("./config");
const aaveV3 = __importStar(require("./abi/aaveV3Pool"));
const erc4626 = __importStar(require("./abi/erc4626"));
const model_1 = require("./model");
// Initialize processor
const processor = new evm_processor_1.EvmBatchProcessor()
    .setRpcEndpoint({
    url: config_1.config.rpcUrl,
    rateLimit: 10, // requests per second
})
    .setBlockRange({ from: config_1.config.fromBlock })
    .setFinalityConfirmation(75) // Arbitrum finality
    .addLog({
    // Aave V3 Pool - ReserveDataUpdated events
    address: [config_1.config.protocols.aaveV3.pool],
    topic0: [aaveV3.events.ReserveDataUpdated.topic],
})
    .addLog({
    // Radiant V2 Pool (Aave fork) - ReserveDataUpdated events
    address: [config_1.config.protocols.radiantV2.pool],
    topic0: [aaveV3.events.ReserveDataUpdated.topic],
})
    .addLog({
    // ERC-4626 Vault Deposit/Withdraw events (will filter by known vaults)
    topic0: [erc4626.events.Deposit.topic, erc4626.events.Withdraw.topic],
})
    .setFields({
    log: {
        address: true,
        topics: true,
        data: true,
    },
    transaction: {
        hash: true,
    },
    block: {
        timestamp: true,
    },
});
// Database
const db = new typeorm_store_1.TypeormDatabase();
// Track known vault addresses (populated from events or config)
const knownVaults = new Set();
async function runArbitrumProcessor() {
    console.log("🚀 Starting Arbitrum Yield Processor...");
    console.log(`   Chain ID: ${config_1.config.chainId}`);
    console.log(`   From block: ${config_1.config.fromBlock}`);
    console.log(`   RPC: ${config_1.config.rpcUrl}`);
    await processor.run(db, async (ctx) => {
        // Maps for batch upserts
        const protocols = new Map();
        const pools = new Map();
        const snapshots = new Map();
        const rateUpdates = new Map();
        const vaultEvents = new Map();
        // Ensure protocols exist
        await ensureProtocols(ctx, protocols);
        for (const block of ctx.blocks) {
            const timestamp = new Date(block.header.timestamp);
            const blockNumber = block.header.height;
            for (const log of block.logs) {
                const logAddress = log.address.toLowerCase();
                // Handle Aave V3 / Radiant V2 ReserveDataUpdated events
                if (log.topics[0] === aaveV3.events.ReserveDataUpdated.topic &&
                    (logAddress === config_1.config.protocols.aaveV3.pool ||
                        logAddress === config_1.config.protocols.radiantV2.pool)) {
                    await processReserveDataUpdated(ctx, log, block.header, protocols, pools, snapshots, rateUpdates);
                }
                // Handle ERC-4626 Deposit events
                if (log.topics[0] === erc4626.events.Deposit.topic) {
                    await processVaultDeposit(ctx, log, block.header, protocols, pools, snapshots, vaultEvents);
                }
                // Handle ERC-4626 Withdraw events
                if (log.topics[0] === erc4626.events.Withdraw.topic) {
                    await processVaultWithdraw(ctx, log, block.header, protocols, pools, snapshots, vaultEvents);
                }
            }
        }
        // Batch save all entities
        if (protocols.size > 0) {
            await ctx.store.upsert(Array.from(protocols.values()));
        }
        if (pools.size > 0) {
            await ctx.store.upsert(Array.from(pools.values()));
        }
        if (snapshots.size > 0) {
            await ctx.store.upsert(Array.from(snapshots.values()));
        }
        if (rateUpdates.size > 0) {
            await ctx.store.insert(Array.from(rateUpdates.values()));
        }
        if (vaultEvents.size > 0) {
            await ctx.store.insert(Array.from(vaultEvents.values()));
        }
    });
}
async function ensureProtocols(ctx, protocols) {
    const protocolDefs = [
        { id: "aave_v3", displayName: "Aave V3", riskScore: 0.0, poolAbiType: "aave_v3" },
        { id: "compound_v3", displayName: "Compound V3", riskScore: 0.0, poolAbiType: "compound_v3" },
        { id: "radiant_v2", displayName: "Radiant V2", riskScore: 0.05, poolAbiType: "aave_v3" },
        { id: "morpho", displayName: "Morpho", riskScore: 0.05, poolAbiType: "erc4626" },
        { id: "yearn_v3", displayName: "Yearn V3", riskScore: 0.05, poolAbiType: "erc4626" },
        { id: "unknown", displayName: "Unknown Protocol", riskScore: 0.15, poolAbiType: "erc4626" },
    ];
    for (const def of protocolDefs) {
        let protocol = await ctx.store.get(model_1.Protocol, def.id);
        if (!protocol) {
            protocol = new model_1.Protocol({
                id: def.id,
                displayName: def.displayName,
                riskScore: def.riskScore,
                poolAbiType: def.poolAbiType,
                createdAt: new Date(),
            });
        }
        protocols.set(def.id, protocol);
    }
}
async function processReserveDataUpdated(ctx, log, block, protocols, pools, snapshots, rateUpdates) {
    const decoded = aaveV3.events.ReserveDataUpdated.decode(log);
    const reserveAddress = decoded.reserve.toLowerCase();
    const logAddress = log.address.toLowerCase();
    // Check if this is a stablecoin we care about
    const stablecoinSymbol = config_1.config.stablecoins.get(reserveAddress);
    if (!stablecoinSymbol) {
        return; // Not a stablecoin we track
    }
    // Determine protocol
    const protocolId = logAddress === config_1.config.protocols.aaveV3.pool ? "aave_v3" : "radiant_v2";
    const protocol = protocols.get(protocolId);
    // Calculate APY from liquidity rate
    const supplyApy = (0, config_1.rayRateToApy)(decoded.liquidityRate);
    // Get or create pool
    const pId = (0, config_1.poolId)(config_1.config.chainId, `${logAddress}:${reserveAddress}`);
    let pool = pools.get(pId) || (await ctx.store.get(model_1.Pool, pId));
    if (!pool) {
        pool = new model_1.Pool({
            id: pId,
            chainId: config_1.config.chainId,
            protocol,
            contractAddress: logAddress,
            name: `${protocol.displayName} ${stablecoinSymbol}`,
            underlyingToken: reserveAddress,
            underlyingSymbol: stablecoinSymbol,
            poolType: "lending",
            discoveredVia: "subsquid",
            isActive: true,
            createdAt: new Date(block.timestamp),
        });
    }
    // Update pool state
    pool.currentApy = supplyApy;
    pool.lastUpdatedAt = new Date(block.timestamp);
    pools.set(pId, pool);
    // Create rate update event (use block:logIndex as unique ID)
    const rId = `${config_1.config.chainId}:${block.height}:${log.logIndex}`;
    const txHash = log.transaction?.hash || `block-${block.height}`;
    const rateUpdate = new model_1.RateUpdate({
        id: rId,
        pool,
        timestamp: new Date(block.timestamp),
        blockNumber: block.height,
        txHash: txHash,
        logIndex: log.logIndex,
        liquidityRate: decoded.liquidityRate,
        variableBorrowRate: decoded.variableBorrowRate,
        stableBorrowRate: decoded.stableBorrowRate,
        supplyApy,
    });
    rateUpdates.set(rId, rateUpdate);
    // Create APY snapshot
    const sId = (0, config_1.snapshotId)(config_1.config.chainId, pId, block.height);
    const snapshot = new model_1.ApySnapshot({
        id: sId,
        pool,
        timestamp: new Date(block.timestamp),
        blockNumber: block.height,
        apy: supplyApy,
        rawRate: decoded.liquidityRate,
    });
    snapshots.set(sId, snapshot);
    ctx.log.info(`📊 ${protocol.displayName} ${stablecoinSymbol}: ${supplyApy.toFixed(2)}% APY @ block ${block.height}`);
}
async function processVaultDeposit(ctx, log, block, protocols, pools, snapshots, vaultEvents) {
    const vaultAddress = log.address.toLowerCase();
    const decoded = erc4626.events.Deposit.decode(log);
    // Get or create vault pool
    const pId = (0, config_1.poolId)(config_1.config.chainId, vaultAddress);
    let pool = pools.get(pId) || (await ctx.store.get(model_1.Pool, pId));
    if (!pool) {
        // New vault discovered - create pool
        const protocol = protocols.get("unknown"); // Will update later if we know the protocol
        pool = new model_1.Pool({
            id: pId,
            chainId: config_1.config.chainId,
            protocol,
            contractAddress: vaultAddress,
            name: `ERC-4626 Vault ${vaultAddress.slice(0, 10)}...`,
            underlyingToken: "", // Will be populated on first read
            underlyingSymbol: "UNKNOWN",
            poolType: "vault",
            discoveredVia: "subsquid",
            isActive: true,
            createdAt: new Date(block.timestamp),
        });
        knownVaults.add(vaultAddress);
    }
    pool.lastUpdatedAt = new Date(block.timestamp);
    pools.set(pId, pool);
    // Create vault event (use block:logIndex as unique ID)
    const eId = `${config_1.config.chainId}:${block.height}:${log.logIndex}`;
    const txHashDeposit = log.transaction?.hash || `block-${block.height}`;
    const vaultEvent = new model_1.VaultEvent({
        id: eId,
        pool,
        timestamp: new Date(block.timestamp),
        blockNumber: block.height,
        txHash: txHashDeposit,
        logIndex: log.logIndex,
        eventType: "deposit",
        sender: decoded.sender.toLowerCase(),
        owner: decoded.owner.toLowerCase(),
        assets: decoded.assets,
        shares: decoded.shares,
    });
    vaultEvents.set(eId, vaultEvent);
    // Calculate and store price per share if we have both values
    if (decoded.shares > 0n) {
        const pricePerShare = (decoded.assets * 10n ** 18n) / decoded.shares;
        vaultEvent.pricePerShare = pricePerShare;
        pool.lastPricePerShare = pricePerShare;
    }
}
async function processVaultWithdraw(ctx, log, block, protocols, pools, snapshots, vaultEvents) {
    const vaultAddress = log.address.toLowerCase();
    const decoded = erc4626.events.Withdraw.decode(log);
    // Get or create vault pool
    const pId = (0, config_1.poolId)(config_1.config.chainId, vaultAddress);
    let pool = pools.get(pId) || (await ctx.store.get(model_1.Pool, pId));
    if (!pool) {
        // New vault discovered - create pool
        const protocol = protocols.get("unknown");
        pool = new model_1.Pool({
            id: pId,
            chainId: config_1.config.chainId,
            protocol,
            contractAddress: vaultAddress,
            name: `ERC-4626 Vault ${vaultAddress.slice(0, 10)}...`,
            underlyingToken: "",
            underlyingSymbol: "UNKNOWN",
            poolType: "vault",
            discoveredVia: "subsquid",
            isActive: true,
            createdAt: new Date(block.timestamp),
        });
        knownVaults.add(vaultAddress);
    }
    pool.lastUpdatedAt = new Date(block.timestamp);
    pools.set(pId, pool);
    // Create vault event (use block:logIndex as unique ID)
    const wId = `${config_1.config.chainId}:${block.height}:${log.logIndex}`;
    const txHashWithdraw = log.transaction?.hash || `block-${block.height}`;
    const vaultEvent = new model_1.VaultEvent({
        id: wId,
        pool,
        timestamp: new Date(block.timestamp),
        blockNumber: block.height,
        txHash: txHashWithdraw,
        logIndex: log.logIndex,
        eventType: "withdraw",
        sender: decoded.sender.toLowerCase(),
        owner: decoded.owner.toLowerCase(),
        assets: decoded.assets,
        shares: decoded.shares,
    });
    vaultEvents.set(wId, vaultEvent);
    // Calculate price per share
    if (decoded.shares > 0n) {
        const pricePerShare = (decoded.assets * 10n ** 18n) / decoded.shares;
        vaultEvent.pricePerShare = pricePerShare;
        pool.lastPricePerShare = pricePerShare;
    }
}
//# sourceMappingURL=processor.arbitrum.js.map