/** Czech relative time from a unix ms timestamp. */
export function formatRelativeCzech(createdAt: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - createdAt)
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) return 'Právě teď'
  if (minutes < 60) return `před ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours === 1) return 'před 1 hodinou'
  if (hours >= 2 && hours <= 4) return `před ${hours} hodinami`
  if (hours < 24) return `před ${hours} hodinami`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Včera'
  if (days < 7) return `před ${days} dny`

  const date = new Date(createdAt)
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`
}

export function formatCommentDisplayTime(
  comment: { time: string; createdAt?: number },
  now: number = Date.now(),
): string {
  if (comment.createdAt != null) return formatRelativeCzech(comment.createdAt, now)
  return comment.time
}
