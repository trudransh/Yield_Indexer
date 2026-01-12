import { EvmBatchProcessor, BlockHeader, Log } from "@subsquid/evm-processor";
import { TypeormDatabase } from "@subsquid/typeorm-store";
import { config, rayRateToApy, poolId, snapshotId, eventId } from "./config";
import * as aaveV3 from "./abi/aaveV3Pool";
import * as erc4626 from "./abi/erc4626";
import {
  Protocol,
  Pool,
  ApySnapshot,
  RateUpdate,
  VaultEvent,
} from "./model";

// Initialize processor
const processor = new EvmBatchProcessor()
  .setRpcEndpoint({
    url: config.rpcUrl,
    rateLimit: 10, // requests per second
  })
  .setBlockRange({ from: config.fromBlock })
  .setFinalityConfirmation(75) // Arbitrum finality
  .addLog({
    // Aave V3 Pool - ReserveDataUpdated events
    address: [config.protocols.aaveV3.pool],
    topic0: [aaveV3.events.ReserveDataUpdated.topic],
  })
  .addLog({
    // Radiant V2 Pool (Aave fork) - ReserveDataUpdated events
    address: [config.protocols.radiantV2.pool],
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
const db = new TypeormDatabase();

// Track known vault addresses (populated from events or config)
const knownVaults = new Set<string>();

export async function runArbitrumProcessor(): Promise<void> {
  console.log("🚀 Starting Arbitrum Yield Processor...");
  console.log(`   Chain ID: ${config.chainId}`);
  console.log(`   From block: ${config.fromBlock}`);
  console.log(`   RPC: ${config.rpcUrl}`);

  await processor.run(db, async (ctx) => {
    // Maps for batch upserts
    const protocols = new Map<string, Protocol>();
    const pools = new Map<string, Pool>();
    const snapshots = new Map<string, ApySnapshot>();
    const rateUpdates = new Map<string, RateUpdate>();
    const vaultEvents = new Map<string, VaultEvent>();

    // Ensure protocols exist
    await ensureProtocols(ctx, protocols);

    for (const block of ctx.blocks) {
      const timestamp = new Date(block.header.timestamp);
      const blockNumber = block.header.height;

      for (const log of block.logs) {
        const logAddress = log.address.toLowerCase();

        // Handle Aave V3 / Radiant V2 ReserveDataUpdated events
        if (
          log.topics[0] === aaveV3.events.ReserveDataUpdated.topic &&
          (logAddress === config.protocols.aaveV3.pool ||
            logAddress === config.protocols.radiantV2.pool)
        ) {
          await processReserveDataUpdated(
            ctx,
            log,
            block.header,
            protocols,
            pools,
            snapshots,
            rateUpdates
          );
        }

        // Handle ERC-4626 Deposit events
        if (log.topics[0] === erc4626.events.Deposit.topic) {
          await processVaultDeposit(
            ctx,
            log,
            block.header,
            protocols,
            pools,
            snapshots,
            vaultEvents
          );
        }

        // Handle ERC-4626 Withdraw events
        if (log.topics[0] === erc4626.events.Withdraw.topic) {
          await processVaultWithdraw(
            ctx,
            log,
            block.header,
            protocols,
            pools,
            snapshots,
            vaultEvents
          );
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

async function ensureProtocols(
  ctx: any,
  protocols: Map<string, Protocol>
): Promise<void> {
  const protocolDefs = [
    { id: "aave_v3", displayName: "Aave V3", riskScore: 0.0, poolAbiType: "aave_v3" },
    { id: "compound_v3", displayName: "Compound V3", riskScore: 0.0, poolAbiType: "compound_v3" },
    { id: "radiant_v2", displayName: "Radiant V2", riskScore: 0.05, poolAbiType: "aave_v3" },
    { id: "morpho", displayName: "Morpho", riskScore: 0.05, poolAbiType: "erc4626" },
    { id: "yearn_v3", displayName: "Yearn V3", riskScore: 0.05, poolAbiType: "erc4626" },
    { id: "unknown", displayName: "Unknown Protocol", riskScore: 0.15, poolAbiType: "erc4626" },
  ];

  for (const def of protocolDefs) {
    let protocol = await ctx.store.get(Protocol, def.id);
    if (!protocol) {
      protocol = new Protocol({
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

async function processReserveDataUpdated(
  ctx: any,
  log: Log,
  block: BlockHeader,
  protocols: Map<string, Protocol>,
  pools: Map<string, Pool>,
  snapshots: Map<string, ApySnapshot>,
  rateUpdates: Map<string, RateUpdate>
): Promise<void> {
  const decoded = aaveV3.events.ReserveDataUpdated.decode(log);
  const reserveAddress = decoded.reserve.toLowerCase();
  const logAddress = log.address.toLowerCase();

  // Check if this is a stablecoin we care about
  const stablecoinSymbol = config.stablecoins.get(reserveAddress);
  if (!stablecoinSymbol) {
    return; // Not a stablecoin we track
  }

  // Determine protocol
  const protocolId =
    logAddress === config.protocols.aaveV3.pool ? "aave_v3" : "radiant_v2";
  const protocol = protocols.get(protocolId)!;

  // Calculate APY from liquidity rate
  const supplyApy = rayRateToApy(decoded.liquidityRate);

  // Get or create pool
  const pId = poolId(config.chainId, `${logAddress}:${reserveAddress}`);
  let pool = pools.get(pId) || (await ctx.store.get(Pool, pId));

  if (!pool) {
    pool = new Pool({
      id: pId,
      chainId: config.chainId,
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
  const rId = `${config.chainId}:${block.height}:${log.logIndex}`;
  const txHash = log.transaction?.hash || `block-${block.height}`;
  const rateUpdate = new RateUpdate({
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
  const sId = snapshotId(config.chainId, pId, block.height);
  const snapshot = new ApySnapshot({
    id: sId,
    pool,
    timestamp: new Date(block.timestamp),
    blockNumber: block.height,
    apy: supplyApy,
    rawRate: decoded.liquidityRate,
  });
  snapshots.set(sId, snapshot);

  ctx.log.info(
    `📊 ${protocol.displayName} ${stablecoinSymbol}: ${supplyApy.toFixed(2)}% APY @ block ${block.height}`
  );
}

async function processVaultDeposit(
  ctx: any,
  log: Log,
  block: BlockHeader,
  protocols: Map<string, Protocol>,
  pools: Map<string, Pool>,
  snapshots: Map<string, ApySnapshot>,
  vaultEvents: Map<string, VaultEvent>
): Promise<void> {
  const vaultAddress = log.address.toLowerCase();
  const decoded = erc4626.events.Deposit.decode(log);

  // Get or create vault pool
  const pId = poolId(config.chainId, vaultAddress);
  let pool = pools.get(pId) || (await ctx.store.get(Pool, pId));

  if (!pool) {
    // New vault discovered - create pool
    const protocol = protocols.get("unknown")!; // Will update later if we know the protocol
    pool = new Pool({
      id: pId,
      chainId: config.chainId,
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
  const eId = `${config.chainId}:${block.height}:${log.logIndex}`;
  const txHashDeposit = log.transaction?.hash || `block-${block.height}`;
  const vaultEvent = new VaultEvent({
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

async function processVaultWithdraw(
  ctx: any,
  log: Log,
  block: BlockHeader,
  protocols: Map<string, Protocol>,
  pools: Map<string, Pool>,
  snapshots: Map<string, ApySnapshot>,
  vaultEvents: Map<string, VaultEvent>
): Promise<void> {
  const vaultAddress = log.address.toLowerCase();
  const decoded = erc4626.events.Withdraw.decode(log);

  // Get or create vault pool
  const pId = poolId(config.chainId, vaultAddress);
  let pool = pools.get(pId) || (await ctx.store.get(Pool, pId));

  if (!pool) {
    // New vault discovered - create pool
    const protocol = protocols.get("unknown")!;
    pool = new Pool({
      id: pId,
      chainId: config.chainId,
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
  const wId = `${config.chainId}:${block.height}:${log.logIndex}`;
  const txHashWithdraw = log.transaction?.hash || `block-${block.height}`;
  const vaultEvent = new VaultEvent({
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

