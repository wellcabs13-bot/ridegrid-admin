# RideGrid Production Deployment

## Fastest supported path
Deploy the Next.js application to Vercel with PostgreSQL.

### Required environment variables
- `DATABASE_URL`
- `JWT_SECRET`

Never commit `.env` or production secrets.

### Pre-release gate
```bash
npm ci
npx prisma generate
npx tsc --noEmit
npm run build
npm test
npm run test:e2e
```

### Database
Run Prisma migrations against the production database before opening traffic:
```bash
npx prisma migrate deploy
```

### Health check
`GET /api/health`

### Release sequence
1. Push to the protected production branch.
2. CI must pass.
3. Deploy to staging/UAT.
4. Run smoke/E2E checks.
5. Apply production Prisma migrations.
6. Promote production deployment.
7. Verify `/api/health` and critical booking flow.
8. Monitor logs and rollback if release validation fails.

## Vercel
Set the project root to `ridegrid-admin` and configure the two environment variables above.
The repository's `postinstall` script generates Prisma Client during installation.
