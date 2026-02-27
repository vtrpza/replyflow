# Deployment Runbook (Fly.io + SQLite)

ReplyFlow runs on Fly.io with SQLite persisted on a Fly Volume.

## Current App

| Field    | Value                            |
| -------- | -------------------------------- |
| App name | `replyflow`                      |
| Region   | `gru` (São Paulo)                |
| URL      | https://replyflow.fly.dev        |
| Volume   | `replyflow_data` mounted at `/data` |
| DB path  | `/data/gitjobs.db`               |

## Prerequisites

- [flyctl](https://fly.io/docs/flyctl/install/) installed and authenticated (`flyctl auth login`)
- A `FLY_API_TOKEN` secret in GitHub (for CI/CD)
- Google Cloud OAuth credentials configured (see [OAuth Callbacks](#oauth-callbacks))

## Secrets Reference

Set all required secrets in Fly before the first deploy:

```bash
flyctl secrets set -a replyflow \
  NEXTAUTH_SECRET=<random-string> \
  NEXTAUTH_URL=https://replyflow.fly.dev \
  GOOGLE_CLIENT_ID=<your-client-id> \
  GOOGLE_CLIENT_SECRET=<your-client-secret> \
  GOOGLE_REDIRECT_URI=https://replyflow.fly.dev/api/auth/callback/google \
  GOOGLE_CONNECT_REDIRECT_URI=https://replyflow.fly.dev/api/accounts/callback \
  REPLYFLOW_SYNC_TOKEN=<long-random-token> \
  SENTRY_DSN=<your-sentry-dsn>
```

| Variable                        | Required | Description                                           |
| ------------------------------- | -------- | ----------------------------------------------------- |
| `NEXTAUTH_SECRET`               | Yes      | Random string for JWT signing                         |
| `NEXTAUTH_URL`                  | Yes      | Public app URL                                        |
| `GOOGLE_CLIENT_ID`              | Yes      | Google OAuth client ID                                |
| `GOOGLE_CLIENT_SECRET`          | Yes      | Google OAuth client secret                            |
| `GOOGLE_REDIRECT_URI`           | Yes      | OAuth callback for sign-in                            |
| `GOOGLE_CONNECT_REDIRECT_URI`   | Yes      | OAuth callback for Gmail account linking              |
| `REPLYFLOW_SYNC_TOKEN`          | Yes      | Protects `POST /api/sync/system`                      |
| `GITHUB_TOKEN`                  | No       | Higher rate limit for GitHub source scraping           |
| `RESEND_API_KEY`                | No       | Resend key for sending outreach emails                |
| `RESEND_SENDER_EMAIL`           | No       | Verified sender address in Resend                     |
| `SENTRY_DSN`                    | No       | Sentry error reporting DSN                            |

## First-Time Setup

```bash
# 1. Create the app (already done if app exists)
flyctl apps create replyflow

# 2. Create a persistent volume (1 GB, same region as app)
flyctl volumes create replyflow_data --size 1 --region gru -a replyflow

# 3. Set secrets (see table above)
flyctl secrets set -a replyflow NEXTAUTH_SECRET=... # etc.

# 4. Deploy
flyctl deploy -a replyflow
```

## Regular Deployment

### Automatic (CI/CD)

Push to `main` → GitHub Actions runs quality checks (typecheck + build) → deploys to Fly.io.

Requires `FLY_API_TOKEN` in GitHub repository secrets.

### Manual

```bash
flyctl deploy -a replyflow
```

## Post-Deploy Verification

Run the smoke test:

```bash
bash scripts/smoke-test.sh https://replyflow.fly.dev
```

Or manually:

```bash
# Health check (should return {"status":"ok","db":"connected"})
curl https://replyflow.fly.dev/api/health

# Landing page
curl -o /dev/null -w "%{http_code}" https://replyflow.fly.dev

# App status
flyctl status -a replyflow
```

## Scheduled Sync

System sync runs automatically every 6 hours via GitHub Actions (`.github/workflows/scheduled-sync.yml`).

Requires `REPLYFLOW_SYNC_TOKEN` in GitHub repository secrets.

Manual trigger:

```bash
# Via GitHub Actions UI: go to Actions > Scheduled Sync > Run workflow

# Or directly:
export REPLYFLOW_SYNC_TOKEN=<your-token>
bash scripts/scheduled-sync.sh
```

## Backup & Restore

### Automated Backups

Weekly backups run via GitHub Actions (`.github/workflows/backup-db.yml`) every Sunday at 04:00 UTC. Backups are stored as GitHub Actions artifacts with 30-day retention.

### Manual Backup

```bash
bash scripts/backup-db.sh
```

This creates a consistent SQLite snapshot in `./backups/`.

### Restore

```bash
# Upload the backup file to the Fly volume
flyctl ssh sftp shell -a replyflow
> put backups/gitjobs-YYYYMMDD-HHMMSS.db /data/gitjobs-restore.db

# SSH in and swap the database
flyctl ssh console -a replyflow
$ mv /data/gitjobs.db /data/gitjobs-old.db
$ mv /data/gitjobs-restore.db /data/gitjobs.db

# Restart the app to pick up the restored database
flyctl apps restart replyflow
```

## OAuth Callbacks

Authorized redirect URIs in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

- `https://replyflow.fly.dev/api/auth/callback/google` (sign-in)
- `https://replyflow.fly.dev/api/accounts/callback` (Gmail account linking)

## Troubleshooting

### View Logs

```bash
flyctl logs -a replyflow
```

### SSH Into the Machine

```bash
flyctl ssh console -a replyflow
```

### Check Database

```bash
flyctl ssh console -a replyflow -C "sqlite3 /data/gitjobs.db '.tables'"
flyctl ssh console -a replyflow -C "ls -la /data/"
```

### Health Check Failing

If `/api/health` returns 503, the database is unreachable. Check:

1. Volume is mounted: `flyctl volumes list -a replyflow`
2. DB file exists: `flyctl ssh console -a replyflow -C "ls -la /data/gitjobs.db"`
3. Disk space: `flyctl ssh console -a replyflow -C "df -h /data"`

### Migrations Stuck

Migrations run automatically via `docker-entrypoint.js` on container startup. Check logs for errors:

```bash
flyctl logs -a replyflow | grep -i migration
```

### App Not Starting

```bash
flyctl status -a replyflow
flyctl machines list -a replyflow
```

## Operational Notes

- Keep **single active machine** — SQLite does not support multi-writer.
- Auto-stop is disabled (`auto_stop_machines = "off"`) to avoid cold starts.
- Database is persisted on the Fly volume at `/data/gitjobs.db`.
- The `data/*.json` catalog files are baked into the Docker image for source auto-discovery.
- Migrations use `better-sqlite3` directly (not `drizzle-kit` CLI) to avoid libsql driver conflicts.
- Do not store persistent data outside the `/data` volume mount.
