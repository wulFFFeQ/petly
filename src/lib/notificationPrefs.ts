const NOTIFICATION_PREFS_KEY = 'loved-known-notification-prefs'

export const NOTIFICATION_PREF_ITEMS = [
  {
    id: 'push_meds',
    title: 'Pushová upozornění na očkování a léky',
    desc: 'Připomínky 48 hodin a 2 hodiny před termínem',
    defaultEnabled: true,
  },
  {
    id: 'sms_vet',
    title: 'SMS připomínky veterinárních termínů',
    desc: 'Upozornění na objednané návštěvy u veterináře',
    defaultEnabled: true,
  },
  {
    id: 'meetings',
    title: 'Upozornění na schůzky',
    desc: 'Připomínky treninků, agility lekcí a dalších plánovaných aktivit',
    defaultEnabled: true,
  },
  {
    id: 'community',
    title: 'Zprávy z komunity',
    desc: 'Upozornění, když se majitelé spojí nebo okomentují váš příspěvek',
    defaultEnabled: false,
  },
  {
    id: 'monthly_health',
    title: 'Měsíční přehled zdraví a hmotnosti',
    desc: 'Souhrnná zpráva o vitálních údajích a dodržování rutin',
    defaultEnabled: true,
  },
] as const

export type NotificationPrefId = (typeof NOTIFICATION_PREF_ITEMS)[number]['id']

export type NotificationPrefs = Record<NotificationPrefId, boolean>

export function defaultNotificationPrefs(): NotificationPrefs {
  return Object.fromEntries(
    NOTIFICATION_PREF_ITEMS.map((item) => [item.id, item.defaultEnabled]),
  ) as NotificationPrefs
}

export function loadNotificationPrefs(): NotificationPrefs {
  const defaults = defaultNotificationPrefs()
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>
    const next = { ...defaults }
    for (const item of NOTIFICATION_PREF_ITEMS) {
      if (typeof parsed[item.id] === 'boolean') {
        next[item.id] = parsed[item.id] as boolean
      }
    }
    return next
  } catch {
    return defaults
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs))
}
