export default function HomeLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 animate-pulse">
      {/* Branding + greeting */}
      <div className="mb-6">
        <div className="h-11 w-32 bg-gray-200 rounded-lg" />
        <div className="mt-4 h-7 w-40 bg-gray-200 rounded-lg" />
        <div className="mt-2 h-4 w-52 bg-gray-100 rounded" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
            <div className="h-5 w-5 bg-gray-200 rounded" />
            <div className="h-7 w-10 bg-gray-200 rounded" />
            <div className="h-3 w-12 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1 h-12 bg-gray-200 rounded-2xl" />
        <div className="flex-1 h-12 bg-gray-100 rounded-2xl" />
      </div>

      {/* Recent activity */}
      <div className="h-6 w-36 bg-gray-200 rounded mb-3" />
      <div className="space-y-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="h-8 w-8 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
              <div className="h-3 w-1/3 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-12 bg-gray-100 rounded shrink-0" />
          </div>
        ))}
      </div>

      {/* Wishlist preview */}
      <div className="h-6 w-32 bg-gray-200 rounded mb-3" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="h-8 w-8 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
              <div className="h-3 w-1/3 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
