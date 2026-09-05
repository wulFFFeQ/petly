import { normalizeMicrochipInput } from './validate'

/** Mask for non-owner surfaces: ••••••••••7890 */
export function maskMicrochip(value: string): string {
  const digits = normalizeMicrochipInput(value)
  if (!digits) return '••••'
  if (digits.length <= 4) return '•'.repeat(digits.length)
  return `${'•'.repeat(Math.max(digits.length - 4, 6))}${digits.slice(-4)}`
}
