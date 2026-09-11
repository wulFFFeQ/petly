import { DemoPaymentProvider } from './demoProvider'
import type { PaymentProvider } from './provider'

let activeProvider: PaymentProvider | null = null

/** Active booking-payment provider — DEMO until a real provider is wired. */
export function getPaymentProvider(): PaymentProvider {
  if (!activeProvider) {
    activeProvider = new DemoPaymentProvider()
  }
  return activeProvider
}

/** Test helper — swap provider without changing UI. */
export function setPaymentProvider(provider: PaymentProvider): void {
  activeProvider = provider
}

export function resetPaymentProvider(): void {
  activeProvider = null
}
