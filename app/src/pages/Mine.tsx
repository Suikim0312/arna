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
      setErr("Это не похоже на адрес кошелька");
    }
  }

  return (
    <div className="wrap">
      <section className="create">
        <h1>Мои кошельки</h1>
        {!me ? (
          <p style={{ color: "var(--ink-2)" }}>Подключите кошелёк или выберите демо-роль, чтобы увидеть свои целевые кошельки.</p>
        ) : list === null ? (
          <p style={{ color: "var(--ink-2)" }}>Загружаю…</p>
        ) : list.length === 0 ? (
          <div className="empty">
            <b>Пока пусто</b>
            Создайте первый кошелёк или попросите владельца назначить вас распорядителем.
            <div style={{ marginTop: 14 }}>
              <a className="btn small" href="#/new">
                Создать кошелёк
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
                    {w.account.owner.equals(me) ? "вы владелец" : "вы распорядитель"}
                  </span>
                </span>
                <span>потрачено {money(w.account.totalSpent)}</span>
              </a>
            ))}
          </div>
        )}

        <div className="sheet form">
          <label className="field">
            <span>Открыть отчёт по адресу</span>
            <input className="input addr" value={addr} onChange={(e) => (setAddr(e.target.value), setErr(""))} placeholder="Адрес целевого кошелька" />
            {err ? <small style={{ color: "var(--deny)" }}>{err}</small> : <small>Отчёт открывается без подключения кошелька.</small>}
          </label>
          <button className="btn ghost" onClick={open} disabled={!addr.trim()}>
            Открыть отчёт
          </button>
        </div>
      </section>
    </div>
  );
}
