# Yield Indexer

Hybrid APY indexer for stablecoin lending pools and ERC-4626 vaults on Arbitrum.

## Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                     YIELD INDEXER (Subsquid + Poller)                     │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐   │
│  │   SUBSQUID PROCESSOR        │    │   POLLER                        │   │
│  │   (Historical + Events)     │    │   (Real-time current APY)       │   │
│  │                             │    │                                 │   │
│  │  • Aave: ReserveDataUpdated │    │  • Hourly RPC reads             │   │
│  │  • ERC4626: Deposit/Withdraw│    │  • Current APY snapshot         │   │
│  │  • Backfill from block 0    │    │  • Stability score (σ)          │   │
│  └──────────────┬──────────────┘    └───────────────┬─────────────────┘   │
│                 │                                   │                     │
│                 └─────────────┬─────────────────────┘                     │
│                               ▼                                           │
│                      ┌──────────────────┐                                 │
│                      │   PostgreSQL     │                                 │
│                      │                  │                                 │
│                      │  • pools         │                                 │
│                      │  • apy_snapshots │◀── Both write here              │
│                      │  • pool_metrics  │                                 │
│                      └──────────────────┘                                 │
│                               │                                           │
│                               ▼                                           │
│                      ┌──────────────────┐                                 │
│                      │  GraphQL API     │  (Subsquid)                     │
│                      │  localhost:4350  │                                 │
│                      └──────────────────┘                                 │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Description | Port |
|-----------|-------------|------|
| **Subsquid Processor** | Indexes on-chain events (ReserveDataUpdated, Deposit, Withdraw) | - |
| **Subsquid GraphQL API** | Query historical APY data | 4350 |
| **Poller** | Hourly RPC reads for real-time APY | - |
| **PostgreSQL** | Stores all yield data | 5432 |

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Copy env file and configure
cp env.example .env
cp squid/env.example squid/.env

# Edit .env with your RPC URL
# RPC_ARBITRUM_HTTP=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Start everything
make build
make up

# View logs
make logs
```

### Option 2: Local Development

```bash
# 1. Install dependencies
npm install
cd squid && npm install && cd ..

# 2. Setup database
npm run db:generate
npm run db:migrate
npx tsx src/db/seed.ts

# 3. Generate Subsquid models
cd squid
npm run codegen
npm run migration:generate
npm run migration:apply
cd ..

# 4. Run services
# Terminal 1: Poller
npm run dev

# Terminal 2: Subsquid processor
cd squid && npm run process

# Terminal 3: Subsquid GraphQL API
cd squid && npm run serve
```

## Events Indexed

### Aave V3 / Radiant V2

```
ReserveDataUpdated(
  address reserve,
  uint256 liquidityRate,    ← Supply APY (in RAY)
  uint256 stableBorrowRate,
  uint256 variableBorrowRate,
  uint256 liquidityIndex,
  uint256 variableBorrowIndex
)
```

### ERC-4626 Vaults

```
Deposit(
  address sender,
  address owner,
  uint256 assets,
  uint256 shares  ← Used to calculate price-per-share
)

Withdraw(
  address sender,
  address receiver,
  address owner,
  uint256 assets,
  uint256 shares
)
```

## GraphQL API

Query historical APY data at `http://localhost:4350/graphql`:

```graphql
# Get all pools
query {
  pools(orderBy: currentApy_DESC) {
    id
    name
    underlyingSymbol
    currentApy
    protocol {
      displayName
      riskScore
    }
  }
}

# Get APY history for a pool
query {
  apySnapshots(
    where: { pool: { id_eq: "42161:0x794a..." } }
    orderBy: timestamp_DESC
    limit: 100
  ) {
    timestamp
    apy
    blockNumber
  }
}

# Get rate updates
query {
  rateUpdates(
    where: { pool: { underlyingSymbol_eq: "USDC" } }
    orderBy: timestamp_DESC
    limit: 50
  ) {
    timestamp
    supplyApy
    pool {
      name
    }
  }
}
```

## Stability Score (σ)

From the NAM equation:

```
σ = 1 − min(CV_weighted, 0.5)

CV_weighted = 0.50×CV₁ₕ + 0.30×CV₆ₕ + 0.20×CV₂₄ₕ

CV = StdDev(APY) / Mean(APY)
```

