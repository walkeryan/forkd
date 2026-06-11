// Admin gating. ADMIN_EMAILS is a comma-separated list set per deployment
// (never committed) — e.g. ADMIN_EMAILS=owner@example.com in the stack .env.
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.toLowerCase())
}
