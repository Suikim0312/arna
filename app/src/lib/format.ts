import { BN } from "@anchor-lang/core";
import { TOKEN_DECIMALS, TOKEN_SYMBOL } from "../config";

const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: TOKEN_DECIMALS });

/** Целые единицы токена (минимальные) → «12 500 ₸». */
export function money(units: BN | number | bigint, withSymbol = true): string {
  const n = typeof units === "number" ? units : Number(units.toString());
  const v = n / 10 ** TOKEN_DECIMALS;
  return withSymbol ? `${nf.format(v)} ${TOKEN_SYMBOL}` : nf.format(v);
}

/** «12500» или «12 500,5» → минимальные единицы. */
export function parseMoney(input: string): BN | null {
  const clean = input.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  const [i, f = ""] = clean.split(".");
  const units = new BN(i).mul(new BN(10 ** TOKEN_DECIMALS)).add(new BN((f + "00").slice(0, TOKEN_DECIMALS)));
  return units.isZero() ? null : units;
}

export function short(addr: string, n = 4) {
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

const df = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function when(unix: number) {
  return df.format(new Date(unix * 1000));
}

export function periodLabel(seconds: number) {
  if (!seconds) return "на всё время";
  if (seconds % 2_592_000 === 0) return seconds === 2_592_000 ? "в месяц" : `за ${seconds / 2_592_000} мес.`;
  if (seconds % 604_800 === 0) return seconds === 604_800 ? "в неделю" : `за ${seconds / 604_800} нед.`;
  if (seconds % 86_400 === 0) return seconds === 86_400 ? "в день" : `за ${seconds / 86_400} дн.`;
  if (seconds % 3600 === 0) return `за ${seconds / 3600} ч`;
  return `за ${Math.round(seconds / 60)} мин`;
}
