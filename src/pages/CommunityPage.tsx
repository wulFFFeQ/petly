import { Sparkles } from 'lucide-react'
import { CreatePostInput } from '../components/community/CreatePostInput'
import { PostCard } from '../components/community/PostCard'
import { Badge } from '../components/ui/Badge'
import { useApp } from '../context/AppContext'

export function CommunityPage() {
  const { posts } = useApp()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="gold" size="sm">
              <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
              Společenský kruh
            </Badge>
            <span className="text-xs text-[#7D8B82] font-medium">
              Ověřená komunita chovatelů
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
            Komunita
          </h1>
          <p className="mt-1 text-sm text-[#4A564F]">
            Spojte se s majiteli mazlíčků ve vašem okolí, sdílejte ověřené tipy a slavte milníky.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <CreatePostInput />
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
