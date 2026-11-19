import { AnchorProvider, BN, Program, type Wallet } from "@anchor-lang/core";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import idl from "../idl/arna.json";
import type { Arna } from "../idl/arna";
import { PROGRAM_ID, TOKEN_DECIMALS } from "../config";

export type ArnaProgram = Program<Arna>;

export type WalletAccount = Awaited<ReturnType<ArnaProgram["account"]["purposeWallet"]["fetch"]>>;
export type CategoryAccount = Awaited<ReturnType<ArnaProgram["account"]["category"]["fetch"]>>;
export type MerchantAccount = Awaited<ReturnType<ArnaProgram["account"]["merchant"]["fetch"]>>;
export type SpendAccount = Awaited<ReturnType<ArnaProgram["account"]["spendRecord"]["fetch"]>>;

export interface WalletSnapshot {
  address: PublicKey;
  wallet: WalletAccount;
  vaultBalance: BN;
  categories: (CategoryAccount & { address: PublicKey })[];
  merchants: (MerchantAccount & { address: PublicKey })[];
  spends: (SpendAccount & { address: PublicKey })[];
}

/** Кошелёк только для чтения: публичный отчёт работает без подключения. */
const readonlyWallet: Wallet = {
  publicKey: PublicKey.default,
  payer: undefined as unknown as Keypair,
  signTransaction: async () => {
    throw new Error("Подключите кошелёк, чтобы подписать транзакцию");
  },
  signAllTransactions: async () => {
    throw new Error("Подключите кошелёк, чтобы подписать транзакцию");
  },
};

export function makeProgram(connection: Connection, wallet?: Wallet | null): ArnaProgram {
  const provider = new AnchorProvider(connection, wallet ?? readonlyWallet, { commitment: "confirmed" });
  return new Program<Arna>(idl as Arna, provider);
}

// ─────────────── PDA ───────────────

const enc = new TextEncoder();
const u64le = (n: BN | number) => new BN(n).toArrayLike(Buffer, "le", 8);

export function walletPda(owner: PublicKey, id: BN | number) {
  return PublicKey.findProgramAddressSync([enc.encode("wallet"), owner.toBuffer(), u64le(id)], PROGRAM_ID)[0];
}
export function categoryPda(wallet: PublicKey, index: number) {
  return PublicKey.findProgramAddressSync([enc.encode("category"), wallet.toBuffer(), Uint8Array.of(index)], PROGRAM_ID)[0];
}
export function merchantPda(wallet: PublicKey, recipient: PublicKey) {
  return PublicKey.findProgramAddressSync([enc.encode("merchant"), wallet.toBuffer(), recipient.toBuffer()], PROGRAM_ID)[0];
}
export function spendPda(wallet: PublicKey, index: BN | number) {
  return PublicKey.findProgramAddressSync([enc.encode("spend"), wallet.toBuffer(), u64le(index)], PROGRAM_ID)[0];
}

// ─────────────── Чтение ───────────────

const byWallet = (wallet: PublicKey) => [{ memcmp: { offset: 8, bytes: wallet.toBase58() } }];

export async function loadWallet(program: ArnaProgram, address: PublicKey): Promise<WalletSnapshot> {
  const wallet = await program.account.purposeWallet.fetch(address);
  const [vault, cats, merch, spends] = await Promise.all([
    program.provider.connection.getTokenAccountBalance(wallet.vault).catch(() => null),
    program.account.category.all(byWallet(address)),
    program.account.merchant.all(byWallet(address)),
    program.account.spendRecord.all(byWallet(address)),
  ]);
  return {
    address,
    wallet,
    vaultBalance: new BN(vault?.value.amount ?? "0"),
    categories: cats.map((c) => ({ ...c.account, address: c.publicKey })).sort((a, b) => a.index - b.index),
    merchants: merch.map((m) => ({ ...m.account, address: m.publicKey })).sort((a, b) => a.name.localeCompare(b.name)),
    spends: spends
      .map((s) => ({ ...s.account, address: s.publicKey }))
      .sort((a, b) => b.index.cmp(a.index)),
  };
}

