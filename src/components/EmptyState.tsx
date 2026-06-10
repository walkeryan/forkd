import type { LucideIcon } from 'lucide-react'

export default function EmptyState({
  icon: Icon,
  title,
  hint,
  className = '',
}: {
  icon: LucideIcon
  title: string
  hint?: string
  className?: string
}) {
  return (
    <div className={`text-center ${className}`}>
      <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
        <Icon className="w-7 h-7 text-orange-400" />
      </div>
      <p className="text-base font-semibold text-stone-700">{title}</p>
      {hint && <p className="text-sm text-stone-400 mt-1 max-w-[240px] mx-auto">{hint}</p>}
    </div>
  )
}
