import { Pool } from "./pool.model";
export declare class PoolMetrics {
    constructor(props?: Partial<PoolMetrics>);
    id: string;
    pool: Pool;
    avgApy1h: number | undefined | null;
    avgApy24h: number | undefined | null;
    avgApy7d: number | undefined | null;
    avgApy30d: number | undefined | null;
    stabilityScore: number | undefined | null;
    cv1h: number | undefined | null;
    cv6h: number | undefined | null;
    cv24h: number | undefined | null;
    cvWeighted: number | undefined | null;
    updatedAt: Date;
}
//# sourceMappingURL=poolMetrics.model.d.ts.map