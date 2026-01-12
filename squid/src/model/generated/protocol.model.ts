import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, FloatColumn as FloatColumn_, DateTimeColumn as DateTimeColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Pool} from "./pool.model"

@Entity_()
export class Protocol {
    constructor(props?: Partial<Protocol>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    displayName!: string

    @FloatColumn_({nullable: false})
    riskScore!: number

    @StringColumn_({nullable: false})
    poolAbiType!: string

    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @OneToMany_(() => Pool, e => e.protocol)
    pools!: Pool[]
}
