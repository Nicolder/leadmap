# Test Infrastructure & Opaque-Box E2E Testing Protocol

## 1. Overview & Testing Strategy

The LeadMap test suite provides comprehensive, opaque-box, requirement-driven end-to-end (E2E) verification for the B2B lead generation and PIX monetization platform. 

All tests are derived strictly from:
- `ORIGINAL_REQUEST.md` (Product specifications & acceptance criteria)
- `PROJECT.md` (Architecture, feature inventory & interface contracts)

Tests exercise actual Next.js route handlers (`NextRequest`), SQLite database persistence (`Prisma ORM`), OSM Overpass/Nominatim and deterministic scrapers, Mercado Pago PIX checkout engine with local simulation, and SheetJS (`xlsx`) workbook generation.

## 2. 4-Tier Test Architecture

The test suite implements the standardized 4-tier testing hierarchy:

| Tier | Focus | Scope | Location |
|------|-------|-------|----------|
| **Tier 1** | **Feature Coverage** | >= 5 test cases per feature across all 13 features in PROJECT.md (frontend contracts, scraper, preview/blur, PIX checkout, payment simulation, Excel export). | `tests/e2e/tier1-features.test.ts` |
| **Tier 2** | **Boundary & Corner Cases** | >= 5 test cases per feature category (empty inputs, extreme strings, special characters/metacharacters, missing IDs, idempotent status polling, null data cells in Excel). | `tests/e2e/tier2-boundaries.test.ts` |
| **Tier 3** | **Cross-Feature Combinations** | Multi-step user lifecycles: Search -> Free Preview (5 open + blurred) -> Direct Export 403 Gate -> PIX Checkout -> Payment Polling -> Simulation Approval -> Unlocked Dataset -> XLSX Download. Also tests double-payment rejection and search isolation. | `tests/e2e/tier3-combinations.test.ts` |
| **Tier 4** | **Real-World Applications** | Realistic regional B2B markets across Brazilian capitals and metropolitan areas (São Paulo, Campinas, Belo Horizonte, Curitiba, Salvador, Rio de Janeiro). | `tests/e2e/tier4-applications.test.ts` |

## 3. Test Inventory & Coverage Breakdown

```
tests/e2e/
├── test-utils.ts             # Lightweight zero-dependency test runner & assertion harness
├── runner.ts                 # Master orchestrator & summary reporter
├── tier1-features.test.ts    # 30 tests: Full coverage of Features 1–12
├── tier2-boundaries.test.ts  # 26 tests: Extreme bounds, injections, empty sets, nulls
├── tier3-combinations.test.ts# 12 tests: Complete multi-step conversion & payment funnels
└── tier4-applications.test.ts# 10 tests: Real Brazilian city & niche market scenarios
-----------------------------------------------------------------------------------------
TOTAL: 78 automated test cases
```

### Tier 1: Feature Coverage (30 Test Cases)
- **Feature 1–4 (Frontend Architecture & Minimalist-UI Contracts)**:
  - `1.1` PostCSS configuration specifies `tailwindcss` and `autoprefixer`.
  - `1.2` Tailwind theme specifies complete `minimalist-ui` palette (`#FBFBFA`, `#FFFFFF`, `#111111`, `#787774`, `#EAEAEA`, pastels, `Newsreader` serif).
  - `1.3` Root layout (`src/app/layout.tsx`) includes `suppressHydrationWarning` on root tags.
  - `1.4` Zero emojis constraint enforced across all components and source pages.
  - `1.5` Zero heavy drop-shadows and zero AI gradients enforced across components.
- **Feature 5–7 (Lead Search Engine & Persistence)**:
  - `2.1` `POST /api/search` responds with 200, valid UUID `jobId`, and `totalFound >= 15`.
  - `2.2` Search job and associated leads are persisted in SQLite with relational integrity.
  - `2.3` Extracted leads contain business name, category, and physical address.
  - `2.4` Phone numbers conform to valid Brazilian formats (`(XX) 9XXXX-XXXX` or `(XX) 3XXX-XXXX` or `+55...`).
  - `2.5` WhatsApp deep links begin with `https://wa.me/55` and contain URL-encoded pre-filled text.
  - `2.6` Geographic locations map to valid 2-digit Brazilian area codes (DDD).
- **Feature 8 (Free Leads Preview & Masking Gate)**:
  - `3.1` `GET /api/search/[id]` for unpaid job returns HTTP 200 with `isPaid: false`.
  - `3.2` Unpaid job provides exactly 5 open, readable `sampleLeads`.
  - `3.3` First 5 sample leads provide legible phones and actionable WhatsApp URLs.
  - `3.4` Remaining leads (index >= 5) are returned in `lockedLeads` with masked phones (`****`).
  - `3.5` Locked leads have masked WhatsApp link (`#`) and obscured address indicators.
