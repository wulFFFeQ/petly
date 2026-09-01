/** Demo „dnešek“ aplikace — 1. září 2026 */
export const APP_TODAY = new Date(2026, 8, 1)

export function parseEventDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatUpcomingDate(dateStr: string, time?: string): string {
  const date = parseEventDate(dateStr)
  const tomorrow = new Date(APP_TODAY)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (isSameDay(date, tomorrow)) {
    return time ? `Zítra · ${time}` : 'Zítra'
  }

  return `${date.getDate()}. ${date.getMonth() + 1}.`
}

export function formatAge(age: number): string {
  if (age === 1) return '1 rok'
  if (age >= 2 && age <= 4) return `${age} roky`
  return `${age} let`
}

export function formatWeight(weight: number): string {
  return `${String(weight).replace('.', ',')} kg`
}

export function petCountLabel(count: number): string {
  if (count === 1) return '1 mazlíček'
  if (count >= 2 && count <= 4) return `${count} mazlíčci`
  return `${count} mazlíčků`
}
