import { redirect } from 'next/navigation'

// The bottom-nav "Add" tab used to render an inferior manual-only form. It now
// redirects into the same Google Places modal used by the FAB on the places
// list, so there is a single canonical add flow (see P0.3).
export default function AddPlacePage() {
  redirect('/places?add=true')
}