## APY Calculation (Yearn Logarithmic Method)

We use Yearn Finance's logarithmic formula for accurate continuous compounding:

```
APY = e^(ln(price_ratio) × annualization_factor) - 1

Where:
- price_ratio = current_pps / previous_pps
- annualization_factor = seconds_per_year / elapsed_seconds
```

### Why Logarithms?

The naive approach `APY = (price_ratio)^(365/days) - 1` has issues:
- **Explodes with short sample periods** (unrealistic APY values)
- **Mathematical instability** with negative or near-zero growth

The logarithmic formula handles continuous compounding correctly:

```typescript
// From src/indexer/apy-calculator.ts
function calculateApyFromPPS(currentPPS, previousPPS, elapsedSeconds) {
  const SECONDS_PER_YEAR = 31_536_000;
  
  // Log of the growth ratio
  const priceRatio = currentPPS / previousPPS;
  const logGrowth = Math.log(priceRatio);
  
  // Annualize it
  const annualizedLogGrowth = logGrowth * (SECONDS_PER_YEAR / elapsedSeconds);
  
  // Convert back from log space
  const apy = (Math.exp(annualizedLogGrowth) - 1) * 100;
  
  return apy;
}
```

### Example

If a vault's PPS grows from 1.0 to 1.01 over 24 hours:
- **Naive formula**: `(1.01)^365 - 1 = 3678%` ❌ (compounds daily, not continuous)
- **Logarithmic formula**: `e^(ln(1.01) × 365) - 1 = 3778%` ✅ (continuous compounding)

For smaller growth rates (typical 5-20% APY), both formulas give similar results. The difference becomes significant with:
- High yields (>50% APY)
- Short sample periods (<24 hours)
- High-frequency compounding protocols

## Adjusted APY (for NAM decisions)

```
Adjusted APY = APY × σ × (1 − R)

Where:
- APY = Current APY (calculated using Yearn's logarithmic method)
- σ = Stability score (0.5 to 1.0)
- R = Protocol risk score (0.0 to 0.3)
```

## Make Commands

```bash
make help           # Show all commands
make build          # Build all containers
make up             # Start all services
make down           # Stop all services
make logs           # View all logs
make squid-logs     # View squid processor logs
make poller-logs    # View poller logs
make db-shell       # Open PostgreSQL shell
make squid-codegen  # Generate squid models
make reset          # Reset everything (deletes data!)
```

## Project Structure

```
yield_indexer/
├── squid/                          # Subsquid indexer
│   ├── src/
│   │   ├── main.ts                 # Entry point
│   │   ├── processor.arbitrum.ts   # Arbitrum event processor
│   │   ├── config.ts               # Chain config
│   │   ├── abi/                    # Contract ABIs
│   │   │   ├── aaveV3Pool.ts
│   │   │   └── erc4626.ts
│   │   └── model/                  # Auto-generated models
│   ├── schema.graphql              # Data model
│   ├── Dockerfile
│   └── squid.yaml
│
├── src/                            # Poller service
│   ├── index.ts                    # Entry point + scheduler
│   ├── config.ts                   # Config
│   ├── discovery/                  # vaults.fyi discovery
│   ├── indexer/                    # RPC polling
│   │   ├── apy-calculator.ts       # Yearn-style APY calculation
│   │   ├── erc4626.ts              # ERC-4626 vault handler
│   │   ├── lending.ts              # Aave/Compound handlers
│   │   ├── protocols.ts            # Protocol-specific handlers
│   │   └── abis/                   # Contract ABIs
│   └── metrics/                    # Stability score
│
├── prisma/
│   └── schema.prisma               # Database schema
│
├── docker-compose.yml              # Full stack
├── Dockerfile.poller               # Poller container
├── Makefile                        # Commands
└── README.md
```

## Supported Protocols

| Protocol | Type | Events Indexed |
|----------|------|----------------|
| Aave V3 | Lending | ReserveDataUpdated |
| Radiant V2 | Lending | ReserveDataUpdated |
| Compound V3 | Lending | (via poller) |
| ERC-4626 Vaults | Vault | Deposit, Withdraw |
