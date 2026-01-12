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
exports.PoolMetrics = void 0;
const typeorm_store_1 = require("@subsquid/typeorm-store");
const pool_model_1 = require("./pool.model");
let PoolMetrics = class PoolMetrics {
    constructor(props) {
        Object.assign(this, props);
    }
    id;
    pool;
    avgApy1h;
    avgApy24h;
    avgApy7d;
    avgApy30d;
    stabilityScore;
    cv1h;
    cv6h;
    cv24h;
    cvWeighted;
    updatedAt;
};
exports.PoolMetrics = PoolMetrics;
__decorate([
    (0, typeorm_store_1.PrimaryColumn)(),
    __metadata("design:type", String)
], PoolMetrics.prototype, "id", void 0);
__decorate([
    (0, typeorm_store_1.Index)({ unique: true }),
    (0, typeorm_store_1.OneToOne)(() => pool_model_1.Pool, { nullable: true }),
    (0, typeorm_store_1.JoinColumn)(),
    __metadata("design:type", pool_model_1.Pool)
], PoolMetrics.prototype, "pool", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "avgApy1h", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "avgApy24h", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "avgApy7d", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "avgApy30d", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "stabilityScore", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "cv1h", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "cv6h", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "cv24h", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: true }),
    __metadata("design:type", Object)
], PoolMetrics.prototype, "cvWeighted", void 0);
__decorate([
    (0, typeorm_store_1.DateTimeColumn)({ nullable: false }),
    __metadata("design:type", Date)
], PoolMetrics.prototype, "updatedAt", void 0);
exports.PoolMetrics = PoolMetrics = __decorate([
    (0, typeorm_store_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], PoolMetrics);
//# sourceMappingURL=poolMetrics.model.js.map