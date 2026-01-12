import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, FloatColumn as FloatColumn_} from "@subsquid/typeorm-store"
import {Pool} from "./pool.model"

@Entity_()
export class RateUpdate {
    constructor(props?: Partial<RateUpdate>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Pool, {nullable: true})
    pool!: Pool

    @Index_()
    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string

    @IntColumn_({nullable: false})
    logIndex!: number

    @BigIntColumn_({nullable: true})
    liquidityRate!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    variableBorrowRate!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    stableBorrowRate!: bigint | undefined | null

    @FloatColumn_({nullable: true})
    utilizationRate!: number | undefined | null

    @FloatColumn_({nullable: false})
    supplyApy!: number
}
