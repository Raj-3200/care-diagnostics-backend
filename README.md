# Care Diagnostics LIMS Backend

Express, Prisma, and PostgreSQL API for the Care Diagnostics laboratory management system.

## Quick Start
1. Clone repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill every required value.
4. Run `npx prisma migrate dev`.
5. Run `npm run db:seed`.
6. Run `npm run dev`.

## Render Deployment
- Build Command: `npm install && npm run build && npm run db:migrate`
- Start Command: `npm run start`
- Health Check: `/health`
- Required env vars: `PORT`, `NODE_ENV`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `FRONTEND_URL`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `REDIS_URL`, `ANTHROPIC_API_KEY`

## Database
Run migrations and seed data locally:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

## Demo Credentials
Seeded credentials depend on `prisma/seed.ts`. Replace demo passwords before using a real production database.
