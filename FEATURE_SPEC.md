# TasteLog — Prioritized Feature Spec

**Reviewed:** June 2026  
**Codebase state:** Next.js 14 App Router, Prisma/PostgreSQL, NextAuth v5 (Google OAuth), local filesystem photo storage, no service worker.

---

## What's Actually Built (Baseline)

The core add/view/rate loop works: you can search for a restaurant via Google Places or enter it manually, rate it 1–5 stars, add price range, notes, meals, visits, and photos. The data model is surprisingly thoughtful — `Visit`, `Meal`, `Photo`, `Tag`, `WishlistItem`, `SharedList` are all in the schema.

The problem is that roughly half the schema is completely unused, two entire nav tabs are stubs, photos will be permanently lost the moment the server restarts, and there are at least three places where the UI directly contradicts what the data says. The app is not embarrassing to look at — the design is clean — but it's embarrassing to use for more than a day.

---

## P0 — Broken / Missing Core Functionality

These are blockers. The app should not be shared with anyone until these are resolved.

---

### P0.1 — Map and Wishlist pages are stubs

**What:** Both `/map` and `/wishlist` render placeholder text. They're the 2nd and 4th items in the bottom navigation, which means users tap them within their first 60 seconds.

**Why:** Two of five nav tabs returning "coming soon" is embarrassing. Users will immediately question whether the app is abandoned. These aren't nice-to-haves — map and wishlist are explicitly surfaced in the navigation.

**How:**
- **Wishlist minimum viable:** Build out `WishlistPage` as a server component. Query `WishlistItem` where `userId = session.user.id`, include `place`. Render the same card style as `/places` but with a "Mark as Visited" button that calls `POST /api/places` and `DELETE /api/wishlist/[id]`. Add `POST /api/wishlist` and `DELETE /api/wishlist/[id]` routes. This is a one-day fix.
- **Map minimum viable:** Use Leaflet (free, no API key needed) or `@vis.gl/react-google-maps` (uses existing GOOGLE_PLACES_API_KEY). Fetch all UserPlaces with lat/lng. Render orange pins for visited, gray pins for wishlist. Tap a pin to open a bottom sheet with the place name and a link to its detail page. Don't ship the Map tab until this is done — or hide it from the nav.

---

### P0.2 — Photos are stored on the local filesystem and will be lost

**What:** `POST /api/photos` writes files to `process.env.UPLOAD_DIR ?? './uploads'` using `sharp`. `GET /api/photos/[id]` reads them back with `readFile`. There is no cloud storage.

**Why:** This is catastrophically broken for any real deployment. On Vercel, the filesystem is ephemeral and writes go to `/tmp` with a 50MB limit — every photo disappears on the next function cold start. Even in the Docker setup, if the container is replaced or the volume isn't configured, photos are gone forever. A user who takes 10 photos of their meals comes back the next day to broken images. That's trust-destroying.

