import { PublicKey } from "@solana/web3.js";
import idl from "./idl/arna.json";

export const PROGRAM_ID = new PublicKey((idl as { address: string }).address);

export type NetworkId = "localnet" | "devnet";

export const NETWORKS: Record<NetworkId, { label: string; url: string; explorer: string }> = {
  localnet: {
    label: "Localnet",
    url: (import.meta.env.VITE_RPC_URL as string | undefined) ?? "http://127.0.0.1:8899",
    explorer: "custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899",
  },
  devnet: {
    label: "Devnet",
    url: "https://api.devnet.solana.com",
    explorer: "devnet",
  },
};

/** Тестовый токен приложения: «тестовый тенге», 2 знака после запятой. */
export const TOKEN_DECIMALS = 2;
export const TOKEN_SYMBOL = "₸";

export function explorerTx(sig: string, net: NetworkId) {
  return `https://explorer.solana.com/tx/${sig}?cluster=${NETWORKS[net].explorer}`;
}

export function explorerAddr(addr: string, net: NetworkId) {
  return `https://explorer.solana.com/address/${addr}?cluster=${NETWORKS[net].explorer}`;
}
