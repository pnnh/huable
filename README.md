# Huable — Free Online Tool Portal

The main portal site for [huable.xyz](https://huable.xyz). Provides a multilingual homepage, per-tool detail pages, and a privacy policy — all statically generated and deployed to Cloudflare Workers via OpenNext.

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
- **67 SSG pages** — homepage × 8 languages + tool detail × 6 tools × 8 languages + privacy × 8 languages
- **Cookie consent banner** — EU-compliant; sets `cookie-consent` with `Domain=.huable.xyz` so all subdomains share the same preference without re-asking
- **Privacy policy** — 8-language SSG pages at `/{lang}/privacy`

## Tech Stack

- Next.js 16 (App Router, React 19, TypeScript)
- Tailwind CSS v4
- OpenNext + Cloudflare Workers (deployment)

## Development

```bash
pnpm dev          # starts on http://localhost:7500
pnpm build        # production build
```

## Project Structure

```
src/
  app/
    page.tsx              # root redirect (dynamic, reads Accept-Language)
    [lang]/
      layout.tsx          # injects CookieBanner
      page.tsx            # tool grid homepage
      tools/[tool]/       # SSG tool detail pages
      privacy/            # SSG privacy policy pages
  components/
    CookieBanner.tsx      # EU consent banner; sets Domain=.huable.xyz cookie
    ToolCard.tsx          # tool card with logo, description, tags
    SiteHeader.tsx / SiteFooter.tsx / LanguageSelector.tsx
  data/
    tools.ts              # 6 tools × 8 languages content
    privacy.ts            # 8-language privacy policy content
  lib/
    language.ts           # language list, Accept-Language parsing
    i18n.ts               # t() lookup helper
  locales/
    en.json … zh-TW.json  # UI strings (nav, cookie banner, etc.)
```

## Deployment

Deployed to Cloudflare Workers via `wrangler`:

```bash
pnpm build
wrangler deploy
```

`wrangler.jsonc` targets compatibility date `2026-04-20` with `nodejs_compat`.

## Local Development

### Prerequisites
- Node.js 20+
- pnpm 10+

### Setup
1. Clone the repo and install dependencies:
   ```bash
   pnpm install
   ```
2. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
   The app runs at http://localhost:7500.

### Database
SQLite (better-sqlite3) is used in development. The database file is created automatically at `.data/huable.db`.

## Cloudflare Deployment

### Prerequisites
- A Cloudflare account with Workers, D1, and R2 enabled
- `wrangler` CLI authenticated: `wrangler login`

### Create D1 Database
```bash
wrangler d1 create huable-db
```
Copy the `database_id` from the output and update `wrangler.jsonc`.

### Create R2 Bucket
```bash
wrangler r2 bucket create huable-notes
```

### Build and Deploy
```bash
pnpm build
wrangler deploy
```

### Initialize D1 Schema
```bash
wrangler d1 execute huable-db --file=./migrations/0000_complex_banshee.sql
```
