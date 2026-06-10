'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Map, Plus, Bookmark, User } from 'lucide-react'

const tabs = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/places', icon: MapPin, label: 'Places' },
  { href: '/map', icon: Map, label: 'Map' },
  { href: '/add', icon: Plus, label: 'Add' },
  { href: '/wishlist', icon: Bookmark, label: 'Wishlist' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-stone-200/70 shadow-[0_-4px_20px_-8px_rgba(28,25,23,0.08)] z-50 pb-safe">
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)

          // The Add tab is the app's primary action — raised gradient button.
          if (label === 'Add') {
            return (
              <Link key={href} href={href} aria-label="Add place" className="flex-1 flex flex-col items-center pt-2 pb-1.5 gap-0.5 text-[10px] font-medium text-stone-400">
                <span className="flex items-center justify-center w-11 h-11 -mt-5 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 ring-4 ring-[#faf6f1] active:scale-90 transition-transform">
                  <Plus className="w-6 h-6" />
                </span>
                <span>Add</span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center pt-2 pb-1.5 gap-0.5 text-[11px] font-medium transition-colors duration-200 ${active ? 'text-orange-600' : 'text-stone-400'}`}
            >
              <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors duration-200 ${active ? 'bg-orange-100' : ''}`}>
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.8} />
              </span>
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
