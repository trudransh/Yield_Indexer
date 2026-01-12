"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pool = void 0;
const typeorm_store_1 = require("@subsquid/typeorm-store");
const protocol_model_1 = require("./protocol.model");
const apySnapshot_model_1 = require("./apySnapshot.model");
const rateUpdate_model_1 = require("./rateUpdate.model");
let Pool = class Pool {
    constructor(props) {
        Object.assign(this, props);
    }
    id;
    chainId;
    protocol;
    contractAddress;
    name;
    underlyingToken;
    underlyingSymbol;
    poolType;
    currentApy;
    currentTvl;
    lastUpdatedAt;
    lastPricePerShare;
    discoveredVia;
    isActive;
    createdAt;
    apySnapshots;
    rateUpdates;
};
exports.Pool = Pool;
__decorate([
    (0, typeorm_store_1.PrimaryColumn)(),
    __metadata("design:type", String)
], Pool.prototype, "id", void 0);
__decorate([
    (0, typeorm_store_1.Index)(),
    (0, typeorm_store_1.IntColumn)({ nullable: false }),
    __metadata("design:type", Number)
], Pool.prototype, "chainId", void 0);
__decorate([
    (0, typeorm_store_1.Index)(),
    (0, typeorm_store_1.ManyToOne)(() => protocol_model_1.Protocol, { nullable: true }),
    __metadata("design:type", protocol_model_1.Protocol)
], Pool.prototype, "protocol", void 0);
__decorate([
    (0, typeorm_store_1.Index)(),
    (0, typeorm_store_1.StringColumn)({ nullable: false }),
    __metadata("design:type", String)
], Pool.prototype, "contractAddress", void 0);
__decorate([
    (0, typeorm_store_1.StringColumn)({ nullable: false }),
    __metadata("design:type", String)
], Pool.prototype, "name", void 0);
__decorate([
    (0, typeorm_store_1.StringColumn)({ nullable: false }),
    __metadata("design:type", String)
], Pool.prototype, "underlyingToken", void 0);
__decorate([
    (0, typeorm_store_1.Index)(),
    (0, typeorm_store_1.StringColumn)({ nullable: false }),
    __metadata("design:type", String)
], Pool.prototype, "underlyingSymbol", void 0);
__decorate([
    (0, typeorm_store_1.StringColumn)({ nullable: false }),
    __metadata("design:type", String)
], Pool.prototype, "poolType", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], Pool.prototype, "currentApy", void 0);
__decorate([
    (0, typeorm_store_1.BigIntColumn)({ nullable: true }),
    __metadata("design:type", Object)
], Pool.prototype, "currentTvl", void 0);
__decorate([
    (0, typeorm_store_1.DateTimeColumn)({ nullable: true }),
    __metadata("design:type", Object)
], Pool.prototype, "lastUpdatedAt", void 0);
__decorate([
    (0, typeorm_store_1.BigIntColumn)({ nullable: true }),
    __metadata("design:type", Object)
], Pool.prototype, "lastPricePerShare", void 0);
__decorate([
    (0, typeorm_store_1.StringColumn)({ nullable: true }),
    __metadata("design:type", Object)
], Pool.prototype, "discoveredVia", void 0);
__decorate([
    (0, typeorm_store_1.BooleanColumn)({ nullable: false }),
    __metadata("design:type", Boolean)
], Pool.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_store_1.DateTimeColumn)({ nullable: false }),
    __metadata("design:type", Date)
], Pool.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_store_1.OneToMany)(() => apySnapshot_model_1.ApySnapshot, e => e.pool),
    __metadata("design:type", Array)
], Pool.prototype, "apySnapshots", void 0);
__decorate([
    (0, typeorm_store_1.OneToMany)(() => rateUpdate_model_1.RateUpdate, e => e.pool),
    __metadata("design:type", Array)
], Pool.prototype, "rateUpdates", void 0);
exports.Pool = Pool = __decorate([
    (0, typeorm_store_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Pool);
//# sourceMappingURL=pool.model.js.map