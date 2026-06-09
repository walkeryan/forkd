import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Bookmark } from 'lucide-react'
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
    name: i.place.name,
    city: i.place.city,
    state: i.place.state,
    notes: i.notes,
  }))

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wishlist</h1>
      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nothing on your wishlist</p>
          <p className="text-sm mt-1">When you add a place, choose &ldquo;Add to Wishlist&rdquo; to save it for later.</p>
        </div>
      ) : (
        <WishlistClient items={entries} />
      )}
    </div>
  )
}
