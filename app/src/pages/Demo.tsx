import { useState } from "react";
import { BN } from "@anchor-lang/core";
import { useSession } from "../lib/session";
import { ROLES, demoKey, keypairWallet, rememberDemoWallet, resetDemoKeys, demoWallet } from "../lib/demo";
import {
  addCategory,
  addMerchant,
  airdropIfLow,
  createTestToken,
  createWallet,
  deposit,
  explainError,
  loadWallet,
  makeProgram,
  spend,
} from "../lib/arna";
import { explorerTx } from "../config";
import { go } from "../lib/router";
import { short } from "../lib/format";

type Line = { text: string; sig?: string; kind?: "ok" | "err" };

const T = (tenge: number) => new BN(Math.round(tenge * 100));

export default function Demo() {
  const { connection, network, setDemoRole, bump } = useSession();
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<string | null>(demoWallet());

  const log = (l: Line) => setLines((xs) => [...xs, l]);

  async function run() {
    setBusy(true);
    setLines([]);
    try {
      const donorKp = demoKey("donor");
      const danaKp = demoKey("spender");
      const donor = makeProgram(connection, keypairWallet(donorKp));
      const dana = makeProgram(connection, keypairWallet(danaKp));

      log({ text: "Ана мен Дана үшін комиссияға сынақ SOL сұраудамын…" });
      await airdropIfLow(connection, donorKp.publicKey, 1);
      await airdropIfLow(connection, danaKp.publicKey, 0.5);
      log({ text: "SOL алынды", kind: "ok" });

      const tok = await createTestToken(donor, donorKp.publicKey, T(200_000));
      log({ text: `Сынақ теңге жасалды ${short(tok.mint.toBase58())}, Анада 200 000 ₸ бар`, sig: tok.sig, kind: "ok" });

      const cw = await createWallet(donor, { name: "Дананың стипендиясы", spender: danaKp.publicKey, mint: tok.mint });
      log({ text: `«Дананың стипендиясы» әмияны жасалды: ${short(cw.wallet.toBase58())}`, sig: cw.sig, kind: "ok" });

      const envs: [string, number, number][] = [
        ["Тамақ", 30_000, 604_800],
        ["Оқу", 50_000, 0],
        ["Жол жүру", 8_000, 604_800],
      ];
      for (const [name, lim, period] of envs) {
        const snap = await loadWallet(donor, cw.wallet);
        const sig = await addCategory(donor, snap, name, T(lim), period);
        log({ text: `«${name}» конверті: ${lim.toLocaleString("ru-RU")} ₸ ${period ? "аптасына" : "тұтас уақытқа"}`, sig, kind: "ok" });
      }

      const shops: [typeof ROLES[number]["id"], number][] = [
        ["canteen", 0],
        ["books", 1],
        ["transit", 2],
      ];
      for (const [role, cat] of shops) {
        const snap = await loadWallet(donor, cw.wallet);
        const r = ROLES.find((x) => x.id === role)!;
        const sig = await addMerchant(donor, snap, demoKey(role).publicKey, cat, r.title);
        log({ text: `Алушыға рұқсат берілді: ${r.title}`, sig, kind: "ok" });
      }

      let snap = await loadWallet(donor, cw.wallet);
      const dsig = await deposit(donor, snap, T(100_000));
      log({ text: "Ана 100 000 ₸ салды", sig: dsig, kind: "ok" });

      snap = await loadWallet(dana, cw.wallet);
      const ssig = await spend(dana, snap, demoKey("canteen").publicKey, T(2_450), "Түскі астар, дүйсенбі–сәрсенбі");
      log({ text: "Дана асханада түскі асқа төледі: 2 450 ₸", sig: ssig, kind: "ok" });

      rememberDemoWallet(cw.wallet.toBase58());
      setReady(cw.wallet.toBase58());
      log({ text: "Дайын. Әмиянды ашып, Дана атынан төлеп көріңіз.", kind: "ok" });
      bump();
    } catch (e) {
      log({ text: explainError(e).message, kind: "err" });
    } finally {
      setBusy(false);
    }
  }

  function open() {
    if (!ready) return;
    setDemoRole("spender");
    go(`/w/${ready}`);
  }

  return (
    <div className="wrap">
      <section className="demo-hero">
        <h1>Дананың стипендиясы</h1>
        <p>
          Ана студент қызына тамаққа, оқуға және жол жүруге ақша жібереді. Дана өзі жұмсайды, бірақ тек рұқсат етілген
          жерлерде және лимит шегінде. Бәрі нақты сынақ желісінде өтеді: {network === "devnet" ? "Devnet" : "Localnet"}.
        </p>
      </section>

      <div className="cast">
        {ROLES.map((r) => (
          <div className="person" key={r.id}>
            <b>{r.title}</b>
            <span>{r.hint}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn" onClick={run} disabled={busy}>
          {busy ? "Дайындалуда…" : ready ? "Қайта дайындау" : "Демоны дайындау"}
        </button>
        {ready ? (
          <button className="btn ghost" onClick={open} disabled={busy}>
            Дананың әмиянын ашу
          </button>
        ) : null}
        {ready && !busy ? (
          <button
            className="btn quiet"
            onClick={() => {
              resetDemoKeys();
              setReady(null);
              setLines([]);
              setDemoRole(null);
            }}
          >
            Демо кілттерін тастау
          </button>
        ) : null}
      </div>

      {lines.length ? (
        <div className="log" aria-live="polite">
          {lines.map((l, i) => (
            <div key={i} className={l.kind}>
              {l.kind === "ok" ? "✓ " : l.kind === "err" ? "✗ " : "· "}
              {l.text}
              {l.sig ? (
                <>
                  {" "}
                  <a href={explorerTx(l.sig, network)} target="_blank" rel="noreferrer">
                    {short(l.sig, 6)}
                  </a>
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height: 80 }} />
      )}
    </div>
  );
}
