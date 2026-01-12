import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToOne as OneToOne_, Index as Index_, JoinColumn as JoinColumn_, FloatColumn as FloatColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Pool} from "./pool.model"

@Entity_()
export class PoolMetrics {
    constructor(props?: Partial<PoolMetrics>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_({unique: true})
    @OneToOne_(() => Pool, {nullable: true})
    @JoinColumn_()
    pool!: Pool

    @FloatColumn_({nullable: true})
    avgApy1h!: number | undefined | null

    @FloatColumn_({nullable: true})
    avgApy24h!: number | undefined | null

    @FloatColumn_({nullable: true})
    avgApy7d!: number | undefined | null

    @FloatColumn_({nullable: true})
    avgApy30d!: number | undefined | null

    @FloatColumn_({nullable: true})
    stabilityScore!: number | undefined | null

    @FloatColumn_({nullable: true})
    cv1h!: number | undefined | null

    @FloatColumn_({nullable: true})
    cv6h!: number | undefined | null

    @FloatColumn_({nullable: true})
    cv24h!: number | undefined | null

    @FloatColumn_({nullable: true})
    cvWeighted!: number | undefined | null

    @DateTimeColumn_({nullable: false})
    updatedAt!: Date
}
