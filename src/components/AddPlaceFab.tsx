'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import AddPlaceModal from '@/components/AddPlaceModal'

// Controller for the Add Place modal. The visible entry points are the raised
// Add tab in the bottom nav and the header + button — both link to
// /places?add=true, which this component watches. (The old floating action
// button was removed; the nav Add button replaced it.)
export default function AddPlaceFab() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  // Open on the ?add=true param, then strip it so refresh/back behave sanely.
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

  return <AddPlaceModal open={open} onClose={() => setOpen(false)} onSuccess={handleSuccess} />
}
