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
// ERC-4626 Vault event signatures
exports.events = {
    // Deposit event
    Deposit: {
        topic: "0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7",
        decode(data) {
            const iface = new ethers.Interface([
                "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
            ]);
            const decoded = iface.parseLog({ topics: data.topics, data: data.data });
            return {
                sender: decoded.args[0],
                owner: decoded.args[1],
                assets: decoded.args[2],
                shares: decoded.args[3],
            };
        },
    },
    // Withdraw event
    Withdraw: {
        topic: "0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db",
        decode(data) {
            const iface = new ethers.Interface([
                "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
            ]);
            const decoded = iface.parseLog({ topics: data.topics, data: data.data });
            return {
                sender: decoded.args[0],
                receiver: decoded.args[1],
                owner: decoded.args[2],
                assets: decoded.args[3],
                shares: decoded.args[4],
            };
        },
    },
    // Transfer event
    Transfer: {
        topic: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        decode(data) {
            const iface = new ethers.Interface([
                "event Transfer(address indexed from, address indexed to, uint256 value)",
            ]);
            const decoded = iface.parseLog({ topics: data.topics, data: data.data });
            return {
                from: decoded.args[0],
                to: decoded.args[1],
                value: decoded.args[2],
            };
        },
    },
};
//# sourceMappingURL=erc4626.js.map