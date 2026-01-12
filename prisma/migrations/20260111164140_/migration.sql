-- CreateTable
CREATE TABLE "protocols" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "risk_score" DECIMAL(3,2) NOT NULL DEFAULT 0.05,
    "pool_abi_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" SERIAL NOT NULL,
    "protocol_id" INTEGER NOT NULL,
    "contract_address" VARCHAR(66) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "underlying_token" VARCHAR(66) NOT NULL,
    "underlying_symbol" VARCHAR(20) NOT NULL,
    "pool_type" VARCHAR(50) NOT NULL,
    "current_apy" DECIMAL(10,4),
    "current_tvl" DECIMAL(20,2),
    "last_indexed_at" TIMESTAMP(3),
    "last_price_per_share" DECIMAL(38,18),
    "last_pps_timestamp" TIMESTAMP(3),
    "discovered_via" VARCHAR(50),
    "defillama_pool_id" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apy_snapshots" (
    "id" SERIAL NOT NULL,
    "pool_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "apy" DECIMAL(10,4) NOT NULL,
    "tvl" DECIMAL(20,2),
    "raw_rate" DECIMAL(38,0),

    CONSTRAINT "apy_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_metrics" (
    "pool_id" INTEGER NOT NULL,
    "avg_apy_1h" DECIMAL(10,4),
    "avg_apy_24h" DECIMAL(10,4),
    "avg_apy_7d" DECIMAL(10,4),
    "stability_score" DECIMAL(5,4),
    "cv_1h" DECIMAL(10,4),
    "cv_6h" DECIMAL(10,4),
    "cv_24h" DECIMAL(10,4),
    "cv_weighted" DECIMAL(10,4),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pool_metrics_pkey" PRIMARY KEY ("pool_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "protocols_name_key" ON "protocols"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pools_contract_address_key" ON "pools"("contract_address");

-- CreateIndex
CREATE INDEX "apy_snapshots_pool_id_timestamp_idx" ON "apy_snapshots"("pool_id", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "apy_snapshots_pool_id_timestamp_key" ON "apy_snapshots"("pool_id", "timestamp");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apy_snapshots" ADD CONSTRAINT "apy_snapshots_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_metrics" ADD CONSTRAINT "pool_metrics_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
