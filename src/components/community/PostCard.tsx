import {
  Flag,
  Heart,
  Link2,
  MessageCircle,
  Share2,
  Send,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { copyTextToClipboard } from '../../lib/clipboard'
import type { CommunityPost } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

const CURRENT_USER_NAME = 'Tereza V.'

interface PostCardProps {
  post: CommunityPost
}

export function PostCard({ post }: PostCardProps) {
  const { toggleLike, addComment, deletePost, showToast } = useApp()
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isOwnPost = post.author === CURRENT_USER_NAME

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/community?post=${encodeURIComponent(post.id)}`
    const copied = await copyTextToClipboard(shareUrl)
    if (copied) {
      showToast(
        'Odkaz zkopírován do schránky',
        'Příspěvek z komunity je připraven ke sdílení.',
        'gold',
      )
    } else {
      showToast(
        'Kopírování se nepodařilo',
        'Zkuste odkaz zkopírovat ručně z adresního řádku.',
        'info',
      )
    }
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    addComment(post.id, commentText)
    setCommentText('')
  }

  return (
    <Card
      variant="default"
      padding="sm"
      className="border-[#E8E4DC]/80 transition-colors duration-200 hover:border-[#D1E0D8]"
    >
      {/* Post Author Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar src={post.avatar} alt={post.author} size="sm" goldRing={post.liked} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-sm text-[#191E1B]">{post.author}</span>
              {post.badge && (
                <Badge variant="primary" size="sm" className="max-w-full truncate">
                  {post.badge}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#7D8B82] mt-0.5">
              <span>{post.time}</span>
              {post.petTag && (
                <>
                  <span>·</span>
                  <span className="text-[#234B54] font-medium">{post.petTag}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Možnosti příspěvku"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={cn(
              'rounded-lg p-1.5 transition-colors cursor-pointer',
              menuOpen
                ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                : 'text-[#5A6660] hover:bg-[#FAF8F5] hover:text-[#191E1B]',
            )}
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-[#E8E4DC] bg-white py-1 shadow-[0_12px_32px_rgba(25,30,27,0.1)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  void handleShare()
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[#191E1B] transition-colors hover:bg-[#FAF8F5] cursor-pointer"
              >
                <Link2 size={14} className="shrink-0 text-[#2C4A3E]" />
                Kopírovat odkaz
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setShowComments(true)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[#191E1B] transition-colors hover:bg-[#FAF8F5] cursor-pointer"
              >
                <MessageCircle size={14} className="shrink-0 text-[#2C4A3E]" />
                Komentáře
              </button>
              {isOwnPost ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    deletePost(post.id)
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 size={14} className="shrink-0" />
                  Smazat příspěvek
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    showToast(
                      'Příspěvek nahlášen',
                      'Děkujeme. Podíváme se na to co nejdřív.',
                      'info',
                    )
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[#191E1B] transition-colors hover:bg-[#FAF8F5] cursor-pointer"
                >
                  <Flag size={14} className="shrink-0 text-[#2C4A3E]" />
                  Nahlásit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text */}
      <p className="mt-3 text-sm leading-relaxed text-[#4A564F]">
        {post.text}
      </p>

      {/* Post Image */}
      {post.image && (
        <div className="mt-3 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-[#E8E4DC]/70">
          <img
            src={post.image}
            alt=""
            className="max-h-72 w-full object-cover object-center"
          />
        </div>
      )}

      {/* Post Actions Bar */}
      <div className="mt-3 pt-3 border-t border-[#F0EDE6]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleLike(post.id)}
            className={cn(
              'flex items-center gap-1 text-[11px] font-medium py-1 px-2 rounded-lg transition-colors duration-200 cursor-pointer',
              post.liked
                ? 'text-rose-600 bg-rose-50/80'
                : 'text-[#5A6660] hover:bg-[#FAF8F5] hover:text-rose-600',
            )}
          >
            <Heart
              size={15}
              fill={post.liked ? 'currentColor' : 'none'}
            />
            <span>{post.likes}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={cn(
              'flex items-center gap-1 text-[11px] font-medium py-1 px-2 rounded-lg transition-colors cursor-pointer',
              showComments
                ? 'text-[#234B54] bg-[#EBF2EE]/80'
                : 'text-[#5A6660] hover:bg-[#FAF8F5] hover:text-[#234B54]',
            )}
          >
            <MessageCircle size={15} />
            <span>
              {post.commentsCount > 0 ? `${post.commentsCount} komentářů` : 'Komentovat'}
            </span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-[11px] font-medium text-[#7D8B82] hover:text-[#4A564F] py-1 px-2 rounded-lg hover:bg-[#FAF8F5] transition-colors cursor-pointer"
        >
          <Share2 size={14} />
          <span className="hidden sm:inline">Sdílet</span>
        </button>
      </div>

      {/* Expandable Comments Drawer */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-[#F0EDE6]/80 space-y-2.5">
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-2 mb-2">
              {post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-2 bg-[#FAF8F5]/90 p-2.5 rounded-lg text-xs"
                >
                  <Avatar src={comment.avatar} alt={comment.author} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#191E1B]">
                        {comment.author}
                      </span>
                      <span className="shrink-0 text-[10px] text-[#7D8B82]">
                        {comment.time}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[#4A564F] leading-relaxed">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Napište promyšlený komentář..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 h-8 rounded-lg border border-[#E8E4DC] bg-white px-3 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#2C4A3E] focus:ring-2 focus:ring-[#2C4A3E]/10"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="h-8 px-2.5 rounded-lg bg-[#2C4A3E] text-white text-[11px] font-semibold disabled:opacity-40 hover:bg-[#20362E] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Send size={12} />
              <span>Odeslat</span>
            </button>
          </form>
        </div>
      )}
    </Card>
  )
}
