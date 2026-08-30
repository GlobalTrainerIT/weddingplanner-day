/** Parse any value (including Supabase numeric strings) to a safe number */
export function n(v: unknown): number {
  const num = parseFloat(String(v ?? 0));
  return isNaN(num) ? 0 : num;
}

export function fmt(v: unknown, decimals = 0): string {
  const locale = activeCurrency.code === 'EUR' ? 'de-DE' : 'en-US';
  return n(v).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
}

let activeCurrency: CurrencyInfo = { code: 'USD', symbol: '$' };

export function setCurrency(code: string, symbol: string) {
  activeCurrency = { code, symbol };
}

export function getCurrency(): CurrencyInfo {
  return activeCurrency;
}

/** Format a money value using the active currency symbol. */
export function fmtMoney(v: unknown): string {
  const locale = activeCurrency.code === 'EUR' ? 'de-DE' : 'en-US';
  return `${activeCurrency.symbol}${n(v).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
