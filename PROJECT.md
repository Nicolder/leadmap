# Project: LeadMap — Micro-SaaS B2B Leads Extraction & Checkout

## Architecture
LeadMap is a Next.js (App Router, React 19, TypeScript) application with Tailwind CSS, SQLite via Prisma ORM, Overpass OpenStreetMap API lead scraping, Mercado Pago PIX checkout, and SheetJS (.xlsx) export.
- **Frontend Layer**: Next.js 15 App Router (`src/app/layout.tsx`, `src/app/page.tsx`, `src/app/busca/[id]/page.tsx`), Tailwind CSS 3.4 with Autoprefixer, PostCSS, native `next/font/google` (`Newsreader`, `Geist`), and `@radix-ui/react-icons`. Styled strictly according to `minimalist-ui`.
- **Search & Scraping Layer**: `src/lib/scraper/maps.ts` providing a 3-tier resilient data extraction pipeline:
  1. Overpass API with bounding box and short timeout (3.5s - 4.0s) across redundant endpoints.
  2. Nominatim POI search fallback.
  3. Realistic deterministic generator with correct local DDD and city neighborhoods.
- **Persistence & API Layer**: SQLite database via Prisma (`prisma/schema.prisma`) with models `SearchJob`, `Lead`, `Payment`. API routes for search creation (`/api/search`), lead retrieval with 5 open leads + blurred/masked remaining (`/api/search/[id]`), PIX payment generation (`/api/checkout/pix`), payment status polling/simulation (`/api/checkout/status/[paymentId]`), Mercado Pago webhooks (`/api/webhooks/mercadopago`), and Excel export (`/api/export/[id]`).
- **Payment & Export Layer**: Mercado Pago SDK v3 integration in `src/lib/mercadopago.ts` with real token support and graceful placeholder fallback (`TEST-1234567890-abcdef`); SheetJS (`xlsx`) binary workbook generation with columns `(Nome do Negócio, Categoria, Endereço, Cidade, Telefone, Link WhatsApp, Website, Nota Google, Avaliações)`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tailwind & PostCSS Config | Autoprefixer integration, compilation of utility classes without unstyled flash | M1 (DONE) | ORIGINAL_REQUEST § R1 |
| 2 | React Hydration Protection | `suppressHydrationWarning` on `<html>` and `<body>` tags in `src/app/layout.tsx` | M1 (DONE) | ORIGINAL_REQUEST § R1 |
| 3 | Minimalist-UI Design System | Warm monochrome palette (#FBFBFA, #FFFFFF, #111111, #787774, 1px #EAEAEA borders, spot pastels), Newsreader editorial serif headings, zero heavy shadows, zero AI gradients, zero emojis | M1 (DONE) | ORIGINAL_REQUEST § R2 |
| 4 | Native Google Fonts Loading | Replace `@import url` in `globals.css` with `next/font/google` in `layout.tsx`, remove banned Roboto | M1 (DONE) | Explorer 1 Survey |
| 5 | Overpass API Engine | Extraction of local B2B leads using OpenStreetMap Overpass API without external API key | M2 (DONE) | ORIGINAL_REQUEST § R3 |
| 6 | Resilient Search Fallback | Redundant Overpass endpoints with 3.5s timeout, Nominatim fallback, and deterministic local leads complement | M2 (DONE) | ORIGINAL_REQUEST § R3 |
| 7 | Data Sanitization & DDD | Fix `CITY_DDD_MAP` priority matching and 8-digit landline phone format `(XX) 3XXX-XXXX` | M2 (DONE) | Explorer 2 Survey |
| 8 | 5 Free Leads Preview & Blur | 5 open and readable leads; remaining leads masked on server and blurred on client with unlock CTA | M2 (DONE) | ORIGINAL_REQUEST § R3 |
| 9 | Mercado Pago PIX Checkout | Modal and API endpoint generating QR Code and copia-e-cola for R$ 19,90 | M3 (DONE) | ORIGINAL_REQUEST § R4 |
| 10 | Real & Placeholder Fallback | Support real MP token and graceful simulated mode when token is `TEST-1234567890-abcdef` | M3 (DONE) | ORIGINAL_REQUEST § R4 |
| 11 | Excel Export (.xlsx) | Export all leads to .xlsx with columns: Nome do Negócio, Categoria, Endereço, Cidade, Telefone, Website, etc. | M3 (DONE) | ORIGINAL_REQUEST § R5 |
| 12 | Payment Gate for Export | Strict HTTP 403 Forbidden on `/api/export/[id]` if `isPaid` is false | M3 (DONE) | ORIGINAL_REQUEST § R5 |
| 13 | E2E Requirement-Driven Testing | Full opaque-box test suite covering Tiers 1-4 and Tier 5 adversarial tests | M-TEST (DONE) / M4 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Frontend Architecture & Minimalist-UI | Autoprefixer, PostCSS, suppressHydrationWarning, next/font/google, minimalist-ui styling | none | DONE |
| M-TEST | E2E Testing Suite | Comprehensive test harness & test suite (Tiers 1-4) published via TEST_READY.md | none (parallel track) | DONE |
| M2 | Overpass Search Engine & Leads Preview | Overpass API integration, 3-tier fallback, DDD resolution, phone formatting, 5 leads preview & blur | M1 | DONE |
| M3 | Checkout PIX & Excel Export | Mercado Pago PIX R$ 19,90, placeholder fallback, Cidade column in .xlsx export, 403 gate | M1 | DONE |
| M4 | Final E2E Pass & Adversarial Hardening | 100% pass of E2E tests (Tiers 1-4), Tier 5 adversarial hardening, production build verification | M1, M2, M3, M-TEST | DONE |

## Interface Contracts
### Frontend ↔ Search API (`/api/search`, `/api/search/[id]`)
- `POST /api/search`: Request `{ niche: string, location: string }` -> Response `{ jobId: string, niche: string, location: string, totalFound: number }`.
- `GET /api/search/[id]`:
  - When `isPaid: false`: Response `{ job: { id, niche, location, totalFound, isPaid, createdAt }, sampleLeads: Lead[], lockedLeads: MaskedLead[], lockedCount: number }`.
  - When `isPaid: true`: Response `{ job: { id, niche, location, totalFound, isPaid, createdAt }, leads: Lead[], lockedCount: 0 }`.

### Frontend ↔ Checkout API (`/api/checkout/pix`, `/api/checkout/status/[paymentId]`)
- `POST /api/checkout/pix`: Request `{ searchJobId: string }` -> Response `{ paymentId: string, mpPaymentId: string, amount: 19.90, qrCode: string, qrCodeBase64: string, isSimulated: boolean }`.
- `GET /api/checkout/status/[paymentId]`: Response `{ status: 'pending' | 'approved' | 'cancelled', isPaid: boolean }`.

### Export API (`/api/export/[id]`)
- `GET /api/export/[id]`:
  - If `job.isPaid === false`: HTTP 403 `{ error: string }`.
  - If `job.isPaid === true`: HTTP 200 `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, binary workbook with columns:
    `['#', 'Nome do Negócio', 'Categoria', 'Endereço', 'Cidade', 'Telefone', 'Link WhatsApp', 'Website', 'Nota Google', 'Avaliações']`.

## Code Layout
```
src/
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   ├── pix/route.ts
│   │   │   └── status/[paymentId]/route.ts
│   │   ├── export/[id]/route.ts
│   │   ├── search/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── webhooks/mercadopago/route.ts
│   ├── busca/[id]/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── PixModal.tsx
│   └── SearchBar.tsx
├── lib/
│   ├── db.ts
│   ├── mercadopago.ts
│   └── scraper/maps.ts
└── scripts/
    └── verify-flow.ts
tests/
└── e2e/
    ├── runner.ts
    ├── test-utils.ts
    ├── m1-challenger.test.ts
    ├── m2-m3-challenger.test.ts
    ├── challenger-m2-m3.test.ts
    ├── tier1-features.test.ts
    ├── tier2-boundaries.test.ts
    ├── tier3-combinations.test.ts
    └── tier4-applications.test.ts
```
