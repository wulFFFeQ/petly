import type { CalendarEvent, Pet } from '../types'

/** Demo „dnešek“ aplikace — 1. září 2026 */
export const APP_TODAY = new Date(2026, 8, 1)

export function parseEventDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`)
}

/** Parsuje české datum typu „24. 9. 2026“ */
export function parseCzechDate(dateStr: string): Date | null {
  const match = dateStr.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0)
}

export function daysUntil(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
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

export function formatTodayHeader(): string {
  const months = [
    'LEDNA', 'ÚNORA', 'BŘEZNA', 'DUBNA', 'KVĚTNA', 'ČERVNA',
    'ČERVENCE', 'SRPNA', 'ZÁŘÍ', 'ŘÍJNA', 'LISTOPADU', 'PROSINCE',
  ]
  return `${APP_TODAY.getDate()}. ${months[APP_TODAY.getMonth()]}`
}

export { getEventTypeLabel } from './calendarEventTypes'

export function formatAge(age?: number): string {
  if (age == null || age <= 0) return 'věk neuveden'
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

export function taskCountLabel(count: number): string {
  if (count === 0) return '0 úkolů'
  if (count === 1) return '1 úkol'
  if (count >= 2 && count <= 4) return `${count} úkoly`
  return `${count} úkolů`
}

export type PetStatusBadgeVariant = 'success' | 'primary' | 'gold' | 'warning'

export function getPetStatusBadge(
  pet: Pet,
  calendarEvents: CalendarEvent[],
): { label: string; variant: PetStatusBadgeVariant } {
  const vaccinationFromField = pet.nextVaccination
    ? parseCzechDate(pet.nextVaccination)
    : null

  const nearestVaccination = calendarEvents
    .filter(
      (e) =>
        e.petName === pet.name &&
        e.type === 'vaccination' &&
        parseEventDate(e.date) >= APP_TODAY,
    )
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  const daysToVaccination = nearestVaccination
    ? daysUntil(APP_TODAY, parseEventDate(nearestVaccination.date))
    : vaccinationFromField && vaccinationFromField >= APP_TODAY
      ? daysUntil(APP_TODAY, vaccinationFromField)
      : null

  if (daysToVaccination !== null && daysToVaccination <= 30) {
    return {
      label: `Očkování za ${daysToVaccination} dní`,
      variant: daysToVaccination <= 14 ? 'warning' : 'gold',
    }
  }

  if (pet.healthStatus === 'excellent') {
    return { label: 'Vše v pořádku', variant: 'success' }
  }

  if (pet.healthStatus === 'good') {
    return { label: 'Dobrý stav', variant: 'primary' }
  }

  if (pet.healthStatus === 'attention') {
    return { label: 'Vyžaduje pozornost', variant: 'warning' }
  }

  return { label: 'Profil k doplnění', variant: 'primary' }
}
