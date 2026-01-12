import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Pool} from "./pool.model"

@Entity_()
export class VaultEvent {
    constructor(props?: Partial<VaultEvent>) {
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

    @StringColumn_({nullable: false})
    eventType!: string

    @Index_()
    @StringColumn_({nullable: false})
    sender!: string

    @Index_()
    @StringColumn_({nullable: false})
    owner!: string

    @BigIntColumn_({nullable: false})
    assets!: bigint

    @BigIntColumn_({nullable: false})
    shares!: bigint

    @BigIntColumn_({nullable: true})
    pricePerShare!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    totalAssets!: bigint | undefined | null
}
