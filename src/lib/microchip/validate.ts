/** Strip to digits only. */
export function normalizeMicrochipInput(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidMicrochipFormat(value: string): boolean {
  const digits = normalizeMicrochipInput(value)
  return digits.length === 15
}

export function microchipValidationMessage(value: string): string | null {
  const digits = normalizeMicrochipInput(value)
  if (!digits) return 'Zadejte číslo mikročipu.'
  if (!/^\d+$/.test(digits)) return 'Číslo mikročipu smí obsahovat pouze číslice.'
  if (digits.length < 15) {
    return `Číslo je příliš krátké (${digits.length}/15 číslic).`
  }
  if (digits.length > 15) {
    return `Číslo je příliš dlouhé (${digits.length}/15 číslic).`
  }
  return null
}
