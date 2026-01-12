import { Pool } from "./pool.model";
export declare class VaultEvent {
    constructor(props?: Partial<VaultEvent>);
    id: string;
    pool: Pool;
    timestamp: Date;
    blockNumber: number;
    txHash: string;
    logIndex: number;
    eventType: string;
    sender: string;
    owner: string;
    assets: bigint;
    shares: bigint;
    pricePerShare: bigint | undefined | null;
    totalAssets: bigint | undefined | null;
}
//# sourceMappingURL=vaultEvent.model.d.ts.map