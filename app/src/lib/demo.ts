import { Keypair } from "@solana/web3.js";
import type { Wallet } from "@anchor-lang/core";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

/**
 * Демо-роли: локальные ключи для показа на одном ноутбуке (localnet/devnet).
 * Хранятся только в этом браузере. Не используйте для реальных денег.
 */
export type RoleId = "donor" | "spender" | "canteen" | "books" | "transit" | "arcade";

export interface Role {
  id: RoleId;
  title: string;
  hint: string;
  canSign: boolean;
}

export const ROLES: Role[] = [
  { id: "donor", title: "Мама", hint: "владелец кошелька: кладёт деньги и задаёт правила", canSign: true },
  { id: "spender", title: "Дана", hint: "студентка: тратит по правилам", canSign: true },
  { id: "canteen", title: "Столовая «Дастархан»", hint: "получатель: еда", canSign: false },
  { id: "books", title: "Книжный «Страница»", hint: "получатель: учёба", canSign: false },
  { id: "transit", title: "Городской транспорт", hint: "получатель: проезд", canSign: false },
  { id: "arcade", title: "Игровой клуб «Level Up»", hint: "не в списке: на него тратить нельзя", canSign: false },
];

const KEY = "arna.demo.keys.v1";

function safeGet(): Record<string, number[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

let memory: Record<string, number[]> = safeGet();

export function demoKey(id: RoleId): Keypair {
  if (!memory[id]) {
    memory[id] = Array.from(Keypair.generate().secretKey);
    try {
      localStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
      /* приватный режим: ключи живут до перезагрузки */
    }
  }
  return Keypair.fromSecretKey(Uint8Array.from(memory[id]));
}

export function resetDemoKeys() {
  memory = {};
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem("arna.demo.wallet.v1");
  } catch {
    /* ignore */
  }
}

export function rememberDemoWallet(addr: string | null) {
  try {
    if (addr) localStorage.setItem("arna.demo.wallet.v1", addr);
    else localStorage.removeItem("arna.demo.wallet.v1");
  } catch {
    /* ignore */
  }
}

export function demoWallet(): string | null {
  try {
    return localStorage.getItem("arna.demo.wallet.v1");
  } catch {
    return null;
  }
}

export function keypairWallet(kp: Keypair): Wallet {
  const sign = <T extends Transaction | VersionedTransaction>(tx: T): T => {
    if ("version" in tx) (tx as VersionedTransaction).sign([kp]);
    else (tx as Transaction).partialSign(kp);
    return tx;
  };
  return {
    publicKey: kp.publicKey,
    payer: kp,
    signTransaction: async (tx) => sign(tx),
    signAllTransactions: async (txs) => txs.map(sign),
  };
}
