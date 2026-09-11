/**
 * Integer money helpers — never use floating point for amounts.
 * Service/booking prices stay in major units (koruny); Payment uses amountMinor.
 */

export const DEFAULT_CURRENCY = 'CZK'

/** Minor units per 1 major unit. CZK: 1 Kč = 100 haléřů. */
const MINOR_FACTORS: Record<string, number> = {
  CZK: 100,
  EUR: 100,
  USD: 100,
  GBP: 100,
}

export function currencyMinorFactor(currency?: string): number {
  const cur = (currency?.trim() || DEFAULT_CURRENCY).toUpperCase()
  return MINOR_FACTORS[cur] ?? 100
}

/**
 * Convert major units (e.g. 250 Kč) to minor (25000 haléřů).
 * Rejects non-finite / fractional major when already fractional beyond 2 dp — rounds safely.
 */
export function toMinorUnits(major: number, currency?: string): number {
  if (!Number.isFinite(major) || major < 0) {
    throw new Error('Invalid major amount')
  }
  const factor = currencyMinorFactor(currency)
  return Math.round(major * factor)
}

export function fromMinorUnits(amountMinor: number, currency?: string): number {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error('amountMinor must be a non-negative integer')
  }
  const factor = currencyMinorFactor(currency)
  return amountMinor / factor
}

export function assertAmountMinor(amountMinor: number): boolean {
  return Number.isInteger(amountMinor) && amountMinor >= 0
}

export function normalizeCurrency(currency?: string | null): string {
  const cur = currency?.trim().toUpperCase()
  return cur || DEFAULT_CURRENCY
}

/** Format amountMinor for UI (cs-CZ). */
export function formatMinorMoney(amountMinor: number, currency?: string): string {
  if (!assertAmountMinor(amountMinor)) return '—'
  const cur = normalizeCurrency(currency)
  const major = fromMinorUnits(amountMinor, cur)
  try {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(major)
  } catch {
    return `${major} ${cur}`
  }
}
