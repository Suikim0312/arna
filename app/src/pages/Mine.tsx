import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSession } from "../lib/session";
import { myWallets } from "../lib/arna";
import { money } from "../lib/format";
import { go } from "../lib/router";

export default function Mine() {
  const { program, me, tick } = useSession();
  const [list, setList] = useState<Awaited<ReturnType<typeof myWallets>> | null>(null);
  const [addr, setAddr] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!me) return setList(null);
    myWallets(program, me).then(setList).catch(() => setList([]));
  }, [program, me, tick]);

  function open() {
    try {
      go(`/w/${new PublicKey(addr.trim()).toBase58()}`);
    } catch {
      setErr("Бұл әмиян мекенжайына ұқсамайды");
    }
  }

  return (
    <div className="wrap">
      <section className="create">
        <h1>Менің әмияндарым</h1>
        {!me ? (
          <p style={{ color: "var(--ink-2)" }}>Әмиянды қосыңыз немесе демо-рөл таңдаңыз — сонда өз мақсатты әмияндарыңызды көресіз.</p>
        ) : list === null ? (
          <p style={{ color: "var(--ink-2)" }}>Жүктелуде…</p>
        ) : list.length === 0 ? (
          <div className="empty">
            <b>Әзірге бос</b>
            Алғашқы әмиянды жасаңыз немесе иесінен өзіңізді жұмсаушы етіп тағайындауын сұраңыз.
            <div style={{ marginTop: 14 }}>
              <a className="btn small" href="#/new">
                Әмиян жасау
              </a>
            </div>
          </div>
        ) : (
          <div className="list-wallets">
            {list.map((w) => (
              <a key={w.publicKey.toBase58()} href={`#/w/${w.publicKey.toBase58()}`}>
                <span>
                  {w.account.name}
                  <span style={{ color: "var(--ink-3)", fontWeight: 500, marginLeft: 10 }}>
                    {w.account.owner.equals(me) ? "иесі — сіз" : "жұмсаушы — сіз"}
                  </span>
                </span>
                <span>жұмсалды {money(w.account.totalSpent)}</span>
              </a>
            ))}
          </div>
        )}

        <div className="sheet form">
          <label className="field">
            <span>Мекенжай бойынша есепті ашу</span>
            <input className="input addr" value={addr} onChange={(e) => (setAddr(e.target.value), setErr(""))} placeholder="Мақсатты әмиян мекенжайы" />
            {err ? <small style={{ color: "var(--deny)" }}>{err}</small> : <small>Есеп әмиянды қоспай-ақ ашылады.</small>}
          </label>
          <button className="btn ghost" onClick={open} disabled={!addr.trim()}>
            Есепті ашу
          </button>
        </div>
      </section>
    </div>
  );
}
