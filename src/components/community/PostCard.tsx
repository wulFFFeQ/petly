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
    <Card variant="elevated" padding="md" className="transition-all duration-200 hover:border-[#D1E0D8]">
      {/* Post Author Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={post.avatar} alt={post.author} size="md" goldRing={post.liked} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#191E1B]">{post.author}</span>
              {post.badge && (
                <Badge variant="primary" size="sm">
                  {post.badge}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#7D8B82] mt-0.5">
              <span>{post.time}</span>
              {post.petTag && (
                <>
                  <span>·</span>
                  <span className="text-[#2C4A3E] font-medium">{post.petTag}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          className="text-[#A3AEA7] hover:text-[#191E1B] p-1.5 rounded-lg transition-colors"
          aria-label="Možnosti"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Post Text */}
      <p className="mt-4 text-sm leading-relaxed text-[#191E1B] font-normal">
        {post.text}
      </p>

      {/* Post Image */}
      {post.image && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#E8E4DC] max-h-96 bg-stone-100">
          <img
            src={post.image}
            alt=""
            className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-[1.02]"
          />
        </div>
      )}

      {/* Post Actions Bar */}
      <div className="mt-4 pt-3 border-t border-[#F0EDE6] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => toggleLike(post.id)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold py-1 px-2.5 rounded-lg transition-all duration-200 cursor-pointer',
              post.liked
                ? 'text-rose-600 bg-rose-50'
                : 'text-[#4A564F] hover:bg-[#FAF8F5] hover:text-rose-600',
            )}
          >
            <Heart
              size={17}
              fill={post.liked ? 'currentColor' : 'none'}
              className={cn('transition-transform', post.liked && 'scale-110')}
            />
            <span>{post.likes}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold py-1 px-2.5 rounded-lg transition-colors cursor-pointer',
              showComments
                ? 'text-[#2C4A3E] bg-[#EBF2EE]'
                : 'text-[#4A564F] hover:bg-[#FAF8F5] hover:text-[#2C4A3E]',
            )}
          >
            <MessageCircle size={17} />
            <span>
              {post.commentsCount > 0 ? `${post.commentsCount} komentářů` : 'Komentovat'}
            </span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#7D8B82] hover:text-[#191E1B] py-1 px-2.5 rounded-lg hover:bg-[#FAF8F5] transition-colors cursor-pointer"
        >
          <Share2 size={16} />
          <span className="hidden sm:inline">Sdílet</span>
        </button>
      </div>

      {/* Expandable Comments Drawer */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-[#F0EDE6] space-y-3 animate-in fade-in duration-150">
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-2.5 mb-3">
              {post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-2.5 bg-[#FAF8F5] p-3 rounded-xl text-xs"
                >
                  <Avatar src={comment.avatar} alt={comment.author} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#191E1B]">
                        {comment.author}
                      </span>
                      <span className="text-[10px] text-[#7D8B82]">
                        {comment.time}
                      </span>
                    </div>
                    <p className="mt-1 text-[#4A564F]">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New comment input */}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Napište promyšlený komentář..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 h-9 rounded-xl border border-[#E8E4DC] bg-white px-3 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#2C4A3E] focus:ring-2 focus:ring-[#2C4A3E]/10"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="h-9 px-3 rounded-xl bg-[#2C4A3E] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#20362E] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Send size={13} />
              <span>Odeslat</span>
            </button>
          </form>
        </div>
      )}
    </Card>
  )
}
