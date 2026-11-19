/**
 * Консольный сценарий «Стипендия Даны» — для живой проверки на защите.
 * Запуск (валидатор и программа уже подняты):  npm run demo
 * RPC и кошелёк можно сменить: RPC_URL=... WALLET=~/.config/solana/id.json npm run demo
 */
import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { readFileSync, mkdirSync, appendFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import idl from "../target/idl/arna.json";
import type { Arna } from "../target/types/arna";

const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8899";
const WALLET = (process.env.WALLET ?? "~/.config/solana/id.json").replace("~", homedir());
const T = (t: number) => new BN(Math.round(t * 100));
const fmt = (u: BN | bigint | number) => (Number(u.toString()) / 100).toLocaleString("ru-RU") + " ₸";

mkdirSync("logs", { recursive: true });
const LOG = "logs/demo.log";
writeFileSync(LOG, `# Arna demo — ${new Date().toISOString()} — RPC ${RPC}\n`);
const log = (s: string) => {
  console.log(s);
  appendFileSync(LOG, s + "\n");
};

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const mama = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(WALLET, "utf8"))));
  const provider = new anchor.AnchorProvider(conn, new anchor.Wallet(mama), { commitment: "confirmed" });
  const program = new Program<Arna>(idl as Arna, provider);
  const dana = Keypair.generate();
  const canteen = Keypair.generate().publicKey;
  const books = Keypair.generate().publicKey;
  const arcade = Keypair.generate().publicKey;
  const enc = (s: string) => Buffer.from(s);

  log(`Программа: ${program.programId.toBase58()}`);
  log(`Мама (владелец): ${mama.publicKey.toBase58()}`);
  log(`Дана (распорядитель): ${dana.publicKey.toBase58()}`);

  const air = await conn.requestAirdrop(dana.publicKey, LAMPORTS_PER_SOL);
  await conn.confirmTransaction({ signature: air, ...(await conn.getLatestBlockhash()) });

  const mint = await createMint(conn, mama, mama.publicKey, null, 2);
  const mamaAta = await getOrCreateAssociatedTokenAccount(conn, mama, mint, mama.publicKey);
  await mintTo(conn, mama, mint, mamaAta.address, mama, BigInt(T(200_000).toString()));
  log(`Тестовый тенге: ${mint.toBase58()} (у Мамы 200 000 ₸)`);

  const id = new BN(Date.now());
  const [wallet] = PublicKey.findProgramAddressSync([enc("wallet"), mama.publicKey.toBuffer(), id.toArrayLike(Buffer, "le", 8)], program.programId);
  const vault = getAssociatedTokenAddressSync(mint, wallet, true);
  const cat = (i: number) => PublicKey.findProgramAddressSync([enc("category"), wallet.toBuffer(), Buffer.from([i])], program.programId)[0];
  const mer = (r: PublicKey) => PublicKey.findProgramAddressSync([enc("merchant"), wallet.toBuffer(), r.toBuffer()], program.programId)[0];
  const rec = (i: BN) => PublicKey.findProgramAddressSync([enc("spend"), wallet.toBuffer(), i.toArrayLike(Buffer, "le", 8)], program.programId)[0];

  const step = async (title: string, p: Promise<string>) => {
    const sig = await p;
    log(`✓ ${title}\n    tx ${sig}`);
  };

  await step(
    "create_wallet «Стипендия Даны»",
    program.methods
      .createWallet(id, "Стипендия Даны")
      .accountsPartial({ owner: mama.publicKey, spender: dana.publicKey, mint, wallet, vault, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc(),
  );
  log(`    кошелёк ${wallet.toBase58()}, хранилище ${vault.toBase58()}`);

  await step("add_category «Еда» 30 000 ₸ в неделю", program.methods.addCategory("Еда", T(30_000), new BN(604_800)).accountsPartial({ owner: mama.publicKey, wallet, category: cat(0) }).rpc());
  await step("add_category «Учёба» 50 000 ₸ на всё время", program.methods.addCategory("Учёба", T(50_000), new BN(0)).accountsPartial({ owner: mama.publicKey, wallet, category: cat(1) }).rpc());
  await step(
    "add_merchant Столовая → Еда",
    program.methods.addMerchant(0, "Столовая «Дастархан»").accountsPartial({ owner: mama.publicKey, wallet, category: cat(0), recipient: canteen, merchant: mer(canteen) }).rpc(),
  );
  await step(
    "add_merchant Книжный → Учёба",
    program.methods.addMerchant(1, "Книжный «Страница»").accountsPartial({ owner: mama.publicKey, wallet, category: cat(1), recipient: books, merchant: mer(books) }).rpc(),
  );
  await step(
    "deposit 100 000 ₸",
    program.methods
      .deposit(T(100_000))
      .accountsPartial({ depositor: mama.publicKey, wallet, mint, depositorToken: mamaAta.address, vault, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc(),
  );

  const danaProgram = new Program<Arna>(idl as Arna, new anchor.AnchorProvider(conn, new anchor.Wallet(dana), { commitment: "confirmed" }));
  const spend = async (recipient: PublicKey, categoryIndex: number, amount: BN, memo: string) => {
    const w = await program.account.purposeWallet.fetch(wallet);
    return danaProgram.methods
      .spend(amount, memo)
      .accountsPartial({
        spender: dana.publicKey,
        wallet,
        merchant: mer(recipient),
        category: cat(categoryIndex),
        mint,
        vault,
        recipient,
        recipientToken: getAssociatedTokenAddressSync(mint, recipient, true),
        record: rec(w.spendCount),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  };
  const expectFail = async (title: string, p: Promise<string>) => {
    try {
      await p;
      log(`✗ ${title}: транзакция неожиданно прошла`);
      process.exitCode = 1;
    } catch (e: any) {
      const code = e?.error?.errorCode?.code ?? String(e).match(/Error Code: (\w+)/)?.[1] ?? "error";
      log(`✓ ${title}: отклонено программой (${code})`);
    }
  };

  await step("spend 2 450 ₸ → Столовая «Обеды, пн–ср»", spend(canteen, 0, T(2_450), "Обеды, понедельник–среда"));
  await step("spend 4 800 ₸ → Книжный «Учебник»", spend(books, 1, T(4_800), "Учебник «Блокчейн на практике»"));
  await expectFail("spend 3 000 ₸ → Игровой клуб (нет в списке)", spend(arcade, 0, T(3_000), "Пара часов в клубе"));
  await expectFail("spend 28 000 ₸ → Столовая (лимит Еды 30 000)", spend(canteen, 0, T(28_000), "Банкет"));
  await expectFail("spend Книжный из конверта «Еда» (подмена)", spend(books, 0, T(100), "Подмена конверта"));

  const w = await program.account.purposeWallet.fetch(wallet);
  const left = (await getAccount(conn, vault)).amount;
  log("");
  log(`Итог: пополнено ${fmt(w.totalDeposited)}, потрачено ${fmt(w.totalSpent)}, остаток ${fmt(left)}, чеков ${w.spendCount.toString()}`);
  log(`Проверка: потрачено + остаток = пополнено → ${w.totalSpent.add(new BN(left.toString())).eq(w.totalDeposited) ? "сходится" : "НЕ сходится"}`);
  log(`Отчёт в веб-приложении: http://localhost:5173/#/w/${wallet.toBase58()}`);
}

main().catch((e) => {
  log(`Ошибка: ${e?.message ?? e}`);
  process.exit(1);
});
