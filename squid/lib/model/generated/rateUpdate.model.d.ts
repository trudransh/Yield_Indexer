import { Pool } from "./pool.model";
export declare class RateUpdate {
    constructor(props?: Partial<RateUpdate>);
    id: string;
    pool: Pool;
    timestamp: Date;
    blockNumber: number;
    txHash: string;
    logIndex: number;
    liquidityRate: bigint | undefined | null;
    variableBorrowRate: bigint | undefined | null;
    stableBorrowRate: bigint | undefined | null;
    utilizationRate: number | undefined | null;
    supplyApy: number;
}
//# sourceMappingURL=rateUpdate.model.d.ts.map