import * as ethers from "ethers";

// Aave V3 Pool event signatures
export const events = {
  // ReserveDataUpdated event
  ReserveDataUpdated: {
    topic: "0x804c9b842b2748a22bb64b345453a3de7ca54a6ca45ce00d415894979e22897a",
    decode(data: { topics: string[]; data: string }) {
      const iface = new ethers.Interface([
        "event ReserveDataUpdated(address indexed reserve, uint256 liquidityRate, uint256 stableBorrowRate, uint256 variableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex)",
      ]);
      const decoded = iface.parseLog({ topics: data.topics, data: data.data });
      return {
        reserve: decoded!.args[0] as string,
        liquidityRate: decoded!.args[1] as bigint,
        stableBorrowRate: decoded!.args[2] as bigint,
        variableBorrowRate: decoded!.args[3] as bigint,
        liquidityIndex: decoded!.args[4] as bigint,
        variableBorrowIndex: decoded!.args[5] as bigint,
      };
    },
  },

  // Supply event
  Supply: {
    topic: "0x2b627736bca15cd5381dcf80b0bf11fd197d01a037c52b927a881a10fb73ba61",
    decode(data: { topics: string[]; data: string }) {
      const iface = new ethers.Interface([
        "event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)",
      ]);
      const decoded = iface.parseLog({ topics: data.topics, data: data.data });
      return {
        reserve: decoded!.args[0] as string,
        user: decoded!.args[1] as string,
        onBehalfOf: decoded!.args[2] as string,
        amount: decoded!.args[3] as bigint,
        referralCode: decoded!.args[4] as number,
      };
    },
  },

  // Withdraw event
  Withdraw: {
    topic: "0x3115d1449a7b732c986cba18244e897a450f61e1bb8d589cd2e69e6c8924f9f7",
    decode(data: { topics: string[]; data: string }) {
      const iface = new ethers.Interface([
        "event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)",
      ]);
      const decoded = iface.parseLog({ topics: data.topics, data: data.data });
      return {
        reserve: decoded!.args[0] as string,
        user: decoded!.args[1] as string,
        to: decoded!.args[2] as string,
        amount: decoded!.args[3] as bigint,
      };
    },
  },
};
