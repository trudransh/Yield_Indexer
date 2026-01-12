import { Pool } from "./pool.model";
export declare class ApySnapshot {
    constructor(props?: Partial<ApySnapshot>);
    id: string;
    pool: Pool;
    timestamp: Date;
    blockNumber: number;
    apy: number;
    tvl: bigint | undefined | null;
    rawRate: bigint | undefined | null;
    pricePerShare: bigint | undefined | null;
}
//# sourceMappingURL=apySnapshot.model.d.ts.map