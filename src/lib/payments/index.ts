export type {
  Payment,
  PaymentType,
  PaymentStatus,
  PaymentPurpose,
  PaymentProviderId,
  ServicePaymentCollection,
  DepositType,
  BookingPaymentSummary,
  PublicPayment,
  PaymentErrorCode,
  PaymentResult,
  CreatePaymentIntentInput,
  CancellationFeeResult,
} from './types'

export {
  PAYMENT_TYPES,
  PAYMENT_STATUSES,
  SERVICE_PAYMENT_COLLECTIONS,
  DEPOSIT_TYPES,
} from './types'

export type {
  ProfessionalPaymentAccount,
  ProfessionalPaymentAccountStatus,
  ProfessionalPaymentAccountProvider,
  PublicProfessionalPaymentAccount,
  ChargePattern,
  CheckoutSessionResult,
  OnboardingLinkResult,
  LoginLinkResult,
  PayoutStatus,
  PaymentPayout,
  PaymentRouting,
  RefundRoutingPlan,
  CheckoutSessionMode,
  OnboardingLinkMode,
} from './connectTypes'

export {
  PROFESSIONAL_PAYMENT_ACCOUNT_STATUSES,
  DEFAULT_CHARGE_PATTERN,
  PAYOUT_STATUSES,
} from './connectTypes'

export {
  DEFAULT_CURRENCY,
  currencyMinorFactor,
  toMinorUnits,
  fromMinorUnits,
  assertAmountMinor,
  normalizeCurrency,
  formatMinorMoney,
} from './money'

export {
  calculateDeposit,
  formatDepositRequirement,
  type DepositCalculation,
  type DepositCalculationInput,
} from './deposit'

export { calculateCancellationFee } from './cancellationFee'

export {
  PAYMENTS_STORAGE_KEY,
  createPaymentId,
  normalizePayment,
  loadPayments,
  savePayments,
  upsertPayment,
} from './storage'

export {
  listPaymentsForBooking,
  getPayment,
  deriveBookingPaymentSummary,
  createPaymentRecord,
  preparePaymentIntent,
  preparePaymentIntentForBooking,
  createRefund,
  planRefundForPayment,
  updatePaymentStatus,
  clearAllPayments,
} from './payments'

export type { PaymentProvider, StripePaymentProvider } from './provider'
export { DemoPaymentProvider, demoProviderNeverCharges } from './demoProvider'
export {
  StripeConnectPaymentProvider,
  createStripeConnectStub,
} from './stripeConnectProvider'
export {
  getPaymentProvider,
  setPaymentProvider,
  resetPaymentProvider,
} from './providerRegistry'

export {
  getPaymentProviderConfig,
  isPaymentProviderActive,
  resolveProviderIdForRecords,
  assertNoSecretKeysInObject,
  SERVER_ONLY_SECRET_ENV_NAMES,
  FORBIDDEN_CLIENT_SECRET_PATTERNS,
  type PaymentProviderConfig,
  type PaymentProviderConfigId,
} from './config'

export {
  calculatePaymentRouting,
  calculatePlatformFeeMinor,
  planRefundRouting,
  DEFAULT_PLATFORM_FEE_BPS,
  type RoutingFeeInput,
} from './routing'

export {
  PROFESSIONAL_PAYMENT_ACCOUNTS_STORAGE_KEY,
  createProfessionalPaymentAccountId,
  normalizeProfessionalPaymentAccount,
  loadProfessionalPaymentAccounts,
  saveProfessionalPaymentAccounts,
  upsertProfessionalPaymentAccount,
  clearProfessionalPaymentAccounts,
} from './connectStorage'

export {
  getProfessionalPaymentAccount,
  getProfessionalPaymentAccountByProfessional,
  listProfessionalPaymentAccounts,
  ensureDemoProfessionalPaymentAccount,
  createLocalConnectedAccountRecord,
  isStripeConnectReady,
} from './connectAccounts'

export {
  PAYOUTS_STORAGE_KEY,
  createPayoutId,
  normalizePaymentPayout,
  loadPayouts,
  savePayouts,
  upsertPayout,
  getPayoutForPayment,
  listPayoutsForProfessional,
  createDemoPayoutDraft,
  isPayoutIndependentOfPayment,
  clearAllPayouts,
} from './payout'

export {
  toPublicPayment,
  toPublicProfessionalPaymentAccount,
  isSafePaymentPayload,
  assertPaymentPayloadSafe,
  assertNoSensitivePaymentData,
  FORBIDDEN_PAYMENT_PUBLIC_KEYS,
} from './privacy'

export {
  handlePaymentWebhook,
  createDemoWebhookEvent,
  hasProcessedProviderEvent,
  markProviderEventProcessed,
  clearProcessedProviderEvents,
  mapStripeEventToPaymentStatus,
  mapStripeEventToInternalType,
  loadProcessedProviderEvents,
  PROVIDER_EVENTS_STORAGE_KEY,
  type PaymentWebhookEvent,
  type PaymentWebhookEventType,
  type PaymentWebhookHandler,
  type StripeProviderEventType,
  type StoredProviderEvent,
  type VerifiedWebhookPayload,
} from './webhook'

export {
  suggestedPaymentDefaults,
  type ProfessionalPaymentDefaults,
} from './professionalDefaults'

export {
  ensurePaymentSeed,
  resetPaymentSeed,
  type PaymentSeedFixture,
} from './seed'
