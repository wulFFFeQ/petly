export const COMMUNITY_REPORTS_KEY = 'lovedandknown.communityReports'

export type CommunityReportTarget = 'post' | 'comment'

export interface CommunityReport {
  id: string
  target: CommunityReportTarget
  postId: string
  commentId?: string
  createdAt: number
  note?: string
}

function loadRaw(): CommunityReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(COMMUNITY_REPORTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CommunityReport =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as CommunityReport).id === 'string' &&
        typeof (item as CommunityReport).postId === 'string',
    )
  } catch {
    return []
  }
}

function saveRaw(reports: CommunityReport[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COMMUNITY_REPORTS_KEY, JSON.stringify(reports))
  } catch {
    // ignore
  }
}

export function loadCommunityReports(): CommunityReport[] {
  return loadRaw()
}

export function addCommunityReport(input: {
  target: CommunityReportTarget
  postId: string
  commentId?: string
  note?: string
}): CommunityReport {
  const report: CommunityReport = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    target: input.target,
    postId: input.postId,
    commentId: input.commentId,
    createdAt: Date.now(),
    note: input.note,
  }
  const next = [report, ...loadRaw()]
  saveRaw(next)
  return report
}
