import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, FloatColumn as FloatColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Pool} from "./pool.model"

@Entity_()
export class ApySnapshot {
    constructor(props?: Partial<ApySnapshot>) {
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

    @FloatColumn_({nullable: false})
    apy!: number

    @BigIntColumn_({nullable: true})
    tvl!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    rawRate!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    pricePerShare!: bigint | undefined | null
}
