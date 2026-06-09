import { auth } from '@/auth'
import { signOut } from '@/auth'
import Image from 'next/image'

export default async function ProfilePage() {
  const session = await auth()
  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-4">
        {session?.user?.image && (
          <Image src={session.user.image} alt="" width={48} height={48} className="rounded-full" />
        )}
        <div>
          <p className="font-semibold text-gray-900">{session?.user?.name}</p>
          <p className="text-sm text-gray-400">{session?.user?.email}</p>
        </div>
      </div>
      <form action={async () => { 'use server'; await signOut({ redirectTo: '/signin' }) }}>
        <button type="submit" className="w-full border border-red-200 text-red-500 rounded-xl py-3 text-sm font-medium">
          Sign Out
        </button>
      </form>
    </div>
  )
}
