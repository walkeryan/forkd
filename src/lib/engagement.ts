// Streak + badge logic. Pure functions, client-safe — run them in the
// browser so "this week" means the user's timezone, not the server's (UTC).

/**
 * Monday-start week index for a local date. Uses date-only UTC day numbers so
 * DST transitions can't skew the arithmetic. Epoch day 0 = Thu 1970-01-01,
 * so +3 aligns week boundaries to Mondays.
 */
function weekIndex(d: Date): number {
  const dayNumber = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
  return Math.floor((dayNumber + 3) / 7)
}

/** Consecutive weeks with at least one visit, ending this week (or last —
 * the streak stays alive until a full week is missed). */
export function weekStreak(dates: Date[]): number {
  if (dates.length === 0) return 0
  const weeks = new Set(dates.map(weekIndex))
  let cursor = weekIndex(new Date())
  if (!weeks.has(cursor)) cursor -= 1
  let streak = 0
  while (weeks.has(cursor)) {
    streak++
    cursor -= 1
  }
  return streak
}

export function visitsThisWeek(dates: Date[]): number {
  const now = weekIndex(new Date())
  return dates.filter((d) => weekIndex(d) === now).length
}

export interface BadgeInput {
  visits: number
  places: number
  meals: number
  photos: number
  mealNames: string[]
}

export interface Badge {
  id: string
  emoji: string
  name: string
  desc: string
  goal: number
  progress: number
  earned: boolean
}

const countMatching = (pattern: RegExp, names: string[]) => names.filter((n) => pattern.test(n)).length

const BADGE_DEFS: { id: string; emoji: string; name: string; desc: string; goal: number; value: (i: BadgeInput) => number }[] = [
  { id: 'first-bite', emoji: '🍽️', name: 'First Bite', desc: 'Log your first visit', goal: 1, value: (i) => i.visits },
  { id: 'regular', emoji: '📅', name: 'Regular', desc: 'Log 10 visits', goal: 10, value: (i) => i.visits },
  { id: 'connoisseur', emoji: '🏆', name: 'Connoisseur', desc: 'Log 50 visits', goal: 50, value: (i) => i.visits },
  { id: 'explorer', emoji: '🧭', name: 'Explorer', desc: 'Track 5 different places', goal: 5, value: (i) => i.places },
  { id: 'globetrotter', emoji: '🌎', name: 'Globetrotter', desc: 'Track 25 different places', goal: 25, value: (i) => i.places },
  { id: 'foodie', emoji: '🍜', name: 'Foodie', desc: 'Log 25 meals', goal: 25, value: (i) => i.meals },
  { id: 'shutterbug', emoji: '📸', name: 'Shutterbug', desc: 'Add 10 photos', goal: 10, value: (i) => i.photos },
  { id: 'pizza-scholar', emoji: '🍕', name: 'Pizza Scholar', desc: 'Log 10 pizzas', goal: 10, value: (i) => countMatching(/pizza/i, i.mealNames) },
  { id: 'taco-titan', emoji: '🌮', name: 'Taco Titan', desc: 'Log 10 tacos', goal: 10, value: (i) => countMatching(/taco/i, i.mealNames) },
  { id: 'burger-boss', emoji: '🍔', name: 'Burger Boss', desc: 'Log 10 burgers', goal: 10, value: (i) => countMatching(/burger/i, i.mealNames) },
]

export function computeBadges(input: BadgeInput): Badge[] {
  return BADGE_DEFS.map((def) => {
    const progress = Math.min(def.value(input), def.goal)
    return { id: def.id, emoji: def.emoji, name: def.name, desc: def.desc, goal: def.goal, progress, earned: progress >= def.goal }
  })
}
