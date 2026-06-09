'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import AddPlaceModal from '@/components/AddPlaceModal'

export default function AddPlaceFab() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  // The nav "Add" tab redirects to /places?add=true so it shares this exact
  // modal. Open on that param, then strip it so refresh/back behave sanely.
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setOpen(true)
      router.replace('/places')
    }
  }, [searchParams, router])

  function handleSuccess(id: string, mode: 'visited' | 'wishlist') {
    setOpen(false)
    toast.success(mode === 'wishlist' ? 'Added to wishlist' : 'Place added')
    router.refresh()
    // Visited places open their detail page; wishlist items go to the list.
    router.push(mode === 'wishlist' ? '/wishlist' : `/places/${id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add place"
        className="fixed bottom-24 right-5 z-40 bg-orange-500 text-white rounded-full p-4 shadow-lg active:scale-95 transition"
      >
        <Plus className="w-6 h-6" />
      </button>
      <AddPlaceModal open={open} onClose={() => setOpen(false)} onSuccess={handleSuccess} />
    </>
  )
}
