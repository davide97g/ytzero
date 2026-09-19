This fork runs on a mini PC via Dokploy. Push to `main` after CI is green; the `deploy` job in `.github/workflows/ci.yml` tells Dokploy to rebuild from this repository's `Dockerfile`.

Local Docker and Bun are for development.

## Homelab (production)

| | |
| --- | --- |
| Runs at | https://ytzero.davideghiotto.it |
| Builder | Dokploy application `ytzero-app`, project `ytzero` |
| Image | this repo's `Dockerfile` |
| Trigger | push to `main` after the Validate job succeeds |
| Data | persistent `/data` on the box |

Dokploy auto-deploy and the old push webhook are off. There is one path from `main` to production and it sits behind the test gate. Secrets, the Cloudflare path rule, and the deploy hostname are in [UPSTREAM.md](https://github.com/davide97g/ytzero/blob/main/UPSTREAM.md#deployment).

After a deploy, open the public URL. The app starts empty: add channels from **Settings → Channels**.

## Local Docker

Build the same Dockerfile used in production:

```bash
docker compose up --build -d
```

Open <http://localhost:3001>. Data is stored under `./data`.

PostgreSQL overlay (set `POSTGRES_PASSWORD` first):

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build -d
```

See [Configuration](Configuration) for environment variables.

## Local development

Install dependencies:

```bash
bun run setup
```

Start backend and frontend:

```bash
bun run dev
```

Development URLs:

```text
UI:  http://localhost:5173
API: http://localhost:3001
```

## Local production-like start

```bash
bun run start
```

This builds `ui/dist` if needed and starts the backend serving the built frontend at <http://localhost:3001>.

## Scripts

| Command | Description |
| --- | --- |
| `bun run setup` | Install backend and frontend dependencies. |
| `bun run dev` | Start backend watcher and Vite dev server. |
| `bun run dev:app` | Start only the backend watcher. |
| `bun run dev:ui` | Start only the Vite dev server. |
| `bun run build` | Build the frontend. |
| `bun run start` | Serve the production frontend through the backend. |

## First run

After the first start you get a local YT Zero instance at <http://localhost:3001>.

The initial app is intentionally empty: no Google login, no imported account data, and no recommendations. From **Settings → Channels** you add channels manually or import an OPML / Google Takeout subscriptions file (see [Importing Subscriptions](Importing-Subscriptions)). Once channels are added, YT Zero starts filling the configured SQLite or PostgreSQL database with their public RSS videos and background metadata.
