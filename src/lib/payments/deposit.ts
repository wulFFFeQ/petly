import { DEFAULT_CURRENCY, normalizeCurrency, toMinorUnits } from './money'
import type { DepositType } from './types'

export type DepositCalculationInput = {
  /** Service/booking price in major units (koruny). */
  priceMajor?: number
  depositType?: DepositType
  /** fixed = major units; percentage = 0–100. */
  depositValue?: number
  currency?: string
  requiresDeposit?: boolean
}

export type DepositCalculation = {
  amountMinor: number
  currency: string
  depositType: DepositType
  depositValue: number
}

/**
 * Calculate deposit from service settings.
 * percentage of 1000 Kč at 30% → 300 Kč → 30000 minor.
 */
export function calculateDeposit(input: DepositCalculationInput): DepositCalculation | null {
  if (input.requiresDeposit === false) return null
  const depositType = input.depositType
  const depositValue = input.depositValue
  if (!depositType || depositValue === undefined || !Number.isFinite(depositValue)) {
    return null
  }
  if (depositValue < 0) return null

  const currency = normalizeCurrency(input.currency || DEFAULT_CURRENCY)

  if (depositType === 'fixed') {
    return {
      amountMinor: toMinorUnits(depositValue, currency),
      currency,
      depositType,
      depositValue,
    }
  }

  // percentage
  if (depositValue > 100) return null
  const priceMajor = input.priceMajor
  if (priceMajor === undefined || !Number.isFinite(priceMajor) || priceMajor < 0) {
    return null
  }
  const major = Math.round((priceMajor * depositValue) / 100)
  return {
    amountMinor: toMinorUnits(major, currency),
    currency,
    depositType,
    depositValue,
  }
}

/** Human-readable deposit line for public UI. */
export function formatDepositRequirement(input: {
  requiresDeposit?: boolean
  depositType?: DepositType
  depositValue?: number
  currency?: string
}): string | null {
  if (!input.requiresDeposit || input.depositType === undefined || input.depositValue === undefined) {
    return null
  }
  if (input.depositType === 'percentage') {
    return `Vyžadována záloha ${Math.round(input.depositValue)} %`
  }
  const currency = normalizeCurrency(input.currency)
  try {
    const formatted = new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(input.depositValue)
    return `Vyžadována záloha ${formatted}`
  } catch {
    return `Vyžadována záloha ${input.depositValue} ${currency}`
  }
}