**How:** Replace local disk I/O with an object store. The lowest-friction path:
- Add `@aws-sdk/client-s3` (or use Cloudflare R2 which is S3-compatible and cheaper).
- Add `UPLOAD_BUCKET`, `UPLOAD_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or equivalent) to `.env.example`.
- In `POST /api/photos`: `s3.send(new PutObjectCommand({ Bucket, Key: relativePath, Body: buffer, ContentType: 'image/webp' }))`.
- In `GET /api/photos/[id]`: generate a pre-signed URL (valid for 1 hour) and redirect to it instead of piping the file. This also offloads bandwidth from your Next.js server.
- Update `Photo.path` to store the S3 key rather than a local relative path — the schema is already fine for this.
- Alternative if you want dead-simple: Cloudinary or Uploadthing, which give you a hosted URL directly in the upload response, eliminating the `GET /api/photos/[id]` route entirely.

---

### P0.3 — The `/add` route and the `AddPlaceModal` are two different, divergent add flows

**What:** The bottom nav's "Add" tab links to `/add`, which is a plain manual-entry form (name, address, city, state, notes). The FAB on the `/places` page opens `AddPlaceModal`, which has Google Places search, location-based nearby discovery, and a manual fallback. These are completely separate implementations.

**Why:** Users who tap "Add" in the nav get the inferior experience. The Google Places search — the entire reason photos/addresses/lat-lng get populated correctly — is invisible unless you're already on the places list. Any new user who arrives via the nav will be manually typing place names, which produces garbage data (no coordinates, no deduplication, addresses that don't match the Places database).

**How:** The `/add` route should either redirect to `/places` with the modal open (via a URL param like `?add=true` that `AddPlaceFab` checks), or `/add/page.tsx` should be deleted entirely and replaced with a full-page version of `AddPlaceModal`. The cleaner solution is the second: make `AddPlaceModal` work as both a modal and a standalone page. Pass an `onSuccess` prop — when opened from the FAB it navigates back; when opened as a page it pushes to `/places/[id]`.

---

### P0.4 — No way to delete a place from the UI

**What:** `DELETE /api/places/[id]` exists and works. `PlaceDetailClient.tsx` does not have a delete button anywhere.

**Why:** If you accidentally add the wrong restaurant, or you duplicate a place, you're stuck with it forever. There's no escape hatch. This is embarrassing in a personal tracker.

**How:** Add a "Remove Place" button (ideally tucked in a `…` menu at the top of the detail page to prevent accidental taps) in `PlaceDetailClient.tsx`. On confirm: `DELETE /api/places/${userPlace.id}`, then `router.push('/places')`. Add a confirmation dialog — "Remove this place? Your meals and photos will also be deleted." — because the cascade deletes in the schema will wipe everything.

---

### P0.5 — No way to edit or delete meals or visits

**What:** `POST /api/meals` and `POST /api/visits` exist. There are no PUT/PATCH/DELETE routes for either. The UI has no edit or delete affordances.

**Why:** You misremember the date you visited, or you add a visit twice by accident, or you misspell a dish name. There is no correction path. The only option is living with bad data.

**How:**
- Add `PATCH /api/meals/[id]` and `DELETE /api/meals/[id]`.
- Add `PATCH /api/visits/[id]` and `DELETE /api/visits/[id]`.
- In `PlaceDetailClient`, add swipe-to-delete or a trash icon on each meal and visit row. For meals, inline edit (tap to edit name/description) is the right mobile pattern. For visits, a small pencil icon that expands an edit form inline.

---

### P0.6 — `visitCount` is a denormalized counter that will drift out of sync

**What:** `UserPlace.visitCount` is incremented in `POST /api/visits`. It starts at 0 when a place is first added (even though the user clearly visited — that's why they're adding it). There is no corresponding decrement when visits are deleted (visits can't be deleted yet, but P0.5 will fix that). The places list and detail page display this count as authoritative.

**Why:** A user adds "Primanti Brothers", the count shows 0 visits. They log a visit, it shows 1. They go back and log their actual first visit from last month — now it shows 2, which is correct. But if they later delete a visit, it will show 2 forever unless you also decrement the counter. This will inevitably produce wrong counts.

**How:** Stop trusting the denormalized counter for display. The PlaceDetailClient already fetches `visits` from the DB — use `visits.length` for the display count. Keep `visitCount` for ordering/sorting if needed (it's cheap to query). Add `lastVisited` update logic on visit delete. Or, simplest fix: drop `visitCount` from the display entirely and derive it from `visits.length` on the server. The `visits.slice(0, 5)` in PlaceDetailClient already creates a discrepancy between "Visits (N)" in the section header and the list below — fix this by either fetching all visits or being explicit that you're showing "5 most recent."

---

### P0.7 — Tags are in the schema and are fetched but never shown

**What:** `PlaceDetailClient` receives `tags: { include: { tag: true } }` from the server. There is no tag UI anywhere in the rendered output. The `Tag` and `UserPlaceTag` models exist. There are no API routes for tags.

**Why:** This is dead code that inflates every place detail query. Either build the tags feature or remove the query include until you do. As-is it promises a feature to the database but delivers nothing to the user.

**How (minimum):** If not building tags in this sprint, remove `tags: { include: { tag: true } }` from the Prisma query in `PlaceDetailPage`. When you do build it: add `POST /api/tags`, `DELETE /api/tags/[id]`, `POST /api/places/[id]/tags`, `DELETE /api/places/[id]/tags/[tagId]`. In the UI, render a tag pill section below the notes with an "Add tag" input that shows your existing tags as autocomplete suggestions.

---

### P0.8 — GOOGLE_PLACES_API_KEY is not in .env.example

**What:** The search and nearby routes use `process.env.GOOGLE_PLACES_API_KEY`. The `.env.example` file does not include this key. The error is silenced with a generic 500 response that says "Places service is busy."

**Why:** Any developer setting up this project will have the modal silently fail to search and have no idea why. The error message ("Places service is busy -- try again in a moment.") is actively misleading.

**How:** Add `GOOGLE_PLACES_API_KEY=""` to `.env.example`. Change the error message to "Google Places is not configured — ask the server administrator to add GOOGLE_PLACES_API_KEY." Also note that this app is using the Legacy Places API (Text Search, Nearby Search) which Google has been deprecating in favor of the Places API (New). Worth migrating to avoid eventual breakage.

---

## P1 — Table Stakes

The core loop works once you fix P0, but these gaps make the app feel unfinished compared to any serious notes app, let alone a dedicated restaurant tracker.

---

### P1.1 — No search or filter on the places list

**What:** `/places` shows all your spots ordered by `updatedAt` descending. No search box, no sort control, no filter by rating or tag.

**Why:** Once you have 50 places, this page is unusable. You can't find anything. The whole value of tracking places is being able to answer "what are my best ramen spots?" or "find me somewhere good near downtown."

**How:** Add a sticky search input at the top of PlacesPage. Use a URL search param (`?q=ramen`) so searches are shareable/bookmarkable. On the server, add `where: { place: { name: { contains: q, mode: 'insensitive' } } }` to the Prisma query. Add sort controls: "Recent", "Top Rated", "Most Visited", "Name A–Z". Filter chips for price range ($, $$, $$$, $$$$). This is entirely server-side with no client-side state needed — changing filters just changes the URL params.

---

### P1.2 — No per-visit rating

**What:** `Visit.rating` exists in the schema but the log-visit form only collects date and notes. `UserPlace.rating` is the only rating that gets set, and it's set once for the whole relationship.

**Why:** Your opinion of a restaurant changes over time. The first visit might be great (4 stars), a second visit might be bad (2 stars). You should be able to track this. Meal-level and visit-level ratings are the main thing that makes TasteLog better than a notes app.

**How:** Add a `<StarRating>` to the visit form in PlaceDetailClient. Include it in the `POST /api/visits` body. On the detail page, show the per-visit rating next to the date in the visits list. As a bonus, offer to auto-update the UserPlace rating to the average of all visit ratings (or let it be manual — but show the average as a reference).

---

### P1.3 — Meal rating is in the schema but never collected or shown

**What:** `Meal.rating` is a `Float?` in the schema. The add-meal form collects name, description, and isFavorite (checkbox). No rating.

**Why:** Rating individual dishes is one of the best features of a restaurant tracker. "The tonkotsu ramen is 5 stars, the gyoza is 3 stars" is infinitely more useful than a single place-level rating.

**How:** Add a `<StarRating size="sm">` to the add-meal form. Include `rating` in `POST /api/meals`. Show it in the meals list next to the dish name. Show the favorite star + a numeric rating inline.

---

### P1.4 — Photo delete is missing

**What:** You can upload photos but cannot delete them. There's no delete affordance on any photo.

**Why:** Blurry photos, accidentally uploaded the wrong image, don't want an old photo anymore. This is a basic expectation for any photo feature.

**How:** Add `DELETE /api/photos/[id]`. In the photo grid in PlaceDetailClient, add a long-press or a small × overlay on each photo that confirms then calls the delete route. On the server, delete the S3 object (once P0.2 is done) and the Prisma record.

---

### P1.5 — No "Add to Wishlist" flow anywhere

**What:** `WishlistItem` is in the schema. The wishlist page is a stub (P0.1). But even once you build the wishlist page, there's no way to add to it. The AddPlaceModal only creates a visited place, not a want-to-try item.

**Why:** The most common use case for a restaurant tracker is "I saw this place on Instagram, I want to remember to go." Right now you'd have to add it as a visited place, which is wrong.

**How:** In `AddPlaceModal`, add a toggle after picking a place: "Mark as Visited" (default) or "Add to Wishlist." If wishlist is selected, call `POST /api/wishlist` instead of `POST /api/places`. On the wishlist page, each item should have a "Visited!" button that promotes it to a UserPlace and removes it from the wishlist.

---

### P1.6 — No photo lightbox

**What:** The photo grid in PlaceDetailClient renders 3-column thumbnails. Tapping a photo does nothing.

**Why:** Thumbnails in a 3-column grid on a phone are tiny. The only reason you'd look at your food photos is to reminisce or show someone. You need to be able to see them full size.

**How:** When a photo thumbnail is tapped, open a full-screen overlay (a simple CSS `position: fixed; inset: 0; background: black` div) with the image centered. Swipe left/right to navigate between photos. Tap to dismiss. No library needed — a few `useState` hooks and touch event listeners.

---

### P1.7 — First-visit is never logged when a place is added

**What:** When you add a place, `UserPlace.visitCount` starts at 0 and no `Visit` record is created. If you just came back from dinner and you're adding the restaurant, you have to separately tap "Log Visit" to record that you were there.

**Why:** The most common flow is "I just ate somewhere great, let me log it." The current flow forces two separate actions. The add flow should ask: "When did you visit?" and default to today.

**How:** In `AddPlaceModal` (or the add flow result), after picking a place show a quick "Log your visit" step: date (defaulting to today), rating, quick notes. This creates both a `UserPlace` and a `Visit` atomically in `POST /api/places`. Make it skippable with "I'll do this later."

---

### P1.8 — No "back" navigation on the place detail page

**What:** `PlaceDetailClient` has no back button. The only way to get back to the places list is to tap "Places" in the bottom nav (which works) or use the browser back gesture. On mobile, the back gesture works fine, but there's no affordance in the UI — especially confusing for users coming from deep link or share.

**How:** Add a `<button onClick={() => router.back()}>` with a `<ArrowLeft>` icon in the header. Or a breadcrumb "← My Places". The `max-w-lg mx-auto` layout already looks like a detail page — it just needs the navigation chrome.

---

## P2 — Differentiated Value

This is what would make someone choose TasteLog over just using Google Maps saved places or a notes app.

---

### P2.1 — Map view with your places

**What:** A full-screen map showing all your tracked places as pins — orange for visited, blue for wishlist. Tap a pin to see name, rating, and a "View" link.

**Why:** A map is the most spatially intuitive way to answer "what's good near where I am right now?" or "where did we go when we visited that neighborhood?" Google Maps saved places has this. You need it too.

**How:** Use `@vis.gl/react-google-maps` (uses the same API key you already have) or Leaflet with OpenStreetMap tiles (free, no key needed). Create a `MapClient` component in `src/app/(app)/map/`. Fetch all UserPlaces with lat/lng via `GET /api/places`. Filter out places with null coordinates (manual entries without geocoding). Render a `<Map>` with an `<AdvancedMarker>` per place. On marker click, show a bottom sheet (or info window) with the place card. Include a "Near me" button that re-centers to the user's GPS location and highlights places within 1km.

---

### P2.2 — Tags with filter support

**What:** Create custom tags ("date night", "ramen", "solo lunch", "chain", "cash only") and attach them to places. Filter the places list by tag.

**Why:** Cuisine type from Google Places is too coarse (everything is "food" or "restaurant"). Your personal taxonomy is what makes the data yours. "Date night spots" or "places dad would love" is information no map app has.

**How:** Build out the tag system (see P0.7 for the API changes needed). Add a tag pill component that shows existing tags with an × to remove, and an input with autocomplete against your existing tags. Add tag filter chips to the places list page. Tag matching: `WHERE userPlaceTag.tagId IN [selected tag ids]`.

---

### P2.3 — Statistics / year in review

**What:** A stats section on the profile page: total places visited, total visits, average rating, most visited place, most recent new place, visits by month (a small bar chart), top-rated places.

**Why:** This is the "I'm glad I tracked this" payoff. When you can see "you tried 47 new restaurants this year" or "you visited Primanti Brothers 12 times," the app feels worth keeping. It also surfaces the data in a way that makes you want to add more.

**How:** Add an async Prisma aggregate query to `ProfilePage`:
```typescript
const [placeCount, visitCount, avgRating] = await Promise.all([
  prisma.userPlace.count({ where: { userId, status: 'visited' } }),
  prisma.visit.count({ where: { userPlace: { userId } } }),
  prisma.userPlace.aggregate({ where: { userId, rating: { not: null } }, _avg: { rating: true } }),
])
```
Use `recharts` or a simple CSS bar chart for the monthly breakdown — no heavy charting library needed for sparkline-level stats.

---

### P2.4 — Shareable lists

**What:** Generate a public shareable link for a curated list of your places. "My top 10 ramen spots in Pittsburgh" → `tastelog.com/s/abc123`.

**Why:** The schema already has `SharedList` with `slug` and `isPublic`. This is the feature that gets you word-of-mouth installs. You share a link in a group chat, people see a beautiful list of restaurants with your ratings and photos, and some of them install the app to make their own.

**How:**
- `SharedList` currently only has a title and userId — add a `SharedListPlace` junction model (or just serialize place IDs into a JSON field).
- Create `GET /s/[slug]/page.tsx` — a public, unauthenticated page that renders the list. No middleware auth check (update `middleware.ts` to allow `/s/*`).
- Add a "Share" button on ProfilePage that opens a flow to create/name a list and pick places from your tracked places.
- The public page should be beautiful and shareable — OG meta tags with the list title and a preview of the places.

---

### P2.5 — "What to order here" quick view

**What:** When you open a place detail, prominently show your favorite dishes (meals with `isFavorite: true`) at the very top, before the rating, notes, and full meal list.

**Why:** The most practical use of this app is being at a restaurant and remembering what you ordered last time and what was good. Right now you have to scroll through the entire detail page to find the favorites. This should be the first thing you see.

**How:** In `PlaceDetailClient`, if `meals.some(m => m.isFavorite)`, render a "Must Order" card at the very top of the page below the header — a horizontal scroll of pill badges for each favorite meal. Simple, fast, useful.

---

### P2.6 — Nearby places from your own list

**What:** A "Near Me" mode on the places list that shows only your tracked places within X km of your current GPS location, sorted by distance.

**Why:** The answer to "where should we eat tonight?" is somewhere you've been before and rated highly. Right now there's no way to quickly filter your list to what's geographically relevant.

**How:** Add a "Near me" button to PlacesPage that triggers `navigator.geolocation.getCurrentPosition`. Once you have lat/lng, compute distance client-side for all places that have coordinates using the Haversine formula. Sort by distance and filter to <5km (with a slider or quick presets: 1km, 5km, 10km). This is pure client-side math — no new API routes needed.

---

## P3 — Delight Features

Nice-to-haves for a mature v2, after P0–P2 are solid.

---

### P3.1 — PWA offline support with a service worker

**What:** A service worker that caches the app shell and your places list so the app loads when you're offline (e.g., inside a restaurant with bad signal).

**Why:** This is a PWA. Users will install it expecting native-app-like reliability. A blank screen when offline breaks that contract completely.

**How:** Add `next-pwa` or write a minimal Workbox config. Cache strategy: app shell (stale-while-revalidate), API responses for places/meals/visits (cache-first with a 5-minute TTL). Queue photo uploads when offline and sync on reconnect. At minimum, show a cached version of the places list instead of a network error.

---

### P3.2 — Cuisine category stored on Place

**What:** The Google Places API returns `types` (e.g., `["ramen_restaurant", "japanese_restaurant", "restaurant"]`). The `normalizeGooglePlace` function saves only `types[0]` as `placeType` but this field is never stored on the `Place` model — it's passed to the frontend but then discarded at `POST /api/places`.

**Why:** Cuisine type is the single most useful filter for a restaurant tracker. "Show me all my Japanese food spots" or "which Thai places have I rated 4+ stars" requires this field.

**How:** Add `cuisine String?` to the `Place` model (or `placeTypes String[]` for Postgres arrays). In `POST /api/places`, save `placeType` to the `Place` record. Use it as a filter facet on the places list.

---

### P3.3 — Photo attribution to visit

**What:** When logging a visit with photos, the photos should be linked to that visit, not just the UserPlace. Currently the visit form has no photo upload, and photos are always attached at the UserPlace level.

**Why:** "Photos from my first visit vs. my most recent visit" tells a story. It also lets you see the food degradation over time (or improvement after a chef change).

**How:** After successfully logging a visit, show a "Add photos from this visit" step. In the photo upload, pass `visitId` in the FormData. The DB schema already supports this — `Photo.visitId` exists. The photos API already accepts `visitId`. Just wire up the UI.

---

### P3.4 — Pull-to-refresh gesture

**What:** A pull-to-refresh interaction on the places list and detail page.

**Why:** Mobile users expect this gesture. The current approach is `router.refresh()` which fires on explicit user actions but there's no natural "refresh" affordance.

**How:** Implement a `usePullToRefresh` hook that listens for `touchstart`/`touchmove`/`touchend`, shows a spinner when pulled >60px, and calls `router.refresh()` on release. About 30 lines of vanilla JS.

---

### P3.5 — "Haven't been in a while" surface

**What:** On the places list, highlight places you haven't visited in 90+ days that you've rated 4 or 5 stars.

**Why:** The app accumulates a great personal database that you then forget to use. A passive prompt — "You haven't been to Oak & Iron in 4 months" as a subtle badge on the card — is the killer retention mechanic for a tracker app.

**How:** In the places list query, compare `lastVisited` to `new Date() - 90 days` for places with `rating >= 4`. Show a small flame or clock badge on those cards. No notification needed — just a visual cue in the list.

---

### P3.6 — Import from Google Maps Saved Places

**What:** Let users upload a Google Takeout JSON export of their saved places and bulk-import them as UserPlaces (or WishlistItems).

**Why:** Many users already have years of saved restaurants in Google Maps. The barrier to starting TasteLog from scratch is "I have to re-add everything." An import flow removes that barrier entirely.

**How:** Build `POST /api/import/google-maps`. Parse the Takeout JSON format (`Saved Places.json`). For each place, look up via Google Places API by `googlePlaceId` (available in the export). Create `Place` and `UserPlace` records, skipping duplicates. This is a background job — respond with a job ID and poll for completion.

---

## Cross-Cutting Issues

These apply across the whole app and should be addressed in parallel with the above:

**Error handling is missing everywhere.** `logVisit`, `addMeal`, `saveDetails` in `PlaceDetailClient` have no error states. If the API fails, the UI silently does nothing. Every async action needs a try/catch with a visible error message.

**Loading states are inconsistent.** `saveRating` fires the PATCH and immediately calls `router.refresh()` — there's no loading indicator and the refresh might race with the render. The rating save should disable the stars during the request.

**`any` types everywhere in PlaceDetailClient.** The `/* eslint-disable @typescript-eslint/no-explicit-any */` at the top of the file means you've opted out of type safety for the entire detail view. Create a proper `UserPlaceWithRelations` type derived from the Prisma `include` shape and use it. The schema is well-typed — use it.

**The legacy Google Places API is deprecated.** `textsearch/json` and `nearbysearch/json` are the old Places API. Google has been pushing the new `places.googleapis.com` API. Plan a migration before Google sunsets the old endpoints — the new API has better data and a more predictable pricing model.

**`PrismaClient` logs queries in development** (`log: ['query']` in `prisma.ts`). This is fine for dev but make sure it's stripped or conditional in production — Prisma query logs include full SQL with parameter values and shouldn't be in production stdout.

**The manifest is missing `maskable` icons.** PWA icons should include a `"purpose": "maskable"` variant for Android home screen display. Without this, Android adds a white border around the icon.
