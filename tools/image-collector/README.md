# Image Collector — dataset intake tool

Local tool for collecting images from public sources, extracting source metadata, and registering the original files in the EPI dataset.

It is intentionally **not** an annotation tool. It never creates COCO/YOLO ground truth and never invents licenses, authors, or titles. Visual classifications produced by the tool are suggestions only and require human review.

## What it does

1. Accepts a direct image URL or an image-page URL from Pexels, Unsplash, Wikimedia Commons, or a generic public page.
2. Resolves the page/image and extracts available metadata.
3. Downloads the image to a temporary preview file.
4. Validates the real file format, dimensions, and integrity.
5. Calculates SHA-256 and checks for duplicates already present in the dataset.
6. Shows a preview for human review.
7. After confirmation, copies the original bytes into `dataset/images/` using a standardized name (`image_001.jpg`) and appends a row to `dataset/sources/image_sources.csv`.
8. Stores complementary metadata in a JSON sidecar under `dataset/sources/records/`.
9. Lets a reviewer edit metadata and change the annotation status later.

The original bytes are preserved. The tool does not crop, resize, or re-encode images.

## Requirements

- Node.js **20.11+** (tested with Node 24.20 on Windows).
- No runtime npm dependencies. `npm install` is not required, but running `npm test` uses only built-in `node:test`.

## Run

From the repository root:

```bash
cd tools/image-collector
npm start
```

Open `http://127.0.0.1:3000`.

The default dataset root is `<repo>/dataset`. To use another location:

```powershell
$env:DATASET_ROOT = "C:\path\to\dataset"
npm start
```

Optional API keys improve Pexels/Unsplash metadata extraction:

```powershell
$env:PEXELS_API_KEY = "..."
$env:UNSPLASH_ACCESS_KEY = "..."
npm start
```

Copy `.env.example` to `.env` if you prefer environment files; `npm start` loads it when present.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATASET_ROOT` | `<repo>/dataset` | Dataset root directory |
| `HOST` | `127.0.0.1` | HTTP bind address |
| `PORT` | `3000` | HTTP port |
| `PEXELS_API_KEY` | empty | Enables the official Pexels API |
| `UNSPLASH_ACCESS_KEY` | empty | Enables the official Unsplash API |
| `IMAGE_COLLECTOR_USER_AGENT` | `ConcertLabDatasetCollector/1.0 (local dataset tool)` | HTTP identity; Wikimedia asks clients to identify themselves |
| `MAX_IMAGE_BYTES` | `26214400` (25 MiB) | Maximum image download size |
| `MAX_HTML_BYTES` | `5242880` (5 MiB) | Maximum HTML page size |
| `MAX_JSON_BYTES` | `2097152` (2 MiB) | Maximum JSON API response size |
| `REQUEST_TIMEOUT_MS` | `20000` | Per-request timeout |
| `MAX_REDIRECTS` | `5` | Redirect limit |
| `MIN_HOST_INTERVAL_MS` | `1000` | Minimum spacing between requests to the same host (politeness/throttling) |
| `PREVIEW_TTL_MS` | `1800000` (30 min) | Preview lifetime |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error`, or `silent` |

## Dataset layout

```text
dataset/
  images/                        # original image bytes, image_001.ext ...
  sources/
    image_sources.csv            # required provenance catalog
    records/                     # sidecar JSON per image
  annotations/
    annotations_coco.json        # NOT created by this tool
    yolo/                        # empty directory only; no annotation files are written
  .tmp/                          # short-lived preview files
```

The tool creates the directories it needs. It does **not** create placeholder annotation files, because annotation is a separate human task.

### CSV columns

The catalog header is exactly:

```text
file_name,source_name,source_url,direct_image_url,author,title,license,license_url,width,height,file_size,sha256,download_date,download_status,annotation_status,notes
```

Missing metadata is written as an empty cell and marked in `notes` with `manual_verification_required: <fields>`. The source page URL can be filled in manually during review if the original URL was a direct image or the page could not be identified. Existing legacy CSVs are read and rewritten with the required header on the next write; legacy extra columns are preserved and a `.bak-<timestamp>` backup is created before the first rewrite.

