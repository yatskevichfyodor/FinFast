export const DEFAULT_CURRENCY = "BYN" as const;

export const CURRENCY_OPTIONS = [
  { code: "BYN", symbol: "BYN" },
  { code: "RUB", symbol: "₽" },
  { code: "GEL", symbol: "₾" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
  { code: "GBP", symbol: "£" },
  { code: "CHF", symbol: "CHF" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "NZD", symbol: "NZ$" },
  { code: "CNY", symbol: "CN¥" },
  { code: "INR", symbol: "₹" },
  { code: "KRW", symbol: "₩" },
  { code: "SGD", symbol: "S$" },
  { code: "HKD", symbol: "HK$" },
  { code: "BRL", symbol: "R$" },
  { code: "MXN", symbol: "MX$" },
  { code: "ZAR", symbol: "R" },
  { code: "TRY", symbol: "₺" },
  { code: "PLN", symbol: "zł" },
  { code: "CZK", symbol: "Kč" },
  { code: "HUF", symbol: "Ft" },
  { code: "SEK", symbol: "kr" },
  { code: "NOK", symbol: "kr" },
  { code: "DKK", symbol: "kr" },
  { code: "TWD", symbol: "NT$" },
  { code: "UAH", symbol: "₴" },
  { code: "KZT", symbol: "₸" },
  { code: "AMD", symbol: "֏" },
  { code: "AZN", symbol: "₼" },
  { code: "THB", symbol: "฿" },
  { code: "IDR", symbol: "Rp" },
  { code: "MYR", symbol: "RM" },
  { code: "PHP", symbol: "₱" },
  { code: "VND", symbol: "₫" },
  { code: "ILS", symbol: "₪" },
  { code: "SAR", symbol: "ر.س" },
  { code: "AED", symbol: "د.إ" },
  { code: "QAR", symbol: "ر.ق" },
  { code: "RON", symbol: "lei" },
  { code: "PEN", symbol: "S/" },
  { code: "MAD", symbol: "د.م." },
  { code: "EGP", symbol: "E£" },
  { code: "NGN", symbol: "₦" },
  { code: "PKR", symbol: "Rs" },
  { code: "BDT", symbol: "৳" },
  { code: "CLP", symbol: "CLP$" },
  { code: "ARS", symbol: "AR$" },
  { code: "COP", symbol: "CO$" },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCY_OPTIONS.some((currency) => currency.code === value);
}

export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  return CURRENCY_OPTIONS.find((currency) => currency.code === currencyCode)!.symbol;
}

export function formatCurrencyAmount(amount: number, currencyCode: CurrencyCode): string {
  return `${amount.toFixed(2)} ${getCurrencySymbol(currencyCode)}`;
}
