'use client'
import toast from 'react-hot-toast'
import { Share2 } from 'lucide-react'

// Web Share API with clipboard fallback — shares a text summary (the recap
// page itself is behind sign-in, so no URL).
export default function ShareRecapButton({ text }: { text: string }) {
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Recap copied — paste it anywhere')
    } catch {
      toast.error('Could not share')
    }
  }

  return (
    <button
      onClick={share}
      className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-orange-500 to-orange-600 text-white font-semibold rounded-2xl py-3.5 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
    >
      <Share2 className="w-5 h-5" /> Share my year
    </button>
  )
}
