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
exports.Protocol = void 0;
const typeorm_store_1 = require("@subsquid/typeorm-store");
const pool_model_1 = require("./pool.model");
let Protocol = class Protocol {
    constructor(props) {
        Object.assign(this, props);
    }
    id;
    displayName;
    riskScore;
    poolAbiType;
    createdAt;
    pools;
};
exports.Protocol = Protocol;
__decorate([
    (0, typeorm_store_1.PrimaryColumn)(),
    __metadata("design:type", String)
], Protocol.prototype, "id", void 0);
__decorate([
    (0, typeorm_store_1.StringColumn)({ nullable: false }),
    __metadata("design:type", String)
], Protocol.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_store_1.FloatColumn)({ nullable: false }),
    __metadata("design:type", Number)
], Protocol.prototype, "riskScore", void 0);
__decorate([
    (0, typeorm_store_1.StringColumn)({ nullable: false }),
    __metadata("design:type", String)
], Protocol.prototype, "poolAbiType", void 0);
__decorate([
    (0, typeorm_store_1.DateTimeColumn)({ nullable: false }),
    __metadata("design:type", Date)
], Protocol.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_store_1.OneToMany)(() => pool_model_1.Pool, e => e.protocol),
    __metadata("design:type", Array)
], Protocol.prototype, "pools", void 0);
exports.Protocol = Protocol = __decorate([
    (0, typeorm_store_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Protocol);
//# sourceMappingURL=protocol.model.js.map