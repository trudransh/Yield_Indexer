export declare const config: {
    readonly chainId: number;
    readonly chainName: "arbitrum";
    readonly rpcUrl: string;
    readonly fromBlock: number;
    readonly protocols: {
        readonly aaveV3: {
            readonly pool: string;
            readonly poolDataProvider: string;
        };
        readonly compoundV3: {
            readonly cometUsdc: string;
        };
        readonly radiantV2: {
            readonly pool: string;
        };
    };
    readonly stablecoins: Map<string, string>;
};
export declare const RAY: bigint;
export declare function rayRateToApy(rayRate: bigint): number;
export declare function poolId(chainId: number, address: string): string;
export declare function snapshotId(chainId: number, address: string, blockNumber: number): string;
export declare function eventId(chainId: number, txHash: string, logIndex: number): string;
//# sourceMappingURL=config.d.ts.map