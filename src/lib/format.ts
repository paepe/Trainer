// Locale-aware date/time/number formatting — wraps Intl using the app's
// BCP-47 mapping (src/i18n) so every screen renders dates in the user's
// active language instead of ad-hoc fixed locales ('en-GB', 'en-US', …).
import { BCP47, type AppLanguage } from '../i18n';

function resolveLocale(lang: string): string {
  return BCP47[(lang in BCP47 ? lang : 'en') as AppLanguage];
}

export function formatDate(value: Date | string | number, lang: string, opts?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(resolveLocale(lang), opts).format(date);
}

export function formatTime(value: Date | string | number, lang: string, opts?: Intl.DateTimeFormatOptions): string {
  return formatDate(value, lang, { hour: '2-digit', minute: '2-digit', ...opts });
}

export function formatDateTime(value: Date | string | number, lang: string, opts?: Intl.DateTimeFormatOptions): string {
  return formatDate(value, lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', ...opts });
}

export function formatNumber(value: number, lang: string, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(resolveLocale(lang), opts).format(value);
}

export function formatDecimal(value: number, lang: string, digits = 1): string {
  return formatNumber(value, lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
