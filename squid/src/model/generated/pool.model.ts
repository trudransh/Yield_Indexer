import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, ManyToOne as ManyToOne_, StringColumn as StringColumn_, FloatColumn as FloatColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, BooleanColumn as BooleanColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Protocol} from "./protocol.model"
import {ApySnapshot} from "./apySnapshot.model"
import {RateUpdate} from "./rateUpdate.model"

@Entity_()
export class Pool {
    constructor(props?: Partial<Pool>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @IntColumn_({nullable: false})
    chainId!: number

    @Index_()
    @ManyToOne_(() => Protocol, {nullable: true})
    protocol!: Protocol

    @Index_()
    @StringColumn_({nullable: false})
    contractAddress!: string

    @StringColumn_({nullable: false})
    name!: string

    @StringColumn_({nullable: false})
    underlyingToken!: string

    @Index_()
    @StringColumn_({nullable: false})
    underlyingSymbol!: string

    @StringColumn_({nullable: false})
    poolType!: string

    @FloatColumn_({nullable: true})
    currentApy!: number | undefined | null

    @BigIntColumn_({nullable: true})
    currentTvl!: bigint | undefined | null

    @DateTimeColumn_({nullable: true})
    lastUpdatedAt!: Date | undefined | null

    @BigIntColumn_({nullable: true})
    lastPricePerShare!: bigint | undefined | null

    @StringColumn_({nullable: true})
    discoveredVia!: string | undefined | null

    @BooleanColumn_({nullable: false})
    isActive!: boolean

    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @OneToMany_(() => ApySnapshot, e => e.pool)
    apySnapshots!: ApySnapshot[]

    @OneToMany_(() => RateUpdate, e => e.pool)
    rateUpdates!: RateUpdate[]
}
