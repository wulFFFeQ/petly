import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { CommunityPost } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

interface PostCardProps {
  post: CommunityPost
}

export function PostCard({ post }: PostCardProps) {
  const { toggleLike, addComment, showToast } = useApp()
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')

  const handleShare = () => {
    showToast('Odkaz zkopírován do schránky', 'Příspěvek z komunity je připraven ke sdílení.', 'gold')
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

        <button
          className="shrink-0 text-[#C5CDC8] hover:text-[#5A6660] p-1 rounded-lg transition-colors"
          aria-label="Možnosti"
        >
          <MoreHorizontal size={16} />
        </button>
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
