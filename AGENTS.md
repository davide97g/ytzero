# Repository working rules

## UI and design system

- Before adding UI markup or CSS, search `ui/src/components/ui` and existing domain components for a matching reusable component.
- Settings are the strictest design-system surface: compose them from `SettingsSection`, `SettingRow`, `Field`, and the shared controls (`Button`, `Select`, `Input`, `Switch`, `Checkbox`, `Slider`, `Tabs`, pickers, etc.). Do not introduce raw controls or one-off settings layout when a shared primitive exists.
- If an interaction pattern is missing and is likely to be used again, add or extend a reusable component first, then consume it from the feature. Keep data fetching and domain copy in a domain component; keep layout and interaction primitives in `components/ui`.
- Reuse `Popover`, `List`/`ListButton`, `EmptyState`, `Badge`, and shared buttons for menus and notification-style surfaces before creating bespoke equivalents.
- Add feature-specific CSS only for genuinely domain-specific presentation. Shared states, spacing, focus, hover, sizing, and responsive behavior belong to the reusable component.
- Empty states: `EmptyState`'s illustrated `art` variant is reserved for primary destinations. Read `docs/illustrations.md` before adding or drawing one; everything else uses the plain `icon` variant.
- Before adding CSS, identify its component or page owner. `ui/src/styles.css` is only for global foundations; component and page selectors belong beside their implementation.

## Localization

- Treat localization as part of every feature, not as follow-up work. Before completing any UI feature or user-visible behavior change, identify every added or changed string and update the translation catalogue in the same change.
- Do not add hard-coded user-facing copy in components when an i18n message is appropriate. English in `ui/src/i18n/locales/en.ts` defines the key contract; add a complete Italian translation for every key. `shared/uiLanguages.ts` lists the two supported locales.
- English fallback values, empty strings, and placeholder translations are not completed localization. Preserve interpolation placeholders such as `{count}`, `{name}`, and `{time}` exactly in every locale. Product names and genuinely language-independent technical terms may remain unchanged.
- When feature messages are shared or likely to grow together, extend the appropriate feature catalogue under `ui/src/i18n/locales/` instead of scattering keys. Follow `docs/localization.md` for catalogue structure and language-addition requirements.
- Run the focused catalogue and formatting tests after changing UI copy: `bun test ui/src/i18nCatalog.test.ts ui/src/i18nFormatting.test.ts`. Also run the UI typecheck when message keys or locale modules change.

## Persistence and backup compatibility

- Read `docs/backup-restore-architecture.md` before adding or changing persistent settings, database state, plugin state, profile-owned data, or files under `data/`.
- Every persistent field must be explicitly classified as portable configuration, portable personal state, rebuildable cache, transient state, secret, or machine-bound data. Update the document and the owning backup adapter/section when that classification or serialized shape changes.
- Portable backup is domain-based and versioned; never expose a new table or setting through a generic database/settings dump. New portable entities need stable identifiers, dependencies, merge/replace semantics, idempotent restore behavior, and old-backup compatibility.
- Add or update round-trip and exclusion tests for persistent features. A feature that silently disappears from a selected backup, leaks into an unselected category, exports a secret, or breaks restore of an older supported archive is incomplete.

## Per-profile authentication

- Per-profile usernames are derived from profile names: whitespace becomes `_`, characters other than Unicode letters, numbers, and `_` are removed, and case-insensitive collisions receive a numeric suffix.
- The primary profile generates or regenerates credentials for one profile at a time. Regeneration invalidates the previous password. Temporary passwords are returned once, stored only as hashes, and must never be added to logs, backups, settings, or later API responses.
- When per-profile login is active, renaming or creating a profile keeps its login derived from its name. A newly created profile receives one-time temporary credentials in the creation response.
- An authenticated profile changes only its own password and must provide its current password. Administrative authentication settings must not offer editable per-profile username or password fields.

## Verification commands

- Never run `bun run check:precommit`, `bun run check:validate`, or an equivalent command that executes the entire precommit validation chain. These commands are reserved for the repository owner. Run only the specific tests, typechecks, builds, or validation scripts needed for the current change.

## Learned User Preferences

- English (`en`) and Italian (`it`) are the only maintained and supported UI languages. Do not add, restore, or accept another locale; every user-visible string ships in both, and in nothing else.
- Keep this fork homelab-only: do not add or restore Heroku, Railway, Render, DigitalOcean, Fly, Unraid, Proxmox, native installers, GHCR publish, or other one-click cloud packaging.
- On mobile (max-width 760px), use a bottom tab bar with a More sheet; keep the top bar as search plus profile only, without the hamburger drawer or header tool icons.

## Learned Workspace Facts

- Production is Dokploy on a mini PC. A green push to `main` rebuilds this repo's `Dockerfile`; PRs, local commits, and `workflow_dispatch` do not deploy. Dokploy auto-deploy is off.
- Live instance is https://ytzero.davideghiotto.it. Local Docker builds from source with `docker compose up --build -d`, not the upstream GHCR image.
- Origin is https://github.com/davide97g/ytzero (standalone, not a GitHub fork). `upstream` remains https://github.com/Pelski/ytzero for pulling original changes.
