import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSession } from "../lib/session";
import {
  addCategory,
  addMerchant,
  deposit,
  explainError,
  loadWallet,
  refund,
  setMerchantActive,
  setPaused,
  setSpender,
  spend,
  updateCategory,
  type WalletSnapshot,
} from "../lib/arna";
import { money, parseMoney, short, when, periodLabel } from "../lib/format";
import { Envelope, StampOverlay, envColor } from "../components/ui";
import { explorerAddr, explorerTx } from "../config";
import { ROLES, demoKey, demoWallet } from "../lib/demo";

type StampState = { kind: "ok" | "deny"; title: string; note?: string; key: number } | null;
type Msg = { kind: "ok" | "err"; text: string; sig?: string } | null;

const bytes = (s: string) => new TextEncoder().encode(s).length;
const PERIODS = [
  { v: 604_800, label: "в неделю" },
  { v: 2_592_000, label: "в месяц" },
  { v: 86_400, label: "в день" },
  { v: 0, label: "на всё время" },
];

function toKey(s: string) {
  try {
    return new PublicKey(s.trim());
  } catch {
    return null;
  }
}

export default function WalletView({ address }: { address: string }) {
  const { program, me, network, tick, bump } = useSession();
  const [snap, setSnap] = useState<WalletSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stamp, setStamp] = useState<StampState>(null);
  const [freshIndex, setFreshIndex] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const stampTimer = useRef<number>();

  const key = useMemo(() => toKey(address), [address]);

  const reload = useCallback(async () => {
    if (!key) return setError("В ссылке неверный адрес кошелька");
    try {
      setSnap(await loadWallet(program, key));
      setError(null);
    } catch {
      setError("Кошелёк не найден в этой сети. Проверьте адрес и выбранную сеть вверху.");
    }
  }, [program, key]);

  useEffect(() => {
    reload();
  }, [reload, tick]);

  const showStamp = (s: Omit<NonNullable<StampState>, "key">) => {
    window.clearTimeout(stampTimer.current);
    setStamp({ ...s, key: Date.now() });
    stampTimer.current = window.setTimeout(() => setStamp(null), 2600);
  };

  if (error) {
    return (
      <div className="wrap">
        <div className="empty" style={{ margin: "48px 0" }}>
          <b>Не получилось открыть кошелёк</b>
          {error}
        </div>
      </div>
    );
  }
  if (!snap) {
    return (
      <div className="wrap">
        <p style={{ padding: "48px 0", color: "var(--ink-2)" }}>Загружаю кошелёк из блокчейна…</p>
      </div>
    );
  }

  const w = snap.wallet;
  const isOwner = !!me && w.owner.equals(me);
  const isSpender = !!me && w.spender.equals(me);
  const catName = (i: number) => snap.categories.find((c) => c.index === i)?.name ?? `Конверт ${i + 1}`;
  const merchantByRecipient = (r: PublicKey) => snap.merchants.find((m) => m.recipient.equals(r));
  const roleName = (k: PublicKey) => {
    if (demoWallet() === address) {
      const r = ROLES.find((x) => demoKey(x.id).publicKey.equals(k));
      if (r) return r.title;
    }
    return short(k.toBase58());
  };

  async function act(fn: () => Promise<string>, okText: string): Promise<Msg> {
    try {
      const sig = await fn();
      bump();
      return { kind: "ok", text: okText, sig };
    } catch (e) {
      return { kind: "err", text: explainError(e).message };
    }
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* буфер обмена недоступен */
    }
  };

  return (
    <div className="wrap">
      <section className="wallet-head">
        <div>
          <h1>{w.name}</h1>
          <div className="who">
            <span>
              Владелец <b>{roleName(w.owner)}</b>
            </span>
            <span>
              Тратит <b>{roleName(w.spender)}</b>
            </span>
            <span>
              <a href={explorerAddr(address, network)} target="_blank" rel="noreferrer">
                Адрес в Explorer
              </a>
            </span>
            <button className="btn quiet small" onClick={share}>
              {copied ? "Ссылка скопирована" : "Скопировать ссылку на отчёт"}
            </button>
          </div>
        </div>
        <div className="balance">
          <div className="big">{money(snap.vaultBalance)}</div>
          <div className="sub">
            сейчас в кошельке
            <br />
            пополнено {money(w.totalDeposited)}, потрачено {money(w.totalSpent)}
          </div>
        </div>
      </section>

      {w.paused ? <div className="paused-banner">Кошелёк на паузе: владелец временно запретил траты.</div> : null}

      <div className="layout">
        <div>
          <h2 className="section-title">
            Конверты <span className="count">{snap.categories.length}</span>
          </h2>
          {snap.categories.length ? (
            <div className="envelopes">
              {snap.categories.map((c) => {
                const now = Date.now() / 1000;
                const p = c.period.toNumber();
                const expired = p > 0 && now - c.periodStart.toNumber() >= p;
                return (
                  <Envelope
                    key={c.index}
                    name={c.name}
                    color={envColor(c.index)}
                    limit={c.limit}
                    spent={expired ? 0 : c.spentInPeriod}
                    period={p}
                  />
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <b>Конвертов пока нет</b>
              {isOwner ? "Добавьте первый конверт в панели справа: например, «Еда» с лимитом на неделю." : "Владелец ещё не задал правила."}
            </div>
          )}

          <h2 className="section-title">
            Куда можно платить <span className="count">{snap.merchants.length}</span>
          </h2>
          {snap.merchants.length ? (
            <div className="recipients">
              {snap.merchants.map((m) => (
                <div className={`recipient ${m.active ? "" : "off"}`} key={m.recipient.toBase58()} style={{ cursor: "default" }}>
                  <span className="dot" style={{ background: envColor(m.category) }} />
                  <span style={{ flex: 1 }}>
                    <div className="r-name">{m.name}</div>
                    <div className="r-meta">
                      {catName(m.category)}, получено {money(m.totalReceived)}
                      {m.active ? "" : ". Отключён"}
                    </div>
                  </span>
                  {isOwner ? (
                    <MerchantToggle
                      active={m.active}
                      onToggle={() => act(() => setMerchantActive(program, snap, m.recipient, !m.active), m.active ? "Получатель отключён" : "Получатель включён")}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <b>Список получателей пуст</b>
              Пока не добавлен ни один получатель, тратить нельзя никуда.
            </div>
          )}

          <h2 className="section-title">
            Чеки <span className="count">{snap.spends.length}</span>
          </h2>
          {snap.spends.length ? (
            <div className="roll">
              {snap.spends.map((s) => {
                const m = merchantByRecipient(s.recipient);
                return (
                  <article className={`receipt ${freshIndex === s.index.toString() ? "fresh" : ""}`} key={s.address.toBase58()}>
                    <div className="r-to">
                      <span className="tag" style={{ background: envColor(s.category) }} />
                      {m?.name ?? short(s.recipient.toBase58())}
                    </div>
                    <div className="r-amt">−{money(s.amount)}</div>
                    <div className="r-memo">{s.memo}</div>
                    <div className="r-meta">
                      <span>
                        №{s.index.toNumber() + 1}, {catName(s.category)}
                      </span>
                      <span>{when(s.timestamp.toNumber())}</span>
                      <span>
                        <a href={explorerAddr(s.address.toBase58(), network)} target="_blank" rel="noreferrer">
                          запись {short(s.address.toBase58())}
                        </a>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <b>Трат ещё не было</b>
              Каждая оплата появится здесь чеком: кому, сколько, из какого конверта и зачем.
            </div>
          )}
        </div>

        <aside className="panel" aria-label="Действия">
          <StampOverlay stamp={stamp} />
          {isSpender ? (
            <PayForm
              snap={snap}
              catName={catName}
              onResult={(r, idx) => {
                if (r.kind === "ok") {
                  setFreshIndex(idx);
                  showStamp({ kind: "ok", title: "ОПЛАЧЕНО", note: "чек сохранён в блокчейне" });
                } else showStamp({ kind: "deny", title: "ОТКЛОНЕНО", note: r.text });
              }}
              pay={(recipient, amount, memo) => act(() => spend(program, snap, recipient, amount, memo), "Оплачено")}
              network={network}
            />
          ) : null}
          {isOwner ? (
            <OwnerPanel
              snap={snap}
              act={act}
              actions={{
                deposit: (a) => deposit(program, snap, a),
                refund: (a) => refund(program, snap, a),
                addCategory: (n, l, p) => addCategory(program, snap, n, l, p),
                updateCategory: (i, l, p) => updateCategory(program, snap, i, l, p),
                addMerchant: (r, c, n) => addMerchant(program, snap, r, c, n),
                setPaused: (p) => setPaused(program, snap, p),
                setSpender: (k) => setSpender(program, snap, k),
              }}
              network={network}
            />
          ) : null}
          {!isOwner && !isSpender ? (
            me ? (
              <SupportPanel
                deposit={(a) => act(() => deposit(program, snap, a), "Спасибо! Кошелёк пополнен")}
                network={network}
              />
            ) : (
              <>
                <h2>Публичный отчёт</h2>
                <p className="panel-sub">
                  Это открытая страница: все цифры читаются прямо из блокчейна, подделать их нельзя. Чтобы пополнить
                  кошелёк или тратить, подключите кошелёк.
                </p>
                <dl style={{ margin: 0, display: "grid", gap: 10, fontSize: 15 }}>
                  <Row k="Пополнено" v={money(w.totalDeposited)} />
                  <Row k="Потрачено" v={money(w.totalSpent)} />
                  <Row k="Возвращено владельцу" v={money(w.totalRefunded)} />
                  <Row k="Остаток" v={money(snap.vaultBalance)} />
                  <Row k="Создан" v={when(w.createdAt.toNumber())} />
                </dl>
              </>
            )
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--rule)", paddingBottom: 8 }}>
      <dt style={{ color: "var(--ink-2)" }}>{k}</dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd>
    </div>
  );
}

function MerchantToggle({ active, onToggle }: { active: boolean; onToggle: () => Promise<Msg> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn quiet small"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await onToggle();
        setBusy(false);
      }}
    >
      {busy ? "…" : active ? "Отключить" : "Включить"}
    </button>
  );
}

function Result({ msg, network }: { msg: Msg; network: Parameters<typeof explorerTx>[1] }) {
  if (!msg) return null;
  return (
    <div className={`result ${msg.kind}`} role="status">
      {msg.text}
      {msg.sig ? (
        <>
          {". "}
          <a href={explorerTx(msg.sig, network)} target="_blank" rel="noreferrer">
            Открыть транзакцию
          </a>
        </>
      ) : null}
    </div>
  );
}

// ───────────── Оплата (распорядитель) ─────────────

function PayForm({
  snap,
  catName,
  pay,
  onResult,
  network,
}: {
  snap: WalletSnapshot;
  catName: (i: number) => string;
  pay: (r: PublicKey, a: ReturnType<typeof parseMoney> & object, memo: string) => Promise<Msg>;
  onResult: (m: NonNullable<Msg>, index: string) => void;
  network: Parameters<typeof explorerTx>[1];
}) {
  const isDemo = demoWallet() === snap.address.toBase58();
  const arcade = isDemo ? demoKey("arcade").publicKey.toBase58() : null;
  const [choice, setChoice] = useState<string>(snap.merchants.find((m) => m.active)?.recipient.toBase58() ?? "other");
  const [other, setOther] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const recipientStr = choice === "other" ? other : choice === "arcade" ? arcade ?? "" : choice;
  const recipient = toKey(recipientStr);
  const units = parseMoney(amount);
  const memoOk = memo.trim().length > 0 && bytes(memo) <= 96;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient || !units || !memoOk) return;
    setBusy(true);
    setMsg(null);
    const index = snap.wallet.spendCount.toString();
    const r = await pay(recipient, units, memo.trim());
    setMsg(r);
    onResult(r!, index);
    if (r?.kind === "ok") {
      setAmount("");
      setMemo("");
    }
    setBusy(false);
  }

  return (
    <form className="form" onSubmit={submit}>
      <div>
        <h2>Оплатить</h2>
        <p className="panel-sub">Программа проверит получателя, лимит конверта и только потом переведёт деньги.</p>
      </div>
      <div className="recipients" role="radiogroup" aria-label="Получатель">
        {snap.merchants.map((m) => (
          <button
            type="button"
            key={m.recipient.toBase58()}
            className={`recipient ${m.active ? "" : "off"}`}
            aria-pressed={choice === m.recipient.toBase58()}
            onClick={() => setChoice(m.recipient.toBase58())}
          >
            <span className="dot" style={{ background: envColor(m.category) }} />
            <span>
              <div className="r-name">{m.name}</div>
              <div className="r-meta">{catName(m.category)}</div>
            </span>
          </button>
        ))}
        {arcade ? (
          <button type="button" className="recipient" aria-pressed={choice === "arcade"} onClick={() => setChoice("arcade")}>
            <span className="dot" style={{ background: "var(--ink-3)" }} />
            <span>
              <div className="r-name">Игровой клуб «Level Up»</div>
              <div className="r-meta">нет в списке разрешённых</div>
            </span>
          </button>
        ) : null}
        <button type="button" className="recipient" aria-pressed={choice === "other"} onClick={() => setChoice("other")}>
          <span className="dot" style={{ background: "var(--rule)" }} />
          <span>
            <div className="r-name">Другой адрес</div>
            <div className="r-meta">вставить вручную</div>
          </span>
        </button>
      </div>
      {choice === "other" ? (
        <input className="input addr" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Адрес получателя" aria-label="Адрес получателя" />
      ) : null}
      <label className="field">
        <span>Сумма, ₸</span>
        <input className="input amount-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </label>
      <label className="field">
        <span>Назначение</span>
        <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Например, «Обед в среду»" />
        {memo && !memoOk ? <small style={{ color: "var(--deny)" }}>До 48 букв</small> : null}
      </label>
      <Result msg={msg} network={network} />
      <button className="btn" disabled={busy || !recipient || !units || !memoOk}>
        {busy ? "Подписываю…" : units ? `Оплатить ${money(units)}` : "Оплатить"}
      </button>
    </form>
  );
}

// ───────────── Владелец ─────────────

type OwnerActions = {
  deposit: (a: NonNullable<ReturnType<typeof parseMoney>>) => Promise<string>;
  refund: (a: NonNullable<ReturnType<typeof parseMoney>>) => Promise<string>;
  addCategory: (n: string, l: NonNullable<ReturnType<typeof parseMoney>>, p: number) => Promise<string>;
  updateCategory: (i: number, l: NonNullable<ReturnType<typeof parseMoney>>, p: number) => Promise<string>;
  addMerchant: (r: PublicKey, c: number, n: string) => Promise<string>;
  setPaused: (p: boolean) => Promise<string>;
  setSpender: (k: PublicKey) => Promise<string>;
};

function OwnerPanel({
  snap,
  act,
  actions,
  network,
}: {
  snap: WalletSnapshot;
  act: (fn: () => Promise<string>, ok: string) => Promise<Msg>;
  actions: OwnerActions;
  network: Parameters<typeof explorerTx>[1];
}) {
  const [tab, setTab] = useState<"money" | "env" | "who" | "manage">(snap.categories.length ? "money" : "env");
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string>, ok: string) => {
    setBusy(true);
    setMsg(null);
    setMsg(await act(fn, ok));
    setBusy(false);
  };

  const tabs: [typeof tab, string][] = [
    ["money", "Деньги"],
    ["env", "Конверты"],
    ["who", "Получатели"],
    ["manage", "Управление"],
  ];

  return (
    <div>
      <h2>Вы владелец</h2>
      <p className="panel-sub">Пополняйте кошелёк и меняйте правила. Распорядитель увидит изменения сразу.</p>
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => (setTab(id), setMsg(null))}>
            {label}
          </button>
        ))}
      </div>
      {tab === "money" ? <MoneyTab busy={busy} run={run} actions={actions} snap={snap} /> : null}
      {tab === "env" ? <EnvTab busy={busy} run={run} actions={actions} snap={snap} /> : null}
      {tab === "who" ? <WhoTab busy={busy} run={run} actions={actions} snap={snap} /> : null}
      {tab === "manage" ? <ManageTab busy={busy} run={run} actions={actions} snap={snap} /> : null}
      <div style={{ marginTop: 12 }}>
        <Result msg={msg} network={network} />
      </div>
    </div>
  );
}

type TabProps = {
  busy: boolean;
  run: (fn: () => Promise<string>, ok: string) => Promise<void>;
  actions: OwnerActions;
  snap: WalletSnapshot;
};

function MoneyTab({ busy, run, actions, snap }: TabProps) {
  const [amount, setAmount] = useState("");
  const units = parseMoney(amount);
  return (
    <div className="form">
      <label className="field">
        <span>Сумма, ₸</span>
        <input className="input amount-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </label>
      <div className="row">
        <button className="btn" disabled={busy || !units} onClick={() => units && run(() => actions.deposit(units), `Пополнено на ${money(units)}`)}>
          Пополнить
        </button>
        <button
          className="btn ghost"
          disabled={busy || !units || units.gt(snap.vaultBalance)}
          onClick={() => units && run(() => actions.refund(units), `Возвращено ${money(units)}`)}
        >
          Забрать себе
        </button>
      </div>
      <small style={{ color: "var(--ink-3)" }}>Пополнить может кто угодно, забрать остаток — только владелец.</small>
    </div>
  );
}

function EnvTab({ busy, run, actions, snap }: TabProps) {
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState(604_800);
  const [edit, setEdit] = useState<number | "new">("new");
  const units = parseMoney(limit);
  const nameOk = name.trim().length > 0 && bytes(name) <= 48;

  const pick = (v: string) => {
    if (v === "new") {
      setEdit("new");
      setName("");
      setLimit("");
      return;
    }
    const c = snap.categories.find((x) => x.index === Number(v))!;
    setEdit(c.index);
    setName(c.name);
    setLimit(String(c.limit.toNumber() / 100));
    setPeriod(c.period.toNumber());
  };

  return (
    <div className="form">
      <label className="field">
        <span>Конверт</span>
        <select className="input" value={String(edit)} onChange={(e) => pick(e.target.value)}>
          <option value="new">Новый конверт</option>
          {snap.categories.map((c) => (
            <option key={c.index} value={c.index}>
              {c.name}: {money(c.limit)} {periodLabel(c.period.toNumber())}
            </option>
          ))}
        </select>
      </label>
      {edit === "new" ? (
        <label className="field">
          <span>Название</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Еда, Учёба, Такси…" />
        </label>
      ) : null}
      <div className="row">
        <label className="field">
          <span>Лимит, ₸</span>
          <input className="input" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="30 000" />
        </label>
        <label className="field">
          <span>Обновляется</span>
          <select className="input" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            {PERIODS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {edit === "new" ? (
        <button
          className="btn"
          disabled={busy || !units || !nameOk}
          onClick={() => units && run(() => actions.addCategory(name.trim(), units, period), `Конверт «${name.trim()}» добавлен`)}
        >
          Добавить конверт
        </button>
      ) : (
        <button className="btn" disabled={busy || !units} onClick={() => units && run(() => actions.updateCategory(edit, units, period), "Лимит обновлён")}>
          Сохранить лимит
        </button>
      )}
    </div>
  );
}

function WhoTab({ busy, run, actions, snap }: TabProps) {
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [cat, setCat] = useState(0);
  const key = toKey(addr);
  const nameOk = name.trim().length > 0 && bytes(name) <= 48;
  if (!snap.categories.length) {
    return <p className="panel-sub">Сначала добавьте конверт: каждый получатель привязывается к одному конверту.</p>;
  }
  return (
    <div className="form">
      <label className="field">
        <span>Название</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Столовая, аптека, школа…" />
      </label>
      <label className="field">
        <span>Адрес получателя</span>
        <input className="input addr" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Кошелёк магазина или организации" />
        {addr && !key ? <small style={{ color: "var(--deny)" }}>Это не похоже на адрес Solana</small> : null}
      </label>
      <label className="field">
        <span>Из какого конверта платить</span>
        <select className="input" value={cat} onChange={(e) => setCat(Number(e.target.value))}>
          {snap.categories.map((c) => (
            <option key={c.index} value={c.index}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="btn"
        disabled={busy || !key || !nameOk}
        onClick={() => key && run(() => actions.addMerchant(key, cat, name.trim()), `${name.trim()} теперь в списке`)}
      >
        Разрешить получателя
      </button>
    </div>
  );
}

function ManageTab({ busy, run, actions, snap }: TabProps) {
  const [addr, setAddr] = useState("");
  const key = toKey(addr);
  const paused = snap.wallet.paused;
  return (
    <div className="form">
      <button
        className={`btn ${paused ? "" : "danger"}`}
        disabled={busy}
        onClick={() => run(() => actions.setPaused(!paused), paused ? "Траты снова разрешены" : "Кошелёк на паузе")}
      >
        {paused ? "Снять с паузы" : "Поставить на паузу"}
      </button>
      <small style={{ color: "var(--ink-3)" }}>Пауза мгновенно запрещает любые траты, например если телефон распорядителя потерян.</small>
      <label className="field" style={{ marginTop: 8 }}>
        <span>Новый распорядитель</span>
        <input className="input addr" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Адрес кошелька" />
      </label>
      <button className="btn ghost" disabled={busy || !key} onClick={() => key && run(() => actions.setSpender(key), "Распорядитель сменён")}>
        Сменить распорядителя
      </button>
    </div>
  );
}

function SupportPanel({ deposit: dep, network }: { deposit: (a: NonNullable<ReturnType<typeof parseMoney>>) => Promise<Msg>; network: Parameters<typeof explorerTx>[1] }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const units = parseMoney(amount);
  return (
    <div className="form">
      <div>
        <h2>Поддержать</h2>
        <p className="panel-sub">Вы не владелец и не распорядитель, но можете пополнить кошелёк. Тратить деньги будут по тем же правилам.</p>
      </div>
      <label className="field">
        <span>Сумма, ₸</span>
        <input className="input amount-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </label>
      <Result msg={msg} network={network} />
      <button
        className="btn"
        disabled={busy || !units}
        onClick={async () => {
          if (!units) return;
          setBusy(true);
          setMsg(await dep(units));
          setBusy(false);
        }}
      >
        Пополнить
      </button>
    </div>
  );
}
