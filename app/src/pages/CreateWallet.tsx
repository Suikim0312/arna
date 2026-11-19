import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@anchor-lang/core";
import { useSession } from "../lib/session";
import { createTestToken, createWallet, explainError, airdropIfLow } from "../lib/arna";
import { go } from "../lib/router";

function parseKey(s: string): PublicKey | null {
  try {
    return new PublicKey(s.trim());
  } catch {
    return null;
  }
}

const bytes = (s: string) => new TextEncoder().encode(s).length;

export default function CreateWallet() {
  const { program, me, connection, bump } = useSession();
  const [name, setName] = useState("");
  const [spender, setSpender] = useState("");
  const [mint, setMint] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const spenderKey = parseKey(spender);
  const mintKey = parseKey(mint);
  const nameOk = name.trim().length > 0 && bytes(name) <= 48;
  const canCreate = !!me && nameOk && !!spenderKey && !!mintKey && !busy;

  async function makeToken() {
    if (!me) return;
    setBusy(true);
    setMsg(null);
    try {
      await airdropIfLow(connection, me, 0.5).catch(() => null);
      const t = await createTestToken(program, me, new BN(100_000_000)); // 1 000 000 ₸
      setMint(t.mint.toBase58());
      setMsg({ kind: "ok", text: "Тестовый токен создан, на вашем кошельке 1 000 000 ₸" });
    } catch (e) {
      setMsg({ kind: "err", text: explainError(e).message });
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!canCreate) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await createWallet(program, { name: name.trim(), spender: spenderKey!, mint: mintKey! });
      bump();
      go(`/w/${r.wallet.toBase58()}`);
    } catch (e) {
      setMsg({ kind: "err", text: explainError(e).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <section className="create">
        <h1>Новый целевой кошелёк</h1>
        <p style={{ color: "var(--ink-2)", fontSize: 18, margin: 0 }}>
          Вы станете владельцем: будете пополнять кошелёк и задавать правила. Конверты и получателей добавите на
          следующем шаге.
        </p>

        {!me ? (
          <div className="empty" style={{ marginTop: 24 }}>
            <b>Сначала подключите кошелёк</b>
            Phantom или Solflare в тестовой сети — кнопка вверху справа. Или посмотрите готовый пример в разделе «Демо».
          </div>
        ) : (
          <div className="sheet form">
            <label className="field">
              <span>Название</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, «Обеды для команды»" />
              {name && !nameOk ? <small style={{ color: "var(--deny)" }}>Слишком длинно: до 24 букв</small> : null}
            </label>
            <label className="field">
              <span>Кто будет тратить</span>
              <input className="input addr" value={spender} onChange={(e) => setSpender(e.target.value)} placeholder="Адрес кошелька распорядителя" />
              <small>
                {spender && !spenderKey ? "Это не похоже на адрес Solana" : "Можно указать себя, а позже сменить."}{" "}
                {me ? (
                  <button type="button" className="btn quiet small" onClick={() => setSpender(me.toBase58())}>
                    Указать себя
                  </button>
                ) : null}
              </small>
            </label>
            <label className="field">
              <span>Токен</span>
              <input className="input addr" value={mint} onChange={(e) => setMint(e.target.value)} placeholder="Адрес токена (mint)" />
              <small>
                {mint && !mintKey ? "Это не похоже на адрес токена" : "В тестовой сети можно выпустить свой тестовый тенге."}{" "}
                <button type="button" className="btn quiet small" onClick={makeToken} disabled={busy}>
                  Выпустить тестовый ₸
                </button>
              </small>
            </label>
            {msg ? <div className={`result ${msg.kind}`}>{msg.text}</div> : null}
            <button className="btn" onClick={create} disabled={!canCreate}>
              {busy ? "Подписываю…" : "Создать кошелёк"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
