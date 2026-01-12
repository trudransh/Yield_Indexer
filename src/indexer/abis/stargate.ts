/**
 * Stargate LP Pool ABI
 * 
 * Stargate uses a different interface for their liquidity pools
 */

export const stargatePoolAbi = [
  {
    name: "totalLiquidity",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "token",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "convertRate",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "amountLPtoLD",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_amountLP", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

