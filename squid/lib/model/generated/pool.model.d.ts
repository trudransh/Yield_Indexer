import { Protocol } from "./protocol.model";
import { ApySnapshot } from "./apySnapshot.model";
import { RateUpdate } from "./rateUpdate.model";
export declare class Pool {
    constructor(props?: Partial<Pool>);
    id: string;
    chainId: number;
    protocol: Protocol;
    contractAddress: string;
    name: string;
    underlyingToken: string;
    underlyingSymbol: string;
    poolType: string;
    currentApy: number | undefined | null;
    currentTvl: bigint | undefined | null;
    lastUpdatedAt: Date | undefined | null;
    lastPricePerShare: bigint | undefined | null;
    discoveredVia: string | undefined | null;
    isActive: boolean;
    createdAt: Date;
    apySnapshots: ApySnapshot[];
    rateUpdates: RateUpdate[];
}
//# sourceMappingURL=pool.model.d.ts.map