# Fork'd

A food journal app to track your favorite places and meals. Save spots to a wishlist, log visits, and rate meals over time so you remember what was actually good.

Built with [Next.js](https://nextjs.org), Prisma, NextAuth, and the Google Maps JavaScript API.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

The app runs on [http://localhost:3333](http://localhost:3333).

## Environment

Copy `.env.example` to `.env` and fill in the required values (database URL, Google OAuth credentials, and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).

## Deployment

A `Dockerfile` and `docker-compose.yml` are included for containerized deployment. Database migrations run automatically on container start via `docker-entrypoint.sh`.
