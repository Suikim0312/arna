import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import type { Arna } from "../target/types/arna";

const T = (tenge: number) => new BN(Math.round(tenge * 100)); // 2 знака после запятой
const WEEK = 604_800;

describe("arna — целевой кошелёк", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.arna as Program<Arna>;
  const conn = provider.connection;
  const owner = provider.wallet as anchor.Wallet;

  const spender = Keypair.generate();
  const newSpender = Keypair.generate();
  const stranger = Keypair.generate();
  const canteen = Keypair.generate().publicKey; // Еда
  const books = Keypair.generate().publicKey; // Учёба
  const arcade = Keypair.generate().publicKey; // не в списке

  let mint: PublicKey;
  const id = new BN(Date.now());
  const enc = (s: string) => Buffer.from(s);
  const [wallet] = PublicKey.findProgramAddressSync(
    [enc("wallet"), owner.publicKey.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
    program.programId,
  );
  const categoryPda = (i: number) =>
    PublicKey.findProgramAddressSync([enc("category"), wallet.toBuffer(), Buffer.from([i])], program.programId)[0];
  const merchantPda = (r: PublicKey) =>
    PublicKey.findProgramAddressSync([enc("merchant"), wallet.toBuffer(), r.toBuffer()], program.programId)[0];
  const spendPda = (i: BN) =>
    PublicKey.findProgramAddressSync([enc("spend"), wallet.toBuffer(), i.toArrayLike(Buffer, "le", 8)], program.programId)[0];
  let vault: PublicKey;

  async function airdrop(to: PublicKey, sol = 5) {
    const sig = await conn.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
    const bh = await conn.getLatestBlockhash();
    await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  }

  async function expectError(p: Promise<unknown>, code: string) {
    try {
      await p;
    } catch (e: any) {
      const got = e?.error?.errorCode?.code ?? (String(e?.logs ?? e?.message ?? e).match(/Error Code: (\w+)/)?.[1]);
      expect(got, String(e)).to.equal(code);
      return;
    }
    assert.fail(`ожидалась ошибка ${code}`);
  }

  async function spend(
    recipient: PublicKey,
    amount: BN,
    memo: string,
    signer: Keypair = spender,
    categoryIndex?: number,
  ) {
    const w = await program.account.purposeWallet.fetch(wallet);
    let cat = categoryIndex;
    if (cat === undefined) {
      const m = await program.account.merchant.fetchNullable(merchantPda(recipient));
      cat = m?.category ?? 0;
    }
    return program.methods
      .spend(amount, memo)
      .accountsPartial({
        spender: signer.publicKey,
        wallet,
        merchant: merchantPda(recipient),
        category: categoryPda(cat),
        mint,
        vault,
        recipient,
        recipientToken: getAssociatedTokenAddressSync(mint, recipient, true),
        record: spendPda(w.spendCount),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();
  }

  const balance = async (ata: PublicKey) => Number((await getAccount(conn, ata)).amount);

  before(async () => {
    await Promise.all([airdrop(spender.publicKey), airdrop(newSpender.publicKey), airdrop(stranger.publicKey)]);
    mint = await createMint(conn, owner.payer, owner.publicKey, null, 2);
    const ownerAta = await getOrCreateAssociatedTokenAccount(conn, owner.payer, mint, owner.publicKey);
    await mintTo(conn, owner.payer, mint, ownerAta.address, owner.payer, BigInt(T(1_000_000).toString()));
    const strangerAta = await getOrCreateAssociatedTokenAccount(conn, owner.payer, mint, stranger.publicKey);
    await mintTo(conn, owner.payer, mint, strangerAta.address, owner.payer, BigInt(T(10_000).toString()));
    vault = getAssociatedTokenAddressSync(mint, wallet, true);
  });

  it("создаёт кошелёк и хранилище, принадлежащее PDA", async () => {
    await program.methods
      .createWallet(id, "Стипендия Даны")
      .accountsPartial({ owner: owner.publicKey, spender: spender.publicKey, mint, wallet, vault, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc();
    const w = await program.account.purposeWallet.fetch(wallet);
    expect(w.name).to.equal("Стипендия Даны");
    expect(w.owner.toBase58()).to.equal(owner.publicKey.toBase58());
    expect(w.spender.toBase58()).to.equal(spender.publicKey.toBase58());
    expect(w.vault.toBase58()).to.equal(vault.toBase58());
    const v = await getAccount(conn, vault);
    expect(v.owner.toBase58()).to.equal(wallet.toBase58(), "владелец хранилища — PDA кошелька");
  });

  it("не даёт создать кошелёк с пустым названием", async () => {
    const id2 = id.addn(1);
    const [w2] = PublicKey.findProgramAddressSync(
      [enc("wallet"), owner.publicKey.toBuffer(), id2.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    await expectError(
      program.methods
        .createWallet(id2, "   ")
        .accountsPartial({
          owner: owner.publicKey,
          spender: spender.publicKey,
          mint,
          wallet: w2,
          vault: getAssociatedTokenAddressSync(mint, w2, true),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "NameEmpty",
    );
  });

  it("владелец добавляет конверты с лимитами", async () => {
    await program.methods.addCategory("Еда", T(30_000), new BN(WEEK)).accountsPartial({ owner: owner.publicKey, wallet, category: categoryPda(0) }).rpc();
    await program.methods.addCategory("Учёба", T(50_000), new BN(0)).accountsPartial({ owner: owner.publicKey, wallet, category: categoryPda(1) }).rpc();
    const food = await program.account.category.fetch(categoryPda(0));
    expect(food.name).to.equal("Еда");
    expect(food.limit.toString()).to.equal(T(30_000).toString());
    expect(food.period.toNumber()).to.equal(WEEK);
    expect((await program.account.purposeWallet.fetch(wallet)).categoryCount).to.equal(2);
  });

  it("чужой не может добавить конверт", async () => {
    await expectError(
      program.methods
        .addCategory("Игры", T(1000), new BN(0))
        .accountsPartial({ owner: stranger.publicKey, wallet, category: categoryPda(2) })
        .signers([stranger])
        .rpc(),
      "NotOwner",
    );
  });

  it("отклоняет слишком короткий период лимита", async () => {
    await expectError(
      program.methods.addCategory("Тест", T(10), new BN(30)).accountsPartial({ owner: owner.publicKey, wallet, category: categoryPda(2) }).rpc(),
      "InvalidPeriod",
    );
  });

  it("владелец добавляет разрешённых получателей", async () => {
    await program.methods
      .addMerchant(0, "Столовая «Дастархан»")
      .accountsPartial({ owner: owner.publicKey, wallet, category: categoryPda(0), recipient: canteen, merchant: merchantPda(canteen) })
      .rpc();
    await program.methods
      .addMerchant(1, "Книжный «Страница»")
      .accountsPartial({ owner: owner.publicKey, wallet, category: categoryPda(1), recipient: books, merchant: merchantPda(books) })
      .rpc();
    const m = await program.account.merchant.fetch(merchantPda(canteen));
    expect(m.category).to.equal(0);
    expect(m.active).to.equal(true);
  });

  it("пополнить может кто угодно: и владелец, и спонсор", async () => {
    await program.methods
      .deposit(T(100_000))
      .accountsPartial({
        depositor: owner.publicKey,
        wallet,
        mint,
        depositorToken: getAssociatedTokenAddressSync(mint, owner.publicKey),
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    await program.methods
      .deposit(T(5_000))
      .accountsPartial({
        depositor: stranger.publicKey,
        wallet,
        mint,
        depositorToken: getAssociatedTokenAddressSync(mint, stranger.publicKey),
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([stranger])
      .rpc();
    expect(await balance(vault)).to.equal(T(105_000).toNumber());
    expect((await program.account.purposeWallet.fetch(wallet)).totalDeposited.toString()).to.equal(T(105_000).toString());
  });

  it("распорядитель платит разрешённому получателю — и появляется чек", async () => {
    await spend(canteen, T(2_500), "Обед на неделю");
    expect(await balance(getAssociatedTokenAddressSync(mint, canteen))).to.equal(T(2_500).toNumber());
    expect(await balance(vault)).to.equal(T(102_500).toNumber());
    const rec = await program.account.spendRecord.fetch(spendPda(new BN(0)));
    expect(rec.memo).to.equal("Обед на неделю");
    expect(rec.amount.toString()).to.equal(T(2_500).toString());
    expect(rec.recipient.toBase58()).to.equal(canteen.toBase58());
    expect(rec.category).to.equal(0);
    const cat = await program.account.category.fetch(categoryPda(0));
    expect(cat.spentInPeriod.toString()).to.equal(T(2_500).toString());
    const m = await program.account.merchant.fetch(merchantPda(canteen));
    expect(m.totalReceived.toString()).to.equal(T(2_500).toString());
    const w = await program.account.purposeWallet.fetch(wallet);
    expect(w.spendCount.toNumber()).to.equal(1);
    expect(w.totalSpent.toString()).to.equal(T(2_500).toString());
  });

  it("чужой человек не может тратить", async () => {
    await expectError(spend(canteen, T(100), "Попытка", stranger), "NotSpender");
  });

  it("на получателя не из списка потратить нельзя", async () => {
    await expectError(spend(arcade, T(1_000), "Игровой клуб", spender, 0), "AccountNotInitialized");
  });

  it("нельзя выйти за лимит конверта", async () => {
    await expectError(spend(canteen, T(27_501), "Слишком много"), "LimitExceeded");
    await spend(canteen, T(27_500), "Ровно до лимита"); // 2 500 + 27 500 = 30 000
    await expectError(spend(canteen, T(0.01), "Ещё копейка"), "LimitExceeded");
  });

  it("нельзя подменить конверт: получатель жёстко привязан к своему", async () => {
    // Книжный относится к «Учёбе» (1), пытаемся списать его с «Еды» (0).
    await expectError(spend(books, T(100), "Подмена", spender, 0), "ConstraintSeeds");
  });

  it("без назначения платежа трата не проходит", async () => {
    await expectError(spend(books, T(100), "  "), "MemoRequired");
  });

  it("на паузе траты запрещены, после снятия — снова можно", async () => {
    await program.methods.setPaused(true).accountsPartial({ owner: owner.publicKey, wallet }).rpc();
    await expectError(spend(books, T(1_000), "Учебник"), "WalletPaused");
    await program.methods.setPaused(false).accountsPartial({ owner: owner.publicKey, wallet }).rpc();
    await spend(books, T(1_000), "Учебник по Rust");
  });

  it("отключённый получатель не принимает платежи", async () => {
    await program.methods.setMerchantActive(false).accountsPartial({ owner: owner.publicKey, wallet, merchant: merchantPda(books) }).rpc();
    await expectError(spend(books, T(500), "Тетради"), "MerchantInactive");
    await program.methods.setMerchantActive(true).accountsPartial({ owner: owner.publicKey, wallet, merchant: merchantPda(books) }).rpc();
  });

  it("владелец может поднять лимит конверта", async () => {
    await program.methods.updateCategory(T(40_000), new BN(WEEK)).accountsPartial({ owner: owner.publicKey, wallet, category: categoryPda(0) }).rpc();
    await spend(canteen, T(5_000), "Ужин с одногруппниками");
    const cat = await program.account.category.fetch(categoryPda(0));
    expect(cat.spentInPeriod.toString()).to.equal(T(35_000).toString());
  });

  it("смена распорядителя: старый больше не может тратить", async () => {
    await program.methods.setSpender(newSpender.publicKey).accountsPartial({ owner: owner.publicKey, wallet }).rpc();
    await expectError(spend(books, T(100), "Старый ключ"), "NotSpender");
    await spend(books, T(100), "Новый ключ", newSpender);
  });

  it("остаток может вернуть только владелец", async () => {
    await expectError(
      program.methods
        .refund(T(1_000))
        .accountsPartial({
          owner: stranger.publicKey,
          wallet,
          mint,
          vault,
          ownerToken: getAssociatedTokenAddressSync(mint, stranger.publicKey),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([stranger])
        .rpc(),
      "NotOwner",
    );
    const before = await balance(getAssociatedTokenAddressSync(mint, owner.publicKey));
    await program.methods
      .refund(T(10_000))
      .accountsPartial({
        owner: owner.publicKey,
        wallet,
        mint,
        vault,
        ownerToken: getAssociatedTokenAddressSync(mint, owner.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    expect(await balance(getAssociatedTokenAddressSync(mint, owner.publicKey))).to.equal(before + T(10_000).toNumber());
  });

  it("итог сходится: пополнено = потрачено + возвращено + остаток", async () => {
    const w = await program.account.purposeWallet.fetch(wallet);
    const left = await balance(vault);
    expect(w.totalSpent.add(w.totalRefunded).add(new BN(left)).toString()).to.equal(w.totalDeposited.toString());
    const records = await program.account.spendRecord.all([{ memcmp: { offset: 8, bytes: wallet.toBase58() } }]);
    expect(records.length).to.equal(w.spendCount.toNumber());
    const sum = records.reduce((s, r) => s.add(r.account.amount), new BN(0));
    expect(sum.toString()).to.equal(w.totalSpent.toString(), "сумма чеков = потрачено");
  });
});
