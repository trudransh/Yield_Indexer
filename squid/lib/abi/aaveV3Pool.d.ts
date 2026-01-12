export declare const events: {
    ReserveDataUpdated: {
        topic: string;
        decode(data: {
            topics: string[];
            data: string;
        }): {
            reserve: string;
            liquidityRate: bigint;
            stableBorrowRate: bigint;
            variableBorrowRate: bigint;
            liquidityIndex: bigint;
            variableBorrowIndex: bigint;
        };
    };
    Supply: {
        topic: string;
        decode(data: {
            topics: string[];
            data: string;
        }): {
            reserve: string;
            user: string;
            onBehalfOf: string;
            amount: bigint;
            referralCode: number;
        };
    };
    Withdraw: {
        topic: string;
        decode(data: {
            topics: string[];
            data: string;
        }): {
            reserve: string;
            user: string;
            to: string;
            amount: bigint;
        };
    };
};
//# sourceMappingURL=aaveV3Pool.d.ts.map