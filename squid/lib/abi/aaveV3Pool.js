"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.events = void 0;
const ethers = __importStar(require("ethers"));
// Aave V3 Pool event signatures
exports.events = {
    // ReserveDataUpdated event
    ReserveDataUpdated: {
        topic: "0x804c9b842b2748a22bb64b345453a3de7ca54a6ca45ce00d415894979e22897a",
        decode(data) {
            const iface = new ethers.Interface([
                "event ReserveDataUpdated(address indexed reserve, uint256 liquidityRate, uint256 stableBorrowRate, uint256 variableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex)",
            ]);
            const decoded = iface.parseLog({ topics: data.topics, data: data.data });
            return {
                reserve: decoded.args[0],
                liquidityRate: decoded.args[1],
                stableBorrowRate: decoded.args[2],
                variableBorrowRate: decoded.args[3],
                liquidityIndex: decoded.args[4],
                variableBorrowIndex: decoded.args[5],
            };
        },
    },
    // Supply event
    Supply: {
        topic: "0x2b627736bca15cd5381dcf80b0bf11fd197d01a037c52b927a881a10fb73ba61",
        decode(data) {
            const iface = new ethers.Interface([
                "event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)",
            ]);
            const decoded = iface.parseLog({ topics: data.topics, data: data.data });
            return {
                reserve: decoded.args[0],
                user: decoded.args[1],
                onBehalfOf: decoded.args[2],
                amount: decoded.args[3],
                referralCode: decoded.args[4],
            };
        },
    },
    // Withdraw event
    Withdraw: {
        topic: "0x3115d1449a7b732c986cba18244e897a450f61e1bb8d589cd2e69e6c8924f9f7",
        decode(data) {
            const iface = new ethers.Interface([
                "event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)",
            ]);
            const decoded = iface.parseLog({ topics: data.topics, data: data.data });
            return {
                reserve: decoded.args[0],
                user: decoded.args[1],
                to: decoded.args[2],
                amount: decoded.args[3],
            };
        },
    },
};
//# sourceMappingURL=aaveV3Pool.js.map