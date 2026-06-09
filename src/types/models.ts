import type { Prisma } from '@prisma/client'

// The exact shape PlaceDetailPage fetches and hands to PlaceDetailClient.
// Derived from the Prisma query so the UI stays in sync with the schema.
export type UserPlaceWithRelations = Prisma.UserPlaceGetPayload<{
  include: {
    place: true
    meals: true
    visits: true
    photos: true
    tags: { include: { tag: true } }
  }
}>

export type MealWithRelations = UserPlaceWithRelations['meals'][number]
export type VisitWithRelations = UserPlaceWithRelations['visits'][number]
export type PlaceTagWithTag = UserPlaceWithRelations['tags'][number]
