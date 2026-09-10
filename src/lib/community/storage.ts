import { communityPosts as seedPosts } from '../../data/mockData'
import type { CommunityPost, PostComment } from '../../types'
import { COMMUNITY_SELF_AUTHOR_ID } from './constants'

export const POSTS_STORAGE_KEY = 'lovedandknown.posts'

function normalizeComment(raw: PostComment): PostComment {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `c_${Date.now()}`,
    author: typeof raw.author === 'string' ? raw.author : 'Neznámý',
    authorId: typeof raw.authorId === 'string' ? raw.authorId : undefined,
    avatar: typeof raw.avatar === 'string' ? raw.avatar : '',
    text: typeof raw.text === 'string' ? raw.text : '',
    time: typeof raw.time === 'string' ? raw.time : '',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : undefined,
  }
}

function normalizePost(raw: CommunityPost, seed?: CommunityPost): CommunityPost {
  const comments = Array.isArray(raw.comments)
    ? raw.comments.map(normalizeComment)
    : seed?.comments
      ? seed.comments.map(normalizeComment)
      : []

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : seed?.id ?? `post_${Date.now()}`,
    author: typeof raw.author === 'string' ? raw.author : seed?.author ?? 'Neznámý',
    authorId:
      typeof raw.authorId === 'string'
        ? raw.authorId
        : seed?.authorId,
    avatar: typeof raw.avatar === 'string' ? raw.avatar : seed?.avatar ?? '',
    badge: typeof raw.badge === 'string' ? raw.badge : seed?.badge,
    time: typeof raw.time === 'string' ? raw.time : seed?.time ?? '',
    text: typeof raw.text === 'string' ? raw.text : seed?.text ?? '',
    image: typeof raw.image === 'string' ? raw.image : seed?.image,
    likes: typeof raw.likes === 'number' ? raw.likes : (seed?.likes ?? 0),
    liked: typeof raw.liked === 'boolean' ? raw.liked : (seed?.liked ?? false),
    petTag: typeof raw.petTag === 'string' ? raw.petTag : seed?.petTag,
    petId: typeof raw.petId === 'string' ? raw.petId : seed?.petId,
    location: typeof raw.location === 'string' ? raw.location : seed?.location,
    locationLat:
      typeof raw.locationLat === 'number' ? raw.locationLat : seed?.locationLat,
    locationLng:
      typeof raw.locationLng === 'number' ? raw.locationLng : seed?.locationLng,
    comments,
    commentsCount: comments.length,
    sourcePhotoId:
      typeof raw.sourcePhotoId === 'string' ? raw.sourcePhotoId : seed?.sourcePhotoId,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : seed?.createdAt,
    editedAt: typeof raw.editedAt === 'number' ? raw.editedAt : seed?.editedAt,
  }
}

/** Missing key → seed. Stored array (incl. []) wins — never re-appends seed posts. */
export function loadPosts(): CommunityPost[] {
  if (typeof window === 'undefined') {
    return seedPosts.map((post) => normalizePost(post, post))
  }
  try {
    const raw = window.localStorage.getItem(POSTS_STORAGE_KEY)
    if (raw === null) {
      return seedPosts.map((post) => normalizePost(post, post))
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return seedPosts.map((post) => normalizePost(post, post))
    }
    return parsed.map((item) => {
      const post = item as CommunityPost
      const seed = seedPosts.find((s) => s.id === post.id)
      return normalizePost(post, seed)
    })
  } catch {
    return seedPosts.map((post) => normalizePost(post, post))
  }
}

export function savePosts(posts: CommunityPost[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload = JSON.stringify(posts)
    if (payload.length > 4_500_000) return
    window.localStorage.setItem(POSTS_STORAGE_KEY, payload)
  } catch {
    // quota — keep in-memory session
  }
}

export function isOwnCommunityPost(post: Pick<CommunityPost, 'authorId' | 'author'>): boolean {
  if (post.authorId) return post.authorId === COMMUNITY_SELF_AUTHOR_ID
  return false
}
