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
| `APP_URL` | your public URL, **including the `https://` scheme**, e.g. `https://<service>.up.railway.app` (a bare hostname is normalized to `https://` in code, but set it fully to be safe) |

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

## 6. File storage (photos & documents)

Uploads (site photos, worker documents) use a pluggable storage driver:

- **No config** → files are written to local disk (`STORAGE_DIR`, default `.storage`).
  Fine for a single instance / trials, but **not durable on Railway** (the container
  filesystem is ephemeral) and not shared across replicas.
- **S3-compatible** (recommended for production) → set the variables below and the app
  switches to the S3 driver automatically. Works with **Cloudflare R2**, **AWS S3**, or
  **MinIO**.

| Variable | Example (Cloudflare R2) |
| --- | --- |
| `STORAGE_BUCKET` | `buildflow` |
| `STORAGE_ACCESS_KEY_ID` | `<R2 access key id>` |
| `STORAGE_SECRET_ACCESS_KEY` | `<R2 secret>` |
| `STORAGE_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` |
| `STORAGE_REGION` | `auto` (R2) / your AWS region (S3) |
| `STORAGE_FORCE_PATH_STYLE` | `true` for MinIO, omit for R2/S3 |

The driver activates when `STORAGE_BUCKET` + both keys are present. Files are always
served through the app's authenticated `/api/files/[id]` route (tenant-scoped; the s3
driver redirects to a short-lived signed URL), so the bucket can stay private.

## Notes

- Migrations are additive and run on every boot; a boot with no pending migrations is a
  no-op.
- Scale-out: the app is stateless (sessions are JWT cookies); attach more replicas
  freely. Configure S3-compatible storage (above) before scaling — the local-disk
  fallback is per-container and not shared.
