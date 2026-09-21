# Interface localization

YT Zero maintains and supports exactly two interface languages: **English** and
**Italian**. No other language is shipped, maintained, or accepted in this fork;
an unknown stored language code is normalized to English. The language is a
per-profile setting, so profiles sharing one installation can use either one.

| Code | Language | Name shown in YT Zero | Intl locale | Status |
| --- | --- | --- | --- | --- |
| `en` | English | English | `en-US` | Maintained and supported |
| `it` | Italian | Italiano | `it-IT` | Maintained and supported |

The canonical language list lives in `shared/uiLanguages.ts`. It supplies the
browser and server with the same language codes, BCP 47 locale tags, native
picker names, and base language codes. The Italian locale module is loaded on
demand; English is bundled eagerly.

## Translation catalogue

English in `ui/src/i18n/locales/en.ts` defines the message-key contract, and
`ui/src/i18n/locales/it.ts` is a complete, matching Italian module. Feature
groups shared by both locale modules are composed through
`ui/src/i18n/locales/featureMessages.ts`. Messages used by downloads,
automation, database, plugins, and backup/restore are collected in
`surfaceMessages.*`, and public-sharing copy in `publicSharing.*`; screens
still consume them only through `useI18n().t(...)`. Locale-specific plural
forms and time units live in `ui/src/i18n/localeFormats.ts`.

Every shared catalogue group is stored one file per language —
`surfaceMessages.en.ts`, `surfaceMessages.it.ts`, and so on, for
`surfaceMessages`, `publicSharing`, `cluster`, `notifications`, `feedBuilder`,
`feedTuning`, `discoveryExternal`, `dailyRotation`, `channelSync`,
`keyboardShortcuts`, `watchTogether` and `featureMessages` — because a module
holding every language cannot be tree-shaken: importing it for one language
ships both. Each locale module imports only its own slice, so a visitor
downloads English plus, on demand, Italian. Each group keeps an aggregate
module as a view for catalogue tests and tooling; application code must not
import one, and `i18nCatalog.test.ts` fails if it does. The Italian slice is
type-checked against the English one through
`satisfies Record<keyof typeof surfaceMessagesEn, string>`, which keeps the key
contract without a runtime dependency. New copy for these groups goes in the
per-language files, one entry per language.

The server owns the labels and descriptions returned with download settings
and plugin manifests. Their source definitions contain English only, and
`app/src/serverMessages.ts` supplies the Italian translation keyed by the
English source string. Always resolve these values with
`localizeServerMessage()`; do not select translations positionally or fall back
in an API route.

Translations must keep every interpolation placeholder from the English
message, including placeholders such as `{count}`, `{name}`, and `{time}`.
Product names and technical terms may intentionally remain unchanged.

## Changing or adding copy

1. Add or change the English key in the owning catalogue file.
2. Add the matching Italian value in the same change — English fallback values,
   empty strings, and placeholder translations are not completed localization.
3. Add locale-specific pluralization to `ui/src/i18n/localeFormats.ts` when a
   new counted noun is introduced.
4. Run the focused localization checks:

   ```sh
   bun test ui/src/i18nCatalog.test.ts ui/src/i18nFormatting.test.ts
   bun test app/src/serverMessages.test.ts
   ui/node_modules/.bin/tsc --noEmit -p ui/tsconfig.json
   ```

Adding a third language is out of scope for this fork. Doing it anyway would
mean extending `shared/uiLanguages.ts`, adding a lazy loader in
`ui/src/i18n/index.tsx`, a complete locale module and per-group slices, a
`localeFormats` entry, a `SERVER_MESSAGES` catalogue, and updating the
supported-language expectations in the tests above.

The catalogue test verifies that every locale has exactly the English keys,
contains no empty values, preserves interpolation placeholders, and does not
silently fall back to English for most messages.
The server catalogue test covers every nested download-setting and plugin
message and verifies interpolation placeholders for Italian.

Interface language is portable profile configuration. Backup and restore
compatibility details are documented in
[`backup-restore-architecture.md`](backup-restore-architecture.md).
