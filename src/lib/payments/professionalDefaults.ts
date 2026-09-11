import type { ProfessionalType } from '../../types/professional'
import type { DepositType, ServicePaymentCollection } from './types'

export type ProfessionalPaymentDefaults = {
  paymentCollection: ServicePaymentCollection
  requiresDeposit: boolean
  depositType?: DepositType
  depositValue?: number
}

/**
 * Suggested defaults by professional type — not enforced.
 * Online payment is never assumed for all roles.
 */
const DEFAULTS: Record<string, ProfessionalPaymentDefaults> = {
  veterinarian: {
    paymentCollection: 'pay_on_site',
    requiresDeposit: false,
  },
  veterinary_clinic: {
    paymentCollection: 'pay_on_site',
    requiresDeposit: false,
  },
  groomer: {
    paymentCollection: 'deposit',
    requiresDeposit: true,
    depositType: 'percentage',
    depositValue: 30,
  },
  trainer: {
    paymentCollection: 'pay_on_site',
    requiresDeposit: false,
  },
  pet_hotel: {
    paymentCollection: 'deposit',
    requiresDeposit: true,
    depositType: 'percentage',
    depositValue: 30,
  },
  pet_service: {
    paymentCollection: 'pay_on_site',
    requiresDeposit: false,
  },
  breeder: {
    paymentCollection: 'pay_on_site',
    requiresDeposit: false,
  },
  shelter: {
    paymentCollection: 'pay_on_site',
    requiresDeposit: false,
  },
}

const FALLBACK: ProfessionalPaymentDefaults = {
  paymentCollection: 'pay_on_site',
  requiresDeposit: false,
}

export function suggestedPaymentDefaults(
  type: ProfessionalType | string | undefined,
): ProfessionalPaymentDefaults {
  if (!type) return { ...FALLBACK }
  return { ...(DEFAULTS[type] ?? FALLBACK) }
}
