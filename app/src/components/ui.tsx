import type { ReactNode } from "react";
import { BN } from "@anchor-lang/core";
import { money, periodLabel } from "../lib/format";

export const ENV_COLORS = ["var(--env-0)", "var(--env-1)", "var(--env-2)", "var(--env-3)", "var(--env-4)", "var(--env-5)"];
export const envColor = (i: number) => ENV_COLORS[i % ENV_COLORS.length];

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--stamp)" strokeWidth="5" />
      <path d="M18 44 32 16l14 28M23 35h18" fill="none" stroke="var(--stamp)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Envelope({
  name,
  color,
  limit,
  spent,
  period,
}: {
  name: string;
  color: string;
  limit: BN | number;
  spent: BN | number;
  period: number;
}) {
  const lim = Number(limit.toString());
  const sp = Number(spent.toString());
  const left = Math.max(lim - sp, 0);
  const pct = lim ? Math.min(100, (sp / lim) * 100) : 0;
  return (
    <div className="envelope" style={{ ["--c" as string]: color }}>
      <div className="env-head">
        <div className="env-name">{name}</div>
        <div className="env-period">{periodLabel(period)}</div>
      </div>
      <div>
        <div className="env-left">{money(left)}</div>
        <div className="env-of">
          {money(lim)} ішінен қалды
        </div>
        <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={lim} aria-valuenow={sp} aria-label={`Жұмсалды ${money(sp)} / ${money(lim)}`}>
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export function Stamp({ kind, title, note }: { kind: "ok" | "deny"; title: string; note?: ReactNode }) {
  return (
    <div className={`stamp-mark ${kind === "deny" ? "deny" : ""}`} role="status">
      {title}
      {note ? <small>{note}</small> : null}
    </div>
  );
}

export function StampOverlay({ stamp }: { stamp: { kind: "ok" | "deny"; title: string; note?: string; key: number } | null }) {
  if (!stamp) return null;
  return (
    <div className="stamp-layer" key={stamp.key}>
      <Stamp kind={stamp.kind} title={stamp.title} note={stamp.note} />
    </div>
  );
}
