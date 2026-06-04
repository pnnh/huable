# Huable — Free Online Tool Portal & Publishing Platform

The main portal site for [huable.xyz](https://huable.xyz). Provides a multilingual tool directory, a public content platform (channels + notes), and a private console for creating and managing content — deployed to Cloudflare Workers via OpenNext.

## Tools

| Tool | Subdomain | Description |
|------|-----------|-------------|
| **BaseX** | basex.huable.xyz | Base64 / Base32 / Base58 / Hex encoding & decoding |
| **CryptoX** | cryptox.huable.xyz | AES & RSA encryption / decryption |
| **HashX** | hashx.huable.xyz | MD5 / SHA / BLAKE2b / BLAKE3 / HMAC hashing |
| **RandomX** | randomx.huable.xyz | Password, UUID, color & number generation |
| **Timeis** | timeis.huable.xyz | World clock, date calculator, Unix timestamp |
| **WeJSON** | wejson.huable.xyz | JSON formatter, validator, JSONPath, YAML/XML export |

## Features

- **8 languages** — `en`, `es`, `fr`, `de-DE`, `pt-PT`, `ja`, `zh`, `zh-TW`; URL-based routing via `/[lang]/`
- **Auto language detection** — root `/` redirects to the best-match language from `Accept-Language`
- **Public channels** — browse and search public channels at `/{lang}/channels`; per-channel note listing at `/{lang}/channels/[id]`
- **Public notes** — paginated, searchable note feed at `/{lang}/` (title + body fuzzy search)
- **Console** — authenticated CRUD for channels, notes, profile, and avatar upload at `/{lang}/console/`
- **File attachments** — notes support file uploads stored in local filesystem (dev) or Cloudflare R2 (prod)
- **User profiles** — nickname, bio, and avatar (JPG/PNG/GIF/WebP, max 2 MB)
- **Channel avatars** — per-channel avatar upload with first-character fallback
- **Cookie consent banner** — EU-compliant; sets `cookie-consent` with `Domain=.huable.xyz`
- **Privacy policy** — `/{lang}/privacy`

## Tech Stack

- Next.js 16 (App Router, React 19, TypeScript)
- Tailwind CSS v4
- Drizzle ORM — SQLite (better-sqlite3) in dev, Cloudflare D1 in production
- OpenNext + Cloudflare Workers (deployment)

## Development

```bash
pnpm install
cp .env.local.example .env.local
pnpm db:migrate   # applies migrations to .data/huable.db
pnpm dev          # starts on http://localhost:7500
```

```bash
pnpm build        # production build
```

### Environment Variables (`.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `./.data/huable.db` | Local SQLite database path |
| `NOTE_STORAGE_PATH` | `./.data/uploads` | Local file attachment storage |
| `DEV_USER_ID` | `dev-user-001` | Hardcoded dev user ID (dev auth only) |
| `DEV_USER_NAME` | `Dev User` | Hardcoded dev user display name |

> **Auth note:** In development, identity is read from a `user_id` cookie (falling back to the `DEV_USER_*` env vars). In production, Cloudflare Zero Trust headers are used.

## Project Structure

```
src/
  app/
    page.tsx                    # root redirect (reads Accept-Language)
    [lang]/
      layout.tsx                # injects CookieBanner
      page.tsx                  # public note feed (paginated + searchable)
      channels/
        page.tsx                # public channel list (paginated + searchable)
        [id]/page.tsx           # public channel detail with published notes
      notes/[id]/page.tsx       # public note detail (Markdown rendered)
      tools/[tool]/page.tsx     # SSG tool detail pages
      tools/page.tsx            # tools listing
      privacy/page.tsx          # privacy policy
      console/
        page.tsx                # console dashboard
        channels/
          page.tsx              # channel list (owner)
          [channelId]/page.tsx  # create / edit channel + avatar upload
        notes/
          page.tsx              # note list (owner)
          [noteId]/page.tsx     # create / edit note with attachment panel
        profile/page.tsx        # edit nickname, bio, avatar
    api/
      channel/avatar/[channelId]/   # GET (serve) + POST (upload) channel avatar
      user/avatar/                  # POST upload user avatar
      user/avatar/[userId]/         # GET serve user avatar
      user/profile/                 # PATCH update nickname / bio
      upload/                       # POST upload note attachment
      attachments/[noteId]/         # GET list attachments for a note
      files/[noteId]/[filename]/    # GET serve attachment file
    console/page.tsx            # /console redirect (no lang prefix)
  components/
    CookieBanner.tsx
    ToolCard.tsx / ToolGrid.tsx
    SiteHeader.tsx / SiteFooter.tsx / LanguageSelector.tsx
    MarkdownContent.tsx         # renders Markdown with remark/rehype
    AttachmentPanel.tsx         # note attachment upload + list (client)
    ChannelAvatar.tsx           # avatar image with first-char fallback (client)
    ChannelAvatarUpload.tsx     # avatar upload widget for channel editor (client)
    ChannelSearch.tsx           # search input that updates ?q= param (client)
    UserProfileClient.tsx       # profile form (nickname, bio, avatar) (client)
  data/
    tools.ts                    # 6 tools × 8 languages content
    privacy.ts                  # 8-language privacy policy content
  db/
    schema.ts                   # Drizzle schema (users, channels, notes, note_attachments)
    index.ts                    # getDb() — returns better-sqlite3 (dev) or D1 (prod)
    migrate.ts                  # runs Drizzle migrations; called by pnpm db:migrate
  lib/
    auth.ts                     # getCurrentUser() — cookie-based dev auth
    jwt.ts                      # JWT utilities
    storage.ts                  # LocalStorageAdapter (dev) / R2 adapter (prod)
    language.ts                 # language list, Accept-Language parsing
    i18n.ts                     # t() lookup helper
  locales/
    en.json … zh-TW.json        # UI strings
```

## Database

Drizzle ORM with SQLite (dev) and Cloudflare D1 (prod).

### Schema

| Table | Key columns |
|-------|-------------|
| `users` | `id`, `name`, `email`, `nickname`, `bio`, `created_at` |
| `channels` | `id`, `user_id`, `name`, `description`, `is_public`, `created_at` |
| `notes` | `id`, `user_id`, `channel_id`, `title`, `body`, `is_published`, `created_at`, `updated_at` |
| `note_attachments` | `id`, `note_id`, `filename`, `mime_type`, `created_at` |

### Migrations

```bash
pnpm db:migrate    # dev: applies all pending migrations to .data/huable.db
```

Migrations live in `./migrations/`. To apply them to D1 in production:

```bash
wrangler d1 execute huable-db --remote --file=./migrations/0000_complex_banshee.sql
wrangler d1 execute huable-db --remote --file=./migrations/0001_user_profile.sql
```

## Cloudflare Deployment

### Prerequisites
- A Cloudflare account with Workers, D1, and R2 enabled
- `wrangler` CLI authenticated: `wrangler login`

### Create D1 Database
```bash
wrangler d1 create huable-db
```
Copy the `database_id` from the output and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc`.

### Create R2 Bucket
```bash
wrangler r2 bucket create huable-notes
```

### Build and Deploy
```bash
pnpm build
wrangler deploy
```

