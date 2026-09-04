import type { HealthRecord, TimelineEvent } from '../types'

export function parseCzechDate(dateStr: string): number {
  const match = dateStr.match(/(\d+)\.\s*(\d+)\.\s*(\d+)/)
  if (!match) return 0
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime()
}

/** Convert HTML date input value (YYYY-MM-DD) to Czech display format. */
export function formatIsoDateToCzech(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return isoDate
  const day = Number(match[3])
  const month = Number(match[2])
  const year = Number(match[1])
  return `${day}. ${month}. ${year}`
}

export function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function healthRecordToTimelineEvent(record: HealthRecord): TimelineEvent {
  const source =
    record.type === 'vaccination'
      ? 'vaccination'
      : record.type === 'medication'
        ? 'medication'
        : 'vet'

  return {
    id: `auto_${record.id}`,
    petId: record.petId,
    title: record.title,
    date: record.date,
    category: 'medical',
    description: [record.subtitle, record.doctor, record.clinic].filter(Boolean).join(' · '),
    source,
    sourceId: record.id,
  }
}

export function buildPetTimeline(
  petId: string,
  staticEvents: TimelineEvent[],
  records: HealthRecord[],
  customEvents: TimelineEvent[],
): TimelineEvent[] {
  const staticForPet = staticEvents.filter((e) => e.petId === petId)
  const autoEvents = records
    .filter((r) => r.petId === petId)
    .map(healthRecordToTimelineEvent)
  const customForPet = customEvents.filter((e) => e.petId === petId)

  const seen = new Set<string>()
  const merged: TimelineEvent[] = []

  for (const event of [...staticForPet, ...autoEvents, ...customForPet]) {
    const key = event.sourceId ? `${event.source}_${event.sourceId}` : event.id
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(event)
  }

  return merged.sort((a, b) => parseCzechDate(b.date) - parseCzechDate(a.date))
}

export function isDocumentExpiringSoon(expiresAt?: string): boolean {
  if (!expiresAt) return false
  const ts = parseCzechDate(expiresAt.includes('.') ? expiresAt : `1. ${expiresAt}`)
  if (!ts) return false
  const monthsLeft = (ts - Date.now()) / (1000 * 60 * 60 * 24 * 30)
  return monthsLeft <= 6
}
