# Upstream: YT Zero

Repo root is this folder (`yt-zero`).

## Remotes

| Remote | URL | Push |
| --- | --- | --- |
| `origin` | https://github.com/davide97g/ytzero (public fork, mine) | yes |
| `upstream` | https://github.com/Pelski/ytzero (original) | disabled |

`main` tracks `origin/main`. Push URL of `upstream` is set to `DISABLED` on purpose,
so an accidental `git push upstream` fails instead of trying the original repo.

Pull upstream changes:

```
git fetch upstream
git merge upstream/main      # or: git rebase upstream/main
git push origin main
```

## Where the original is

| | |
| --- | --- |
| Repo | https://github.com/Pelski/ytzero |
| Owner | `Pelski` (not a fork; original source) |
| Site | https://ytzero.app |
| Docs | https://github.com/Pelski/ytzero/wiki (also vendored in `wiki/`) |
| Docker | `ghcr.io/pelski/ytzero` |
| License | **AGPL-3.0-only** |
| Default branch | `main` |
| Created | 2026-06-13 |
| Stars / forks | 574 / 24 (at clone time) |
| Cloned at commit | `19b5b61` — "Shareable public links to videos and playlists #60" (2026-09-09), 363 commits |
| Companion | https://github.com/Pelski/ytzero-enhance (browser extension) |

## What it is

Self-hosted YouTube "inbox". Reads public YouTube RSS feeds of channels you follow,
stores everything in your own SQLite or PostgreSQL DB. No Google account, no YouTube
Data API key. Chronological feed, watch queue, playlists, tags, rules, progress,
own player, optional `yt-dlp` download-and-play-from-disk.

## Stack

- Runtime: **Bun** + TypeScript
- Backend: `app/` — Hono, `innertube.js`, `fast-xml-parser`, `openid-client`,
  `@simplewebauthn/server`, `sharp` / `resvg`
- Frontend: `ui/` — Vite SPA (`ui/DESIGN_SYSTEM.md`)
- Shared code: `shared/`
- Static pages: `pages/`, templates: `templates/`
- DB: `app/src/schema.sql` + migrations (`bun run check:database-migrations`)
- Deploy: `Dockerfile`, `docker-compose*.yml`, `deploy/`, plus Railway / Render /
  Heroku / DigitalOcean descriptors
- Repo docs worth reading first: `AGENTS.md`, `design.md` (54 KB), `TODO.md`,
  `CONTRIBUTING.md`, `docs/`, `wiki/`

## Commands

```
bun run setup      # install
bun run dev        # app + ui
bun run check      # precommit: typecheck, tests, migrations, large files
bun run test
bun run typecheck
```

## Overlap with planned work

Already upstream — read before rebuilding:

- **OIDC login** — generic OpenID Connect (`app/src/auth.ts`, `authRoutes.ts`,
  `profileOidcRoutes.ts`, `externalRoleMappings.ts`), `wiki/Authentication.md`.
  Google is usable as an OIDC provider today; only one auth method active at a time.
- **Sharing** — public bearer-token links for videos and playlists,
  `docs/public-sharing.md`, `wiki/Public-Sharing.md`. Landed in the cloned commit.
- **Google Takeout import** — `wiki/Importing-from-Google-Takeout.md`,
  `wiki/Importing-Subscriptions.md`.
- **Watch-together / social** — design notes in `docs/social-watch-together.md`.

Not upstream: AI features.
