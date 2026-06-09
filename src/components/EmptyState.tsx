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
    <div className={`text-center text-gray-400 ${className}`}>
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="text-lg font-medium">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  )
}