/** Все кошельки, где пользователь — владелец или распорядитель. */
export async function myWallets(program: ArnaProgram, me: PublicKey) {
  const [owned, spending] = await Promise.all([
    program.account.purposeWallet.all([{ memcmp: { offset: 8, bytes: me.toBase58() } }]),
    program.account.purposeWallet.all([{ memcmp: { offset: 40, bytes: me.toBase58() } }]),
  ]);
  const seen = new Set<string>();
  return [...owned, ...spending].filter((w) => {
    const k = w.publicKey.toBase58();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─────────────── Действия ───────────────

export async function createWallet(program: ArnaProgram, params: { name: string; spender: PublicKey; mint: PublicKey }) {
  const owner = program.provider.publicKey!;
  const id = new BN(Date.now());
  const wallet = walletPda(owner, id);
  const sig = await program.methods
    .createWallet(id, params.name)
    .accountsPartial({
      owner,
      spender: params.spender,
      mint: params.mint,
      wallet,
      vault: getAssociatedTokenAddressSync(params.mint, wallet, true),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
  return { sig, wallet };
}

export async function addCategory(program: ArnaProgram, snap: WalletSnapshot, name: string, limit: BN, period: number) {
  return program.methods
    .addCategory(name, limit, new BN(period))
    .accountsPartial({
      owner: program.provider.publicKey!,
      wallet: snap.address,
      category: categoryPda(snap.address, snap.wallet.categoryCount),
    })
    .rpc();
}

export async function updateCategory(program: ArnaProgram, snap: WalletSnapshot, index: number, limit: BN, period: number) {
  return program.methods
    .updateCategory(limit, new BN(period))
    .accountsPartial({ owner: program.provider.publicKey!, wallet: snap.address, category: categoryPda(snap.address, index) })
    .rpc();
}

export async function addMerchant(program: ArnaProgram, snap: WalletSnapshot, recipient: PublicKey, category: number, name: string) {
  return program.methods
    .addMerchant(category, name)
    .accountsPartial({
      owner: program.provider.publicKey!,
      wallet: snap.address,
      category: categoryPda(snap.address, category),
      recipient,
      merchant: merchantPda(snap.address, recipient),
    })
    .rpc();
}

export async function setMerchantActive(program: ArnaProgram, snap: WalletSnapshot, recipient: PublicKey, active: boolean) {
  return program.methods
    .setMerchantActive(active)
    .accountsPartial({ owner: program.provider.publicKey!, wallet: snap.address, merchant: merchantPda(snap.address, recipient) })
    .rpc();
}

export async function setPaused(program: ArnaProgram, snap: WalletSnapshot, paused: boolean) {
  return program.methods.setPaused(paused).accountsPartial({ owner: program.provider.publicKey!, wallet: snap.address }).rpc();
}

export async function setSpender(program: ArnaProgram, snap: WalletSnapshot, spender: PublicKey) {
  return program.methods.setSpender(spender).accountsPartial({ owner: program.provider.publicKey!, wallet: snap.address }).rpc();
}

export async function deposit(program: ArnaProgram, snap: WalletSnapshot, amount: BN) {
  const me = program.provider.publicKey!;
  return program.methods
    .deposit(amount)
    .accountsPartial({
      depositor: me,
      wallet: snap.address,
      mint: snap.wallet.mint,
      depositorToken: getAssociatedTokenAddressSync(snap.wallet.mint, me, true),
      vault: snap.wallet.vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Трата. Категорию берём из записи получателя; если получателя нет в списке,
 * передаём адрес несуществующей записи — и программа сама отклонит транзакцию.
 */
export async function spend(program: ArnaProgram, snap: WalletSnapshot, recipient: PublicKey, amount: BN, memo: string) {
  const merchant = snap.merchants.find((m) => m.recipient.equals(recipient));
  const categoryIndex = merchant?.category ?? 0;
  return program.methods
    .spend(amount, memo)
    .accountsPartial({
      spender: program.provider.publicKey!,
      wallet: snap.address,
      merchant: merchantPda(snap.address, recipient),
      category: categoryPda(snap.address, categoryIndex),
      mint: snap.wallet.mint,
      vault: snap.wallet.vault,
      recipient,
      recipientToken: getAssociatedTokenAddressSync(snap.wallet.mint, recipient, true),
      record: spendPda(snap.address, snap.wallet.spendCount),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function refund(program: ArnaProgram, snap: WalletSnapshot, amount: BN) {
  const me = program.provider.publicKey!;
  return program.methods
    .refund(amount)
    .accountsPartial({
      owner: me,
      wallet: snap.address,
      mint: snap.wallet.mint,
      vault: snap.wallet.vault,
      ownerToken: getAssociatedTokenAddressSync(snap.wallet.mint, me, true),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

// ─────────────── Тестовый токен (для демо) ───────────────

export async function airdropIfLow(connection: Connection, who: PublicKey, minSol = 1) {
  const bal = await connection.getBalance(who);
  if (bal >= minSol * LAMPORTS_PER_SOL) return null;
  const sig = await connection.requestAirdrop(who, 2 * LAMPORTS_PER_SOL);
  const bh = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  return sig;
}

/** Создаёт тестовый токен «₸» и начисляет его владельцу. */
export async function createTestToken(program: ArnaProgram, mintTo: PublicKey, amount: BN) {
  const provider = program.provider as AnchorProvider;
  const payer = provider.publicKey;
  const mint = Keypair.generate();
  const ata = getAssociatedTokenAddressSync(mint.publicKey, mintTo, true);
  const rent = await getMinimumBalanceForRentExemptMint(provider.connection);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: rent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint.publicKey, TOKEN_DECIMALS, payer, null),
    createAssociatedTokenAccountIdempotentInstruction(payer, ata, mintTo, mint.publicKey),
    createMintToInstruction(mint.publicKey, ata, payer, BigInt(amount.toString())),
  );
  const sig = await provider.sendAndConfirm(tx, [mint]);
  return { sig, mint: mint.publicKey };
}

// ─────────────── Ошибки ───────────────

const FRIENDLY: Record<string, string> = {
  AccountNotInitialized: "Этого получателя нет в списке разрешённых",
  ConstraintSeeds: "Получатель или категория не принадлежат этому кошельку",
  ConstraintHasOne: "Адрес не совпадает с правилами кошелька",
  LimitExceeded: "Превышен лимит конверта",
  CategoryMismatch: "Получатель не относится к этому конверту",
};

/** Достаём понятную причину отказа из ошибки Anchor / RPC. */
export function explainError(e: unknown): { code?: string; message: string } {
  const err = e as { error?: { errorCode?: { code: string }; errorMessage?: string }; message?: string; logs?: string[]; transactionLogs?: string[] };
  const code = err?.error?.errorCode?.code;
  if (code) return { code, message: FRIENDLY[code] ?? err.error?.errorMessage ?? code };
  const logs = err?.logs ?? err?.transactionLogs ?? [];
  const m = logs.join("\n").match(/Error Code: (\w+)\. Error Number: \d+\. Error Message: ([^\n]+)/);
  if (m) return { code: m[1], message: FRIENDLY[m[1]] ?? m[2].replace(/\.$/, "") };
  const msg = err?.message ?? String(e);
  if (/User rejected/i.test(msg)) return { message: "Подпись отменена в кошельке" };
  if (/insufficient lamports|0x1\b/i.test(msg)) return { message: "Не хватает SOL на комиссию" };
  return { message: msg.length > 160 ? msg.slice(0, 160) + "…" : msg };
}
