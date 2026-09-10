export type DocumentExpiryStatus = 'none' | 'ok' | 'soon' | 'expired'

export type DocumentExpiryInfo = {
  status: DocumentExpiryStatus
  /** Days until expiry; negative when expired. Undefined when no expiry. */
  daysLeft?: number
  label: string
}

const SOON_THRESHOLD_DAYS = 30

/** Parse ISO `YYYY-MM-DD` or legacy Czech strings like `12. 2028` / `1. 3. 2026`. */
export function parseDocumentExpiryDate(value?: string | null): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const full = trimmed.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/)
  if (full) {
    const date = new Date(Number(full[3]), Number(full[2]) - 1, Number(full[1]))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const monthYear = trimmed.match(/^(\d{1,2})\.\s*(\d{4})$/)
  if (monthYear) {
    const date = new Date(Number(monthYear[2]), Number(monthYear[1]) - 1, 1)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const ts = Date.parse(trimmed)
  if (!Number.isNaN(ts)) return new Date(ts)
  return null
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function daysUntilExpiry(expiresAt?: string | null, now = new Date()): number | null {
  const expiry = parseDocumentExpiryDate(expiresAt)
  if (!expiry) return null
  const diffMs = startOfLocalDay(expiry).getTime() - startOfLocalDay(now).getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function formatExpiryMonthYear(expiresAt: string): string {
  const date = parseDocumentExpiryDate(expiresAt)
  if (!date) return expiresAt
  return `${date.getMonth() + 1}/${date.getFullYear()}`
}

export function getDocumentExpiryInfo(
  expiresAt?: string | null,
  now = new Date(),
): DocumentExpiryInfo {
  if (!expiresAt) {
    return { status: 'none', label: 'Bez expirace' }
  }

  const daysLeft = daysUntilExpiry(expiresAt, now)
  const monthYear = formatExpiryMonthYear(expiresAt)

  if (daysLeft === null) {
    return { status: 'ok', label: `Platnost do: ${monthYear}` }
  }

  if (daysLeft < 0) {
    return {
      status: 'expired',
      daysLeft,
      label: `Platnost vypršela · ${monthYear}`,
    }
  }

  if (daysLeft <= SOON_THRESHOLD_DAYS) {
    const soonLabel =
      daysLeft === 0
        ? 'Platnost končí dnes'
        : daysLeft === 1
          ? 'Platnost končí za 1 den'
          : `Platnost končí za ${daysLeft} dní`
    return {
      status: 'soon',
      daysLeft,
      label: `${soonLabel} · ${monthYear}`,
    }
  }

  return {
    status: 'ok',
    daysLeft,
    label: `Platnost do: ${monthYear}`,
  }
}

/** Display helper for uploaded/updated timestamps stored as ISO. */
export function formatDocumentUpdatedAt(isoOrLabel: string): string {
  if (!isoOrLabel) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(isoOrLabel)) {
    const date = new Date(isoOrLabel)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    }
  }
  return isoOrLabel
}

export function subtractDaysIso(isoDate: string, days: number): string | null {
  const date = parseDocumentExpiryDate(isoDate)
  if (!date) return null
  date.setDate(date.getDate() - days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
