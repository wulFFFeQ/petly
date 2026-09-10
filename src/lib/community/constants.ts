import { SELF_OWNER_ID, getUserDisplayName } from '../discover/owner'

/** Stable author id for the signed-in user's community posts/comments. */
export const COMMUNITY_SELF_AUTHOR_ID = SELF_OWNER_ID

export const COMMUNITY_SELF_AVATAR =
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85'

export function getCommunitySelfAuthorName(): string {
  return getUserDisplayName()
}

export function isCommunitySelfAuthor(authorId?: string, authorName?: string): boolean {
  if (authorId) return authorId === COMMUNITY_SELF_AUTHOR_ID
  if (authorName) return authorName === getCommunitySelfAuthorName()
  return false
}
