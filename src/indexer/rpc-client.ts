import { createPublicClient, http, type PublicClient } from "viem";
import { arbitrum } from "viem/chains";
import { config } from "../config.js";

// Singleton RPC client
let client: PublicClient | null = null;

export function getArbitrumClient(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: arbitrum,
      transport: http(config.arbitrumRpcUrl),
      batch: {
        multicall: true,
      },
    });
  }
  return client;
}

export default getArbitrumClient;

