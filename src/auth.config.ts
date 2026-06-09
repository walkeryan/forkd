/**
 * Lightweight auth configuration — no database adapter, no Prisma.
   * Safe to import in Next.js Edge Runtime (middleware).
 *
 * The full auth.ts extends this with the PrismaAdapter for use in
 * server components, API routes, and sign-in/out flows.
   */
import type { NextAuthConfig } from 'next-auth'
  import Google from 'next-auth/providers/google'

  export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' as const },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
}),
  ],
  pages: { signIn: '/signin' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
},
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
},
},
} satisfies NextAuthConfig
