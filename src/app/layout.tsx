import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { auth } from '@/auth'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: "Fork'd", template: "%s | Fork'd" },
  description: 'Track your favorite places and meals',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: "Fork'd" },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f97316',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="en">
      <body className={jakarta.className}>
        <SessionProvider session={session}>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: { borderRadius: '12px', fontSize: '14px' },
              success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