`download_status` is one of:

- `downloaded` — all required metadata fields are present.
- `downloaded_metadata_pending` — image stored, but at least one of `source_url`, `author`, `title`, `license`, or `license_url` still needs human verification.

`annotation_status` is one of `pending`, `in_review`, `approved`, `rejected`.

### Sidecar JSON

Fields that do not fit the required CSV (original filename, detected MIME/format, extraction warnings, metadata sources, platform details, visual classification suggestions) are stored in `dataset/sources/records/<stem>.json`. The CSV remains the authoritative provenance catalog; the sidecar is complementary.

## How extraction works

1. URL parsing and platform detection (`src/util/url.js`).
2. Platform extractor selection (`src/platforms/`):
   - Pexels: official API when `PEXELS_API_KEY` is set, then public page metadata. Search, collection, and profile pages are rejected (`UNSUPPORTED_URL`) because they do not identify a single photo.
   - Unsplash: official API when `UNSPLASH_ACCESS_KEY` is set, then public page metadata.
   - Wikimedia Commons: MediaWiki `imageinfo` API.
   - Generic: Open Graph, Twitter cards, JSON-LD, canonical URL, and public HTML metadata.
3. Safe HTTP download (`src/http/httpClient.js`), with per-host spacing, `Retry-After`-aware retries for `429`/`5xx`, and SSRF protection.
4. Format validation (`src/image/validateImage.js`): JPEG, PNG, WebP, GIF. AVIF/HEIC, BMP, TIFF, and SVG are rejected with descriptive errors.
5. SHA-256 duplicate check (`src/services/duplicateIndex.js`).
6. Preview registration (`src/services/previewStore.js`).
7. Human confirmation and persistence (`src/services/pipeline.js`, `src/services/catalog.js`, `src/services/storage.js`).

Metadata is merged conservatively. When a field cannot be established from the source, it stays empty and is flagged for manual review. `copyrightNotice` is not treated as a license name, and generic anchor labels such as "License", "Free", or "Terms" are stored only as the license URL — never as the license name.

## HTTP API

