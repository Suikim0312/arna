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
  { id: "donor", title: "Ана", hint: "әмиян иесі: ақша салады және ереже белгілейді", canSign: true },
  { id: "spender", title: "Дана", hint: "студент: ережеге сай жұмсайды", canSign: true },
  { id: "canteen", title: "«Дастархан» асханасы", hint: "алушы: тамақ", canSign: false },
  { id: "books", title: "«Страница» кітап дүкені", hint: "алушы: оқу", canSign: false },
  { id: "transit", title: "Қалалық көлік", hint: "алушы: жол жүру", canSign: false },
  { id: "arcade", title: "«Level Up» ойын клубы", hint: "тізімде жоқ: оған жұмсауға болмайды", canSign: false },
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
