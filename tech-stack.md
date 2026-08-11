# Tech Stack

## Frontend
- **React** with **TypeScript**
- **Tailwind CSS**
- **React Router** for routing

## Backend
- **Node.js** with **TypeScript**
- **Express**
- Auth via **database sessions** (stored in PostgreSQL, cookie-based)

## Database
- **PostgreSQL**
- **Prisma** as the ORM

## AI
- Any 100% free approach, or a **free model via OpenRouter**

## Email
- **SendGrid** or **Mailgun** (free tier)
- Used for inbound email ingestion and outbound reply delivery

## Deployment
- **Docker**
- A 100% free cloud provider (e.g., Render, Railway, Oracle Cloud Free Tier, or Google Cloud Free Tier)

## Notes / Constraints
- All providers selected for their free tiers — be aware of their limits:
  - SendGrid free tier: 100 emails/day
  - Mailgun free tier: 100 emails/day for first 3 months
  - OpenRouter free models: rate-limited, subject to availability
- Database sessions mean session records live in Postgres; may need a cron cleanup job to purge expired sessions
- Inbound email ingestion approach (IMAP polling vs. webhook) still pending
