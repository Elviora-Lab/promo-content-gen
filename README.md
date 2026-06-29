# Atelier — AI Meta Ads Creative Director

A production-oriented Next.js application that turns one cosmetic product image into exactly five premium, portrait Meta ad creatives:

1. Hero Product
2. Lifestyle
3. Minimal Editorial
4. Benefit Focus
5. Premium Campaign Poster

## Architecture

The server-side pipeline has four explicit stages:

1. **Product analysis** — provider-selected vision returns Zod-validated product attributes.
2. **Creative strategy** — provider-selected structured generation returns exactly five schema-validated directions.
3. **Prompt building** — code-owned reusable templates compile the strategy into controlled prompts.
4. **Image editing** — the configured image provider uses the uploaded product as a high-fidelity reference and produces one image per direction.

No database, authentication, queue, or Redis is required. Generated images use Cloudinary when configured; otherwise they are written to `public/generated`.

The pipeline is now cost-aware:

- Vision analysis is cached by product hash.
- Creative strategies are cached by product hash plus planner model.
- Prompt objects are cached and reused instead of being regenerated.
- Draft mode is the default and uses lower-cost image settings.
- Cached image outputs are reused unless the user explicitly asks for a new render.

## Local setup

```bash
npm install
cp .env.example .env.local
# Add OPENAI_API_KEY and optionally GEMINI_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

- `OPENAI_API_KEY` — required for OpenAI image generation and OpenAI fallback routing.
- `GEMINI_API_KEY` — optional. When present, Gemini is preferred for the cheaper vision and planning stages unless overridden.
- `AI_VISION_PROVIDER` — optional. `gemini` or `openai`.
- `AI_LLM_PROVIDER` — optional. `gemini` or `openai`.
- `AI_IMAGE_PROVIDER` — optional. Currently `openai` only in this implementation.
- `AI_VISION_MODEL` and `AI_LLM_MODEL` — optional provider-specific model overrides. Leave them blank to use provider defaults; do not set them to `openai` or `gemini`.
- `OPENAI_VISION_MODEL` and `OPENAI_STRATEGY_MODEL` — optional OpenAI-specific overrides. Both default to `gpt-5.4-mini`.
- `OPENAI_IMAGE_MODEL` — defaults to `gpt-image-2`.
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — optional together, recommended for deployed environments.

## Production notes

- The route validates MIME type and enforces a 10 MB upload limit.
- The five concepts are a domain invariant in constants, schemas, ordering validation, and a final pipeline assertion.
- Draft mode uses `768x960` low-quality image renders. Production mode uses `1024x1280` high-quality renders.
- Image calls run with lower concurrency in production mode to reduce rate-limit pressure.
- Cache artifacts are stored in `.cache/atelier`.
- API credentials never reach the browser.
- Deploy behind a platform with a function timeout of at least five minutes. For high traffic, the next architectural step is an asynchronous job store and signed result URLs.
- Generated copy is intentionally not baked into artwork. The frontend exposes suggested headlines while preserving clean negative space for a later overlay editor.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```
