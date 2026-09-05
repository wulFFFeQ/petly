import { CreatePostInput } from '../components/community/CreatePostInput'
import { PostCard } from '../components/community/PostCard'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'

export function CommunityPage() {
  const { posts } = useApp()

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
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
