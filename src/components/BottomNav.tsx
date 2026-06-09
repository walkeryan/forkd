'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Map, PlusCircle, Bookmark, User } from 'lucide-react'

const tabs = [
  { href: '/places', icon: MapPin, label: 'Places' },
  { href: '/map', icon: Map, label: 'Map' },
  { href: '/add', icon: PlusCircle, label: 'Add' },
  { href: '/wishlist', icon: Bookmark, label: 'Wishlist' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs ${active ? 'text-orange-500' : 'text-gray-400'}`}>
              <Icon className={`w-6 h-6 ${label === 'Add' ? 'w-7 h-7' : ''}`} strokeWidth={active ? 2.5 : 1.5} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
