import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreatePostInput } from '../components/community/CreatePostInput'
import { PostCard } from '../components/community/PostCard'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'

export function CommunityPage() {
  const { posts } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const focusPostId = searchParams.get('post')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const orderedPosts = useMemo(() => posts, [posts])

  useEffect(() => {
    if (!focusPostId) return
    const exists = posts.some((post) => post.id === focusPostId)
    if (!exists) {
      setSearchParams({}, { replace: true })
      return
    }

    setHighlightedId(focusPostId)
    const el = document.getElementById(`community-post-${focusPostId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const clearHighlight = window.setTimeout(() => setHighlightedId(null), 4000)
    const clearQuery = window.setTimeout(() => {
      setSearchParams({}, { replace: true })
    }, 500)

    return () => {
      window.clearTimeout(clearHighlight)
      window.clearTimeout(clearQuery)
    }
  }, [focusPostId, posts, setSearchParams])

  return (
    <div className="space-y-5">
      <PageHeader
        badge="Společenský kruh"
        meta="Ověřená komunita chovatelů"
        title="Komunita"
        description="Spojte se s majiteli mazlíčků ve vašem okolí, sdílejte ověřené tipy a slavte milníky."
        className="gap-2 pb-0"
      />

      <div className="mx-auto max-w-2xl space-y-4">
        <CreatePostInput />
        {orderedPosts.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F5]/80 px-6 py-12 text-center"
            data-testid="community-empty"
          >
            <p className="text-sm font-semibold text-[#191E1B]">Zatím žádné příspěvky</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#7D8B82]">
              Buďte první — napište tip, sdílejte fotografii nebo milník vašeho mazlíčka.
            </p>
          </div>
        ) : (
          orderedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              highlighted={highlightedId === post.id}
            />
          ))
        )}
      </div>
    </div>
  )
}
