export declare const events: {
    Deposit: {
        topic: string;
        decode(data: {
            topics: string[];
            data: string;
        }): {
            sender: string;
            owner: string;
            assets: bigint;
            shares: bigint;
        };
    };
    Withdraw: {
        topic: string;
        decode(data: {
            topics: string[];
            data: string;
        }): {
            sender: string;
            receiver: string;
            owner: string;
            assets: bigint;
            shares: bigint;
        };
    };
    Transfer: {
        topic: string;
        decode(data: {
            topics: string[];
            data: string;
        }): {
            from: string;
            to: string;
            value: bigint;
        };
    };
};
//# sourceMappingURL=erc4626.d.ts.map