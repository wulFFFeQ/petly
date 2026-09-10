import type { AppNotification } from '../../types'
import { migrateNotificationList } from './upsert'

/** First-run seed when localStorage has no notifications yet. */
export function buildSeedNotifications(): AppNotification[] {
  const now = Date.now()
  const raw = [
    {
      id: 'n1',
      type: 'vaccination',
      title: 'Naplánováno očkování proti vzteklině u Luny',
      message: 'Za 12 dní · 24. 9.',
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      unread: true,
      priority: 'normal',
      dedupeKey: 'seed:vax-luna',
      petId: 'luna',
      petName: 'Luna',
      href: '/pets/luna?tab=health',
      time: 'Za 12 dní · 24. 9.',
    },
    {
      id: 'n2',
      type: 'vet',
      title: 'Rutinní dentální prohlídka u Mila',
      message: 'Zítra v 14:30 · MUDr. Novák',
      createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      unread: true,
      priority: 'important',
      dedupeKey: 'seed:dental-milo',
      petId: 'milo',
      petName: 'Milo',
      href: '/calendar',
      time: 'Zítra v 14:30 · MUDr. Novák',
    },
    {
      id: 'n3',
      type: 'community',
      title: 'Sarah K. se líbí váš příspěvek',
      message: 'Komunita · před 2 hodinami',
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      unread: false,
      priority: 'normal',
      dedupeKey: 'seed:community-like',
      href: '/community',
      time: 'před 2 hodinami',
    },
  ]
  return migrateNotificationList(raw)
}