- **Feature 9–10 (Mercado Pago PIX Checkout & Simulation)**:
  - `4.1` `POST /api/checkout/pix` generates payment with amount R$ 19.90.
  - `4.2` Payment returns valid internal `paymentId` and external `mpPaymentId`.
  - `4.3` Payment provides BACEN EMV-compliant PIX copia-e-cola payload (`00020126580014br.gov.bcb.pix...`).
  - `4.4` Payment provides base64-encoded QR code graphic payload.
  - `4.5` Placeholder token `TEST-1234567890-abcdef` activates simulated mode (`isSimulated: true`).
  - `4.6` `GET /api/checkout/status/[paymentId]` initially returns status `pending`.
  - `4.7` `GET /api/checkout/status/[paymentId]?simulateApprove=true` returns status `approved`.
  - `4.8` Simulated approval updates `SearchJob.isPaid` flag to `true` in SQLite.
  - `4.9` Unlocked SearchJob returns all leads in open array with `lockedCount === 0`.
- **Feature 11–12 (Excel Export & Security Gate)**:
  - `5.1` `GET /api/export/[id]` returns HTTP 403 Forbidden when `isPaid: false`.
  - `5.2` `GET /api/export/[id]` returns HTTP 200 with Excel MIME type when `isPaid: true`.
  - `5.3` Export response contains `Content-Disposition: attachment; filename="leads_*.xlsx"`.
  - `5.4` Exported binary payload parses as a valid Excel workbook using XLSX parser.
  - `5.5` Exported worksheet row count matches database lead count.

### Tier 2: Boundary & Corner Cases (26 Test Cases)
- **Input Boundaries & Sanitization**: Missing niche (400), missing location (400), empty parameters (400), whitespace inputs (safe handling), extreme string lengths (>250 chars), SQL injection and XSS metacharacter safety (`'; DROP TABLE;`).
- **Retrieval Boundaries**: Non-existent UUID (404), malformed non-UUID id (404), empty database record handling, job with <5 leads, rapid sequential polling.
- **Checkout Boundaries**: Missing searchJobId (400), non-existent searchJobId (404), already-paid job protection, custom buyer email handling, concurrent checkout requests.
- **Payment Status Boundaries**: Non-existent payment ID (404), simulateApprove idempotency, extra query params resilience, already-approved status fast-path.
- **Export Boundaries**: Non-existent export ID (404), malformed ID (404), accent & special character filename sanitization, null lead fields handling, column header integrity, concurrent export downloads.

### Tier 3: Cross-Feature Combinations (12 Test Cases)
- Complete 8-step user conversion lifecycle (Search -> Preview -> Export 403 block -> PIX Checkout -> Polling -> Simulation Approval -> Unlocked Preview -> 200 OK XLSX Download).
- Re-checkout prevention on paid jobs (idempotency).
- Cross-search payment gate isolation (verifying Search A approval never unlocks Search B).
- Webhook notification handling for empty and unknown payloads.

### Tier 4: Real-World Applications (10 Test Cases)
- Healthcare & Dental in São Paulo - SP (Southeast Metro, DDD 11).
- Accounting Services in Belo Horizonte - MG (Interior Capital, DDD 31).
- Real Estate in Curitiba - PR (South Region, DDD 41).
- Automotive Services in Salvador - BA (Northeast Region, DDD 71).
- Gastronomy in Rio de Janeiro - RJ (Coastal Metro, DDD 21).

## 4. Execution Commands

### Running the Full Master E2E Suite
```bash
npx tsx tests/e2e/runner.ts
```

### Running Specific Tiers via Master Runner
```bash
npx tsx tests/e2e/runner.ts --tier=1
npx tsx tests/e2e/runner.ts --tier=2
npx tsx tests/e2e/runner.ts --tier=3
npx tsx tests/e2e/runner.ts --tier=4
```

### Running Individual Tier Test Files Standalone
```bash
npx tsx tests/e2e/tier1-features.test.ts
npx tsx tests/e2e/tier2-boundaries.test.ts
npx tsx tests/e2e/tier3-combinations.test.ts
npx tsx tests/e2e/tier4-applications.test.ts
```

## 5. Verification & Expected Output Derivation

All expected outputs are derived from authoritative specifications:
1. **HTTP Status Codes & Contracts**: Defined in `PROJECT.md` § Interface Contracts (`POST /api/search` -> 200, `GET /api/search/[id]` -> 200 with 5 unmasked + blurred, `GET /api/export/[id]` -> 403 when unpaid / 200 when paid).
2. **PIX Checkout Specs**: Bacen EMV format starting with `00020126580014br.gov.bcb.pix`, fixed amount `19.90`, and SVG/PNG base64 graphic.
3. **Excel Workbook Format**: MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, attachment filename matching `leads_*.xlsx`, containing sheet `'Leads Extraídos'` parseable by SheetJS.
4. **Non-deterministic Variances**: Timestamps and UUIDs are validated through pattern matching (UUID v4 regex, ISO timestamp parsing, relative range comparisons).

## 6. Environment & Offline Isolation

The test suite does not require external network availability or live Mercado Pago accounts:
- **Resilient Fallback**: Scraper automatically uses realistic deterministic Brazilian business generators if OSM/Nominatim is unreachable.
- **Local PIX Simulation**: Mercado Pago engine activates simulated BACEN EMV codes when `MERCADO_PAGO_ACCESS_TOKEN` is the test placeholder `TEST-1234567890-abcdef`.
- **Database Self-Containment**: Operates against the local SQLite database (`prisma/dev.db`), creating isolated test jobs and validating foreign keys.
