import * as ethers from "ethers";

// ERC-4626 Vault event signatures
export const events = {
  // Deposit event
  Deposit: {
    topic: "0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7",
    decode(data: { topics: string[]; data: string }) {
      const iface = new ethers.Interface([
        "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
      ]);
      const decoded = iface.parseLog({ topics: data.topics, data: data.data });
      return {
        sender: decoded!.args[0] as string,
        owner: decoded!.args[1] as string,
        assets: decoded!.args[2] as bigint,
        shares: decoded!.args[3] as bigint,
      };
    },
  },

  // Withdraw event
  Withdraw: {
    topic: "0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db",
    decode(data: { topics: string[]; data: string }) {
      const iface = new ethers.Interface([
        "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
      ]);
      const decoded = iface.parseLog({ topics: data.topics, data: data.data });
      return {
        sender: decoded!.args[0] as string,
        receiver: decoded!.args[1] as string,
        owner: decoded!.args[2] as string,
        assets: decoded!.args[3] as bigint,
        shares: decoded!.args[4] as bigint,
      };
    },
  },

  // Transfer event
  Transfer: {
    topic: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    decode(data: { topics: string[]; data: string }) {
      const iface = new ethers.Interface([
        "event Transfer(address indexed from, address indexed to, uint256 value)",
      ]);
      const decoded = iface.parseLog({ topics: data.topics, data: data.data });
      return {
        from: decoded!.args[0] as string,
        to: decoded!.args[1] as string,
        value: decoded!.args[2] as bigint,
      };
    },
  },
};
