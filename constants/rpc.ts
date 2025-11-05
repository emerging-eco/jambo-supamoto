import { CHAIN_NETWORK_TYPE } from 'types/chain';

/**
 * Blockchain RPC endpoint URLs for different networks
 * Based on the reference implementation pattern from temp-jambo-reference/constants/common.ts
 */
export const CHAIN_RPC_URLS: Record<string, string> = {
  mainnet: 'https://impacthub.ixo.world/rpc/',
  testnet: 'https://testnet.ixo.earth/rpc/',
  devnet: 'https://devnet.ixo.earth/rpc/',
  local: 'http://localhost:26657',
};

/**
 * Get the RPC URL for a specific chain network
 * @param chainNetwork - The chain network type (mainnet, testnet, devnet, local)
 * @returns The RPC URL for the specified network, defaults to devnet if not found
 */
export const getChainRpcUrl = (chainNetwork?: CHAIN_NETWORK_TYPE | string): string => {
  if (!chainNetwork) return CHAIN_RPC_URLS.devnet;
  return CHAIN_RPC_URLS[chainNetwork] || CHAIN_RPC_URLS.devnet;
};

/**
 * Default RPC URL (devnet)
 * Can be overridden by environment variable for testing purposes
 */
export const DEFAULT_CHAIN_RPC_URL = process.env.NEXT_PUBLIC_CHAIN_RPC_URL || CHAIN_RPC_URLS.devnet;
