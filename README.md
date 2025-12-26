# TrueFrame

TrueFrame is a Next.js 14 + TypeScript demo that estimates whether an image is likely AI-generated, unclear, or likely real. It pairs a minimal web UI with a deterministic placeholder analyzer API to illustrate the experience and wiring.

## Features
- App Router pages for `/` (live samples) and `/demo` (upload)
- Sample images fetched from Google Custom Search (falls back to placeholders if keys are missing)
- `POST /api/analyze` endpoint with deterministic hashing logic, CORS, body size guard, and basic rate limiting
- Tailwind + shadcn/ui-inspired components for a clean, trust-and-safety feel

## Getting started
1. Install dependencies
   ```bash
   npm install
   ```

2. Add environment variables to `.env.local`:
   ```bash
   GOOGLE_CSE_API_KEY=your-google-api-key
   GOOGLE_CSE_CX=your-custom-search-engine-id
   ```
   If these are not set, the app will fall back to three hardcoded Unsplash placeholders.

3. Run the dev server
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000.

## API
`POST /api/analyze`

Request:
```json
{
  "mediaType": "image",
  "dataUrl": "data:image/jpeg;base64,...",
  "url": "https://example.com/photo.jpg"
}
```
At least one of `dataUrl` or `url` is required. The request is limited to ~10MB and subject to a small in-memory rate limit.

Response:
```json
{
  "label": "likely_ai | unclear | likely_real",
  "confidence": 0.0,
  "signals": [{ "type": "source", "value": "upload" }]
}
```
Signals always include `source`, `c2pa`, and a `model_score`. The placeholder model hashes the input for a stable confidence, then maps thresholds to labels.

## Project structure
- `src/app/page.tsx` — landing page with hero + sample cards
- `src/app/demo/page.tsx` — upload experience with drag-and-drop
- `src/app/api/analyze/route.ts` — analyzer route handler
- `src/components` — shadcn-style UI elements and feature components
- `src/lib` — analyzer logic, Google image fetcher, and shared utilities

## Notes
- Images are downscaled to a max of 512px on the server via `sharp`.
- The analyzer is deterministic and intended for demo purposes only.