All routes are same-origin and require `application/json` for request bodies.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/config` | Supported platforms and limits |
| `POST` | `/api/extract` | Extract preview: `{ "url": "..." }` |
| `POST` | `/api/confirm` | Persist preview: `{ "token": "...", "metadata": {...}, "classification": {...} }` |
| `DELETE` | `/api/previews/:token` | Discard a preview |
| `GET` | `/api/previews/:token/image` | Preview image bytes |
| `GET` | `/api/records` | List catalog records with sidecar details |
| `GET` | `/api/records/:fileName` | Read one record |
| `PATCH` | `/api/records/:fileName` | Update `source_url`, `author`, `title`, `license`, `license_url`, `notes`, `annotation_status`, `classification` |
| `GET` | `/dataset/images/:fileName` | Serve a stored image |

Errors use:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Relevant codes include `INVALID_URL`, `UNSUPPORTED_PROTOCOL`, `BLOCKED_HOST`, `UNSUPPORTED_PLATFORM`, `UNSUPPORTED_FORMAT`, `INVALID_IMAGE`, `FETCH_FAILED`, `HTTP_ERROR`, `DOWNLOAD_TOO_LARGE`, `DUPLICATE_IMAGE`, `PREVIEW_NOT_FOUND`, `PREVIEW_EXPIRED`, `CONFIRM_CONFLICT`, `CATALOG_WRITE_FAILED`, `NOT_FOUND`, `RATE_LIMITED`, and `VALIDATION_ERROR`.

## Human review and classification

The UI displays these visual fields as optional suggestions:

- `people_visible`
- `safety_helmets_visible`
- `reflective_vests_visible`
- `people_without_helmets_visible`
- `construction_environment`
- `industrial_environment`

No local computer-vision model is configured. The classifier returns `manual_review_required` with all values `null`. A reviewer may set values in the UI; those values are stored in the sidecar as `human_supplied` and are explicitly **not** annotation ground truth. Bounding boxes and COCO/YOLO export remain outside this tool.

## Integrity and safety guarantees

- Downloads are validated before preview and hashed before registration.
- SHA-256 duplicates are rejected; no second file is written.
- Confirmed files use `COPYFILE_EXCL`, so an existing file is never overwritten.
- If the CSV append fails after the image was moved, the moved image is removed.
- Writes use a temporary file plus rename; CSV writes are serialized with a mutex.
- The server binds to `127.0.0.1` by default and has **no authentication**. Do not expose it to untrusted networks.
- Host and Origin headers are checked; POST/PATCH/DELETE bodies must be JSON; requests are rate-limited.
- Security headers include CSP, `X-Content-Type-Options`, `X-Frame-Options`, and a restrictive referrer policy.
- The HTTP client blocks private/loopback/link-local addresses, non-80/443 ports, embedded credentials, and unsafe redirects. DNS results are validated and pinned for each request.
- Download size, HTML size, redirect count, and timeouts are bounded.
- Preview tokens are random 32-character hex values; dataset file names are restricted to `image_<digits>.<ext>`.

## Legal and platform constraints

- Use only images you are permitted to use and respect each platform's terms, API rules, robots policies, rate limits, and attribution requirements.
- The tool does not bypass authentication, CAPTCHA, paywalls, access controls, or rate limits.
- Extracted license data is evidence, not legal advice. `license` and `license_url` must be verified by a human before publication or training use.
- Never replace missing metadata with guessed values. The tool deliberately leaves fields empty and flags them.

## Tests

Run:

```bash
cd tools/image-collector
npm test
```

Status on 2026-11-11: **81 automated tests passed, 0 failed** (`node --test`). Coverage includes:

- URL parsing, platform detection, direct/page classification.
- CSV parsing/writing, legacy migration, sidecar persistence.
- Image validation for JPEG, PNG, WebP, GIF, corruption, and unsupported formats.
- Safe HTTP client: redirects, gzip, size limits, private-address blocking, DNS validation, retry/backoff on transient failures, per-host request spacing.
- HTML/Open Graph/Twitter/JSON-LD metadata extraction, including rejection of generic "License"/"Free" anchor labels as license names.
- Platform extractors with fake HTTP responses, including rejection of Pexels search/collection pages.
- Storage naming, placeholder reuse, no-overwrite behavior.
- Preview store TTL and cleanup.
- Duplicate index.
- Pipeline extract → confirm, metadata overrides, duplicate rejection, CSV rollback, status recomputation, sidecar creation.
- HTTP API routes, validation, security headers, host/origin rejection, traversal rejection.

A manual end-to-end run against an isolated `DATASET_ROOT` was also performed: extract, confirm, duplicate detection, CSV/sidecar/image persistence, PATCH updates, and traversal rejection. Live page metadata extraction was exercised against Wikimedia Commons, Pexels, and Unsplash pages.

Not run or not covered:

- Multi-client/load testing.
- Long-running soak tests and preview cleanup under production traffic.
- Legal review of licenses.
- COCO/YOLO annotation generation or validation (out of scope).
- Automated tests against live third-party APIs (they change and may rate-limit).

## Limitations

- Public page markup changes can break metadata extraction; official APIs are preferred when keys are available.
- Pexels/Unsplash API quotas and terms are controlled by those platforms.
- Pexels applies aggressive per-IP anti-bot limits to its public pages: after roughly 15-30 page requests in a short window it starts returning `HTTP 403` for several minutes, even for URLs that worked moments earlier. The tool reports this clearly and never fabricates data; configure `PEXELS_API_KEY` to avoid public-page scraping.
- Transient `HTTP 429`/`5xx` responses are retried twice with backoff (honouring `Retry-After`, capped at 5s); `403` is not retried because it usually means a real access restriction or a temporary block that outlasts the retry window.
- Some pages require authentication or block automated access; the tool reports a clear error instead of bypassing restrictions.
- No visual model is bundled; classification is manual.
- The CSV layer is safe for this single-process local server, not for multiple writers.
- The tool does not verify that a license permits a particular use.
- Annotation files must be produced and validated separately.
