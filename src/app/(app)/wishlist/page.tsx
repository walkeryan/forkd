import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Bookmark } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import WishlistClient, { type WishlistEntry } from './WishlistClient'

export default async function WishlistPage() {
  const session = await auth()
  const items = await prisma.wishlistItem.findMany({
    where: { userId: session!.user!.id },
    include: { place: true },
    orderBy: { addedAt: 'desc' },
  })

  const entries: WishlistEntry[] = items.map((i) => ({
    id: i.id,
    placeId: i.place.id,
    name: i.place.name,
    city: i.place.city,
    state: i.place.state,
    notes: i.notes,
    website: i.place.website,
    imagePath: i.place.imagePath,
    cuisine: i.place.cuisine,
  }))

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 mb-1">Wishlist</h1>
      <p className="text-sm text-stone-500 mb-6">
        {entries.length > 0 ? `${entries.length} place${entries.length !== 1 ? 's' : ''} to try` : 'Places you want to try'}
      </p>
      {entries.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing on your wishlist"
          hint="When you add a place, choose “Add to Wishlist” to save it for later."
          className="py-20"
        />
      ) : (
        <WishlistClient items={entries} />
      )}
    </div>
  )
}
