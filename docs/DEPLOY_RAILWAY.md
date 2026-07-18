# Deploying BuildFlow Africa on Railway

The repo ships Railway-ready: `railway.json` builds `docker/Dockerfile` and starts with
`npm run start:prod`, which applies pending Prisma migrations (`prisma migrate deploy`)
before serving. `next start` honors Railway's injected `PORT` automatically, and
`/api/health` is wired as the healthcheck (returns 503 until the database is reachable).

## 1. Create the project

1. New Project → **Deploy from GitHub repo** → select this repository.
2. Railway detects `railway.json` and builds the Dockerfile — no settings needed.

## 2. Add PostgreSQL

Add the **PostgreSQL** plugin to the project, then on the app service set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the plugin variable) |
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `APP_URL` | your public URL, e.g. `https://<service>.up.railway.app` |

Optional (object storage — site photos/receipts; any S3-compatible provider such as
Cloudflare R2 works):

| Variable | Value |
|---|---|
| `STORAGE_ENDPOINT` / `STORAGE_BUCKET` / `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` / `STORAGE_PUBLIC_URL` | from your provider |

## 3. First deploy

Deploy. `start:prod` runs migrations on boot, so the schema is created automatically.
The healthcheck passes once Postgres is reachable.

## 4. Seed (optional but recommended for a first look)

From your machine, pointed at the Railway database:

```bash
DATABASE_URL="<railway postgres url>" npm run db:seed
```

Logins created by the seed:

- Super admin (platform panel, no organization): `superadmin@buildflow.africa` / `SuperAdmin123!` → `/en/admin`
- Owner: `owner@demo.africa` / `Password123!`
- Client portal: `client@demo.africa` / `Password123!`

**Change these passwords immediately on a public deployment** — or skip seeding and
register a fresh account instead.

## 5. Custom domain

Add your domain in Railway → service → Settings → Networking, then update `APP_URL`.

## Notes

- Migrations are additive and run on every boot; a boot with no pending migrations is a
  no-op.
- Scale-out: the app is stateless (sessions are JWT cookies); attach more replicas
  freely. File uploads require object storage to be configured before scaling.
