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
exports.RateUpdate = void 0;
const typeorm_store_1 = require("@subsquid/typeorm-store");
const pool_model_1 = require("./pool.model");
let RateUpdate = class RateUpdate {
    constructor(props) {
        Object.assign(this, props);
    }
    id;
    pool;
    timestamp;
    blockNumber;
    txHash;
    logIndex;
    liquidityRate;
    variableBorrowRate;
    stableBorrowRate;
    utilizationRate;
    supplyApy;
};
exports.RateUpdate = RateUpdate;
__decorate([
    (0, typeorm_store_1.PrimaryColumn)(),
    __metadata("design:type", String)
], RateUpdate.prototype, "id", void 0);
__decorate([
    (0, typeorm_store_1.Index)(),
    (0, typeorm_store_1.ManyToOne)(() => pool_model_1.Pool, { nullable: true }),
    __metadata("design:type", pool_model_1.Pool)
], RateUpdate.prototype, "pool", void 0);
__decorate([
    (0, typeorm_store_1.Index)(),
    (0, typeorm_store_1.DateTimeColumn)({ nullable: false }),
    __metadata("design:type", Date)
], RateUpdate.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_store_1.Index)(),
    (0, typeorm_store_1.IntColumn)({ nullable: false }),
    __metadata("design:type", Number)
], RateUpdate.prototype, "blockNumber", void 0);
__decorate([
    (0, typeorm_store_1.Index)(),
    (0, typeorm_store_1.StringColumn)({ nullable: false }),
    __metadata("design:type", String)
], RateUpdate.prototype, "txHash", void 0);
__decorate([
    (0, typeorm_store_1.IntColumn)({ nullable: false }),
    __metadata("design:type", Number)
], RateUpdate.prototype, "logIndex", void 0);
__decorate([
    (0, typeorm_store_1.BigIntColumn)({ nullable: true }),
    __metadata("design:type", Object)
], RateUpdate.prototype, "liquidityRate", void 0);
__decorate([
    (0, typeorm_store_1.BigIntColumn)({ nullable: true }),
    __metadata("design:type", Object)
], RateUpdate.prototype, "variableBorrowRate", void 0);
__decorate([
    (0, typeorm_store_1.BigIntColumn)({ nullable: true }),
    __metadata("design:type", Object)
], RateUpdate.prototype, "stableBorrowRate", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], RateUpdate.prototype, "utilizationRate", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: false }),
    __metadata("design:type", Number)
], RateUpdate.prototype, "supplyApy", void 0);
exports.RateUpdate = RateUpdate = __decorate([
    (0, typeorm_store_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], RateUpdate);
//# sourceMappingURL=rateUpdate.model.js.map