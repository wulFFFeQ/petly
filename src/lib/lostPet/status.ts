import type { LostPetLifecycle, PublicBehavior, TemperamentHint, SightingActivity, FoundSafety, ReportFlagReason, LostPetReportType } from '../../types/lostPet'

export function lostStatusLabel(status: LostPetLifecycle): string {
  switch (status) {
    case 'lost':
      return 'Ztracen'
    case 'found':
      return 'Nalezen'
    case 'closed':
      return 'Oznámení ukončeno'
  }
}

export function lostStatusEmoji(status: LostPetLifecycle): string {
  switch (status) {
    case 'lost':
      return '🔴'
    case 'found':
      return '🟢'
    case 'closed':
      return '⚪'
  }
}

export function publicBehaviorLabel(behavior: PublicBehavior): string {
  switch (behavior) {
    case 'catch':
      return 'Pokusit se ho odchytit'
    case 'report_only':
      return 'Nepokoušet se ho chytat, pouze nahlásit místo'
    case 'situational':
      return 'Záleží na situaci'
  }
}

export function temperamentLabel(hint: TemperamentHint): string {
  switch (hint) {
    case 'friendly':
      return 'Přátelský'
    case 'fearful':
      return 'Bojí se'
    case 'aggressive':
      return 'Může být agresivní'
    case 'uncertain':
      return 'Nejisté'
  }
}

export function temperamentPeopleLabel(hint: TemperamentHint): string {
  switch (hint) {
    case 'friendly':
      return 'Přátelský'
    case 'fearful':
      return 'Bojí se lidí'
    case 'aggressive':
      return 'Může být agresivní'
    case 'uncertain':
      return 'Nejisté'
  }
}

export function sightingActivityLabel(activity: SightingActivity): string {
  switch (activity) {
    case 'running':
      return 'Běžel'
    case 'walking':
      return 'Šel'
    case 'hiding':
      return 'Schovával se'
    case 'with_someone':
      return 'Byl s někým'
    case 'unknown':
      return 'Nevím'
  }
}

export function foundSafetyLabel(safety: FoundSafety): string {
  switch (safety) {
    case 'with_me':
      return 'Ano, je u mě'
    case 'safe_elsewhere':
      return 'Je v bezpečí na jiném místě'
    case 'needs_vet':
      return 'Potřebuje veterinární pomoc'
    case 'unknown':
      return 'Nevím'
  }
}

export function reportTypeLabel(type: LostPetReportType): string {
  switch (type) {
    case 'sighting':
      return 'Viděl/a jsem ho'
    case 'found':
      return 'Našel/a jsem ho'
  }
}

export function reportFlagReasonLabel(reason: ReportFlagReason): string {
  switch (reason) {
    case 'outdated':
      return 'Už není aktuální'
    case 'wrong_place':
      return 'Nesprávné místo'
    case 'fake':
      return 'Falešné hlášení'
    case 'other':
      return 'Jiné'
  }
}

export function formatRelativeCzech(fromIso: string, now = new Date()): string {
  const then = new Date(fromIso)
  if (Number.isNaN(then.getTime())) return fromIso
  const diffMs = Math.max(0, now.getTime() - then.getTime())
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'právě teď'
  if (minutes < 60) return `před ${minutes} ${minutes === 1 ? 'minutou' : minutes < 5 ? 'minutami' : 'minutami'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `před ${hours} ${hours === 1 ? 'hodinou' : hours < 5 ? 'hodinami' : 'hodinami'}`
  const days = Math.floor(hours / 24)
  return `před ${days} ${days === 1 ? 'dnem' : 'dny'}`
}

export function formatCzechDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function resolveObservedAt(
  preset: 'now' | 'under_hour' | 'today' | 'custom',
  customIso?: string,
  now = new Date(),
): string {
  switch (preset) {
    case 'now':
      return now.toISOString()
    case 'under_hour':
      return new Date(now.getTime() - 30 * 60_000).toISOString()
    case 'today': {
      const d = new Date(now)
      d.setHours(12, 0, 0, 0)
      return d.toISOString()
    }
    case 'custom':
      return customIso?.trim() || now.toISOString()
  }
}

export function buildLostAnnouncementUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base}${basename}/lost/${token}`
}
