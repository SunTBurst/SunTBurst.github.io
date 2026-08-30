# Public Integrations and AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and safely enable the reference blog's public external modules—comments, page views, analytics, weather, random images, newsletter, music, status, public activity, and scoped public AI—without exposing secrets or creating a dependency on the upstream author's services.

**Architecture:** Keep the public Astro portal static. Browser integrations are registered in a typed feature manifest and can contact only their feature-specific HTTPS origins; all secret-bearing capabilities run in Supabase Edge Functions. Public AI uses versioned public-only indexes and three fixed endpoints for article, site, and public knowledge scopes.

**Tech Stack:** Astro 6, Svelte 5, TypeScript 5.8, Waline client 3, Umami, Supabase PostgreSQL/Edge Functions, Resend-compatible mail adapter, Open-Meteo, Cloudflare Turnstile, OpenAI-compatible chat/embedding providers, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-30-comprehensive-personal-portal-design.md`

## Global Constraints

- Complete `docs/superpowers/plans/2026-08-30-comprehensive-personal-portal.md` first; preserve its static, zero-network default build.
- `disabled` emits no route, hydrated component, SDK, endpoint, or request; `preview` emits explanation only; `enabled` requires valid production configuration.
- Keep implementation status (`planned|implemented|verified`) separate from runtime state (`disabled|preview|enabled`).
- Reject wildcard origins, HTTP endpoints, IP-literal endpoints, URL credentials, and every upstream author domain, ID, address, or account.
- Browser components may not call raw `fetch`; they use the registered service client or a bundled third-party SDK whose origin is declared in the feature manifest.
- Counts use `null` for unknown; never turn unavailable data into a displayed `0`.
- Public AI requests cannot contain `scope`, `workspaceId`, `userId`, role, table, or index names and cannot access private knowledge.
- Secrets live only in Supabase/GitHub protected secrets. `service_role`, AI, mail, Turnstile secret, Umami management token, and heartbeat/probe tokens never enter Pages artifacts.
- Every feature must have a timeout, explicit failure copy, privacy disclosure, rate/usage boundary, and a test proving the article/body remains available when it fails.
- At the end of every task, update `docs/operations/public-feature-register.json` for affected features with implementation status and exact test evidence; never mark `verified` before those commands pass.

---

### Task 1: Introduce the feature manifest and production configuration gate

**Files:**
- Modify: `.env.example`
- Modify: `src/env.d.ts`
- Create: `src/features/types.ts`
- Create: `src/features/manifest.ts`
- Create: `src/features/runtime.ts`
- Create: `src/features/routeState.ts`
- Create: `scripts/validate-feature-manifest.ts`
- Modify: `package.json`
- Create: `tests/unit/feature-manifest.test.ts`
- Create: `docs/operations/public-feature-register.json`
- Create: `supabase/config.toml`
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/_shared/errors.ts`
- Create: `supabase/functions/_shared/rateLimit.ts`
- Delete: `src/pages/ai.astro`
- Delete: `src/pages/music.astro`
- Delete: `src/pages/stats.astro`
- Delete: `src/pages/status.astro`
- Delete: `src/pages/subscribe.astro`
- Create: `src/pages/ai/[...path].astro`
- Create: `src/pages/music/[...path].astro`
- Create: `src/pages/stats/[...path].astro`
- Create: `src/pages/status/[...path].astro`
- Create: `src/pages/subscribe/[...path].astro`

**Interfaces:**
- Produces: `FeatureId`, `FeatureState`, `PublicFeatureEntry`, `PublicFeatureManifest`.
- Produces: `createPublicFeatureManifest(env, { mode })`, `assertProductionFeatureManifest(manifest)`, `getEnabledNetworkOrigins(manifest)`.
- Produces: `getFeatureStaticPaths(featureId, routes)` for optional static route emission.

- [ ] **Step 1: Write failing manifest tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicFeatureManifest, assertProductionFeatureManifest } from '../../src/features/manifest';

test('production rejects enabled features without complete public configuration', () => {
  const { manifest } = createPublicFeatureManifest({ PUBLIC_COMMENTS_STATE: 'enabled' }, { mode: 'production' });
  assert.throws(() => assertProductionFeatureManifest(manifest), /PUBLIC_WALINE_SERVER_URL/);
});

test('origins reject upstream, HTTP, IP, wildcard, credentials, and paths', () => {
  for (const endpoint of ['http://comment.test', 'https://upxuu.com', 'https://8.8.8.8', 'https://user:pass@example.test', '*']) {
    assert.throws(() => createPublicFeatureManifest({ PUBLIC_COMMENTS_STATE: 'enabled', PUBLIC_WALINE_SERVER_URL: endpoint }, { mode: 'production' }));
  }
});
```

- [ ] **Step 2: Run and confirm missing modules**

Run: `pnpm exec tsx --test tests/unit/feature-manifest.test.ts`

Expected: FAIL because `src/features/manifest.ts` does not exist.

- [ ] **Step 3: Define the complete feature type union**

```ts
// src/features/types.ts
export type FeatureState = 'disabled' | 'preview' | 'enabled';
export type FeatureId =
  | 'comments' | 'pageViews' | 'analytics' | 'weather' | 'randomImages'
  | 'newsletter' | 'music' | 'serviceStatus' | 'ownerStatus'
  | 'githubActivity' | 'externalProfiles' | 'sharing'
  | 'articleAI' | 'siteAI' | 'knowledgeAI' | 'llmsFull' | 'webMcp';
export type ExecutionMode = 'local' | 'build' | 'browser' | 'gateway';
export type LoadStrategy = 'build' | 'visible' | 'interaction' | 'consent';

export interface PublicFeatureEntry {
  id: FeatureId;
  state: FeatureState;
  provider: string;
  execution: ExecutionMode;
  loadStrategy: LoadStrategy;
  endpoint?: string;
  allowedOrigins: readonly string[];
  requiredPublicEnv: readonly string[];
  fallback: 'hide' | 'preview' | 'local' | 'search' | 'unknown';
}

export interface PublicFeatureManifest {
  schemaVersion: 1;
  features: Record<FeatureId, PublicFeatureEntry>;
}
```

- [ ] **Step 4: Implement strict origin and state validation**

```ts
const forbiddenHost = /(?:^|\.)upxuu\.com$|^(?:\d{1,3}\.){3}\d{1,3}$/i;

export function parseHttpsOrigin(value: string, variable: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || forbiddenHost.test(url.hostname)) {
    throw new Error(`${variable} must be an approved HTTPS origin`);
  }
  return url.origin;
}
```

Build every `FeatureId` from explicit environment variables. In production, `enabled` plus a missing required value throws. In development, return the feature as `preview` and append a warning. The checked-in `.env.example` sets all states to `preview`, uses `https://suntburst.github.io`, and contains no real endpoint, ID, coordinate, or key.

Initialize Supabase with only local test defaults. Shared CORS accepts exact origins from `PUBLIC_PORTAL_ORIGINS`, shared errors expose safe codes without bodies/secrets, and the rate limiter stores keyed subject hashes rather than raw IPs.

- [ ] **Step 5: Make optional feature routes obey runtime state**

Replace the phase-one `/ai`, `/music`, `/stats`, `/status`, and `/subscribe` files with optional catch-all routes. Use:

```ts
export function getFeatureStaticPaths(state: FeatureState, paths: string[]) {
  return state === 'disabled' ? [] : paths.map((path) => ({ params: { path: path || undefined } }));
}
```

`preview` and `enabled` emit the route; `disabled` emits none. Never decide access from a client query string.

- [ ] **Step 6: Validate and commit**

Run: `pnpm test:unit && pnpm exec tsx scripts/validate-feature-manifest.ts && pnpm lint`

Expected: PASS; the public register contains every feature with owner `SunTBurst`, implementation status `planned`, required credential names, and an empty evidence array.

```bash
git add .env.example src/env.d.ts src/features scripts/validate-feature-manifest.ts package.json tests/unit/feature-manifest.test.ts docs/operations/public-feature-register.json supabase/config.toml supabase/functions/_shared src/pages/ai.astro src/pages/music.astro src/pages/stats.astro src/pages/status.astro src/pages/subscribe.astro src/pages/ai src/pages/music src/pages/stats src/pages/status src/pages/subscribe
git commit -m "feat: add public feature configuration gate"
```

### Task 2: Create the only allowed browser service transport

**Files:**
- Create: `src/services/core/contracts.ts`
- Create: `src/services/core/networkPolicy.ts`
- Create: `src/services/core/resilientFetch.ts`
- Create: `src/services/core/circuitBreaker.ts`
- Create: `src/services/core/cache.ts`
- Create: `src/services/registry.ts`
- Create: `src/components/integrations/FeatureSkeleton.astro`
- Create: `tests/unit/network-policy.test.ts`
- Create: `tests/unit/resilient-fetch.test.ts`
- Modify: `tests/helpers/external-url-audit.mjs`

**Interfaces:**
- Produces: `ServiceResult<T>`, `ServiceError`, `ServiceContext`, `ServiceHealth`, `HealthAwareAdapter`.
- Produces: `assertFeatureRequest(featureId, input, manifest): URL`.
- Produces: `requestFeatureJson<T>(request): Promise<ServiceResult<T>>`.

- [ ] **Step 1: Write origin, retry, timeout, and redaction tests**

```ts
test('feature requests cannot borrow another feature origin', () => {
  assert.throws(() => assertFeatureRequest('weather', 'https://comments.example/api', manifest), /not allowed/);
});

test('401 and 403 never retry and errors redact body and credentials', async () => {
  const calls: Request[] = [];
  const result = await requestFeatureJson({ featureId: 'newsletter', url: '/subscribe', method: 'POST', body: { email: 'person@example.test' }, fetch: fakeFetch(403, calls) });
  assert.equal(calls.length, 1);
  assert.equal(result.ok, false);
  assert.doesNotMatch(JSON.stringify(result), /person@example\.test/);
});
```

- [ ] **Step 2: Run and verify the transport is absent**

Run: `pnpm exec tsx --test tests/unit/network-policy.test.ts tests/unit/resilient-fetch.test.ts`

Expected: FAIL on missing imports.

- [ ] **Step 3: Implement common result and error contracts**

```ts
export type ServiceErrorCode = 'disabled' | 'not_configured' | 'timeout' | 'rate_limited' | 'unauthorized' | 'forbidden' | 'invalid_response' | 'upstream_error' | 'circuit_open' | 'index_version_mismatch' | 'unknown';
export type ServiceResult<T> =
  | { ok: true; value: T; meta: { source: string; fetchedAt: string; stale: boolean } }
  | { ok: false; error: { code: ServiceErrorCode; message: string; retryable: boolean; retryAfterMs?: number }; fallback?: T };
export interface ServiceContext { fetch: typeof globalThis.fetch; signal?: AbortSignal; now: () => Date }
```

- [ ] **Step 4: Implement policy-bound resilient requests**

The request function joins relative paths to the manifest endpoint, verifies the resulting origin, applies `AbortSignal.timeout`, caps JSON response bytes, validates through a supplied parser, retries only idempotent 408/429/5xx responses with a capped `Retry-After`, and opens a circuit by `featureId + origin`. It must never log headers, body, token, email, question, coordinates, or internal target URLs.

```ts
export interface FeatureJsonRequest<T> {
  featureId: FeatureId;
  path: `/${string}`;
  method?: 'GET' | 'POST';
  body?: unknown;
  parse: (value: unknown) => T;
  context: ServiceContext;
  timeoutMs?: number;
}
```

- [ ] **Step 5: Evolve the static audit without weakening the default build**

Add an allowlisted sink report containing `{ artifact, featureId, sink, origin }`. A default all-disabled build must still return no runtime sink. A single-feature test build may contain only that feature's registered origin and only the sink type declared by its adapter.

`FeatureSkeleton.astro` reserves the final component dimensions, uses the local brick visual language, has `aria-hidden="true"`, and disables shimmer under reduced motion. It may not conceal core article content or remain indefinitely after a terminal error.

- [ ] **Step 6: Run and commit**

Run: `pnpm test:unit && pnpm test:url-audit && pnpm test:build`

Expected: PASS; no existing phase-one component acquires raw network capability.

```bash
git add src/services tests/unit/network-policy.test.ts tests/unit/resilient-fetch.test.ts tests/helpers/external-url-audit.mjs
git commit -m "feat: enforce public service network policy"
```

### Task 3: Add GitHub-only comments and honest page views

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/services/comments/waline.ts`
- Create: `src/services/pageviews/gateway.ts`
- Create: `src/components/integrations/CommentsPanel.svelte`
- Create: `src/components/integrations/PageViewCounter.svelte`
- Modify: `src/pages/posts/[id].astro`
- Modify: `src/pages/talk/[id].astro`
- Modify: `src/pages/friends.astro`
- Create: `supabase/migrations/202608300001_public_pageviews.sql`
- Create: `supabase/functions/public-pageviews/index.ts`
- Create: `tests/unit/comments-adapter.test.ts`
- Create: `tests/unit/pageviews-adapter.test.ts`

**Interfaces:**
- Produces: `canonicalContentPath(pathname): string`.
- `CommentsPanel` consumes `{ kind, canonicalPath, title, state }`.
- Page view API returns `{ path: string, count: number | null, updatedAt: string }`.

- [ ] **Step 1: Write canonical path and unknown-count tests**

```ts
test('content paths remove query/hash and keep one trailing slash', () => {
  assert.equal(canonicalContentPath('/posts/hello-world?x=1#top'), '/posts/hello-world/');
});

test('invalid page view responses become unknown instead of zero', async () => {
  const result = await pageViews.get('/posts/a/', contextReturning({ count: 'bad' }));
  assert.equal(result.ok, false);
  assert.equal(result.fallback?.count, null);
});
```

- [ ] **Step 2: Install the bundled client and verify tests fail before implementation**

Run: `pnpm add @waline/client@^3.6.0 && pnpm exec tsx --test tests/unit/comments-adapter.test.ts tests/unit/pageviews-adapter.test.ts`

Expected: FAIL on missing adapters; Waline is bundled from npm, not loaded as a remote script.

- [ ] **Step 3: Implement lazy GitHub-only Waline mounting**

```ts
const cleanup = init({
  el: element,
  serverURL,
  path: canonicalContentPath(target.canonicalPath),
  login: 'force',
  requiredMeta: [],
  pageview: false,
  dark: 'html.dark',
});
```

Load with dynamic `import('@waline/client')` only when the panel is visible and state is `enabled`. The self-owned Waline deployment must enable only GitHub OAuth and disable anonymous/email-password registration. Return a cleanup callback on navigation/unmount.

- [ ] **Step 4: Create the page-view table and idempotent endpoint**

The SQL stores canonical path, aggregate count, and timestamps but no raw IP. The Edge Function derives a short-lived privacy-preserving visitor bucket from a keyed hash for duplicate suppression, discards the raw IP, and only accepts the portal origin. `GET` returns `null` when unavailable; `POST` increments idempotently within the configured window.

- [ ] **Step 5: Integrate components at article/talk/friend boundaries**

Place the counter beside article metadata and the comments panel after content/related navigation. Do not add adapter logic to the 500+ line article page. `preview` shows one sentence; `disabled` renders nothing.

- [ ] **Step 6: Run and commit**

Run: `pnpm lint && pnpm test:unit && pnpm build && pnpm exec playwright test tests/e2e/public-integrations.spec.ts --grep "comments|views"`

Expected: disabled/preview produce zero Waline/pageview requests; a mocked enabled endpoint renders a real count and failure hides the number.

```bash
git add package.json pnpm-lock.yaml src/services/comments src/services/pageviews src/components/integrations src/pages/posts/[id].astro src/pages/talk/[id].astro src/pages/friends.astro supabase/migrations/202608300001_public_pageviews.sql supabase/functions/public-pageviews tests/unit/comments-adapter.test.ts tests/unit/pageviews-adapter.test.ts
git commit -m "feat: add GitHub comments and page views"
```

### Task 4: Add consent-controlled Umami and the statistics page

**Files:**
- Create: `src/services/analytics/umami.ts`
- Create: `src/components/integrations/PrivacyConsent.svelte`
- Create: `src/components/integrations/AnalyticsLoader.svelte`
- Create: `src/components/integrations/PublicStats.svelte`
- Modify: `src/pages/stats/[...path].astro`
- Modify: `src/layouts/Layout.astro`
- Create: `supabase/functions/public-stats/index.ts`
- Create: `tests/unit/analytics-adapter.test.ts`
- Create: `tests/e2e/consent-network.spec.ts`

**Interfaces:**
- Consent key: `suntburst:privacy-consent:v1`, value `{ analytics: boolean, updatedAt: string }`.
- Public stats response: `{ visits: number | null, pageViews: number | null, range: string, updatedAt: string }`.

- [ ] **Step 1: Write a no-consent network test**

```ts
test('analytics makes no request before consent', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await page.waitForTimeout(500);
  expect(requests.filter((url) => url.includes('umami'))).toEqual([]);
});
```

- [ ] **Step 2: Run and confirm consent controls are absent**

Run: `pnpm exec playwright test tests/e2e/consent-network.spec.ts`

Expected: FAIL because the consent control selector is missing.

- [ ] **Step 3: Implement opt-in script loading**

Create the script element only after explicit `analytics: true`, with source `${PUBLIC_UMAMI_ORIGIN}/script.js`, the self-owned website ID, `defer`, and no upstream/Clarity ID. Revoking consent removes the script, disables future events, and clears only the site's own consent state; document that previously sent aggregate events cannot be recalled.

- [ ] **Step 4: Implement server-side public aggregation**

`public-stats` holds the Umami management token server-side, accepts only fixed ranges (`today|7d|30d`), returns cached aggregate values, and uses `null` plus `updatedAt` for unavailable fields. `/stats` distinguishes “not tracking”, “not configured”, “temporarily unavailable”, and real values.

- [ ] **Step 5: Run and commit**

Run: `pnpm test:unit && pnpm exec playwright test tests/e2e/consent-network.spec.ts && pnpm test:build`

Expected: no consent means zero analytics request; enabled mock loads only the configured origin; the knowledge app bundle is not yet present and cannot import this loader.

```bash
git add src/services/analytics src/components/integrations/PrivacyConsent.svelte src/components/integrations/AnalyticsLoader.svelte src/components/integrations/PublicStats.svelte src/pages/stats src/layouts/Layout.astro supabase/functions/public-stats tests/unit/analytics-adapter.test.ts tests/e2e/consent-network.spec.ts
git commit -m "feat: add consent-based public analytics"
```

### Task 5: Add privacy-preserving weather and licensed random images

**Files:**
- Create: `src/services/weather/openMeteo.ts`
- Create: `src/components/integrations/WeatherCard.svelte`
- Create: `src/services/random-images/local.ts`
- Create: `src/data/media/random-images.json`
- Create: `public/images/random/README.md`
- Modify: `src/components/home/EnvironmentPreview.astro`
- Create: `tests/unit/weather-adapter.test.ts`
- Create: `tests/unit/random-images.test.ts`
- Create: `tests/e2e/weather-consent.spec.ts`

**Interfaces:**
- `WeatherLocation = { kind: 'configured' } | { kind: 'visitor'; consent: true; latitude: number; longitude: number }`.
- `CuratedImage` requires `id`, local `src`, `width`, `height`, `alt`, `license`, `credit`, `sourceUrl`.

- [ ] **Step 1: Write tests for opt-in location and media licenses**

```ts
test('visitor weather requires explicit consent and rounds coordinates', () => {
  assert.throws(() => normalizeVisitorLocation({ consent: false, latitude: 24.7136, longitude: 46.6753 }));
  assert.deepEqual(normalizeVisitorLocation({ consent: true, latitude: 24.7136, longitude: 46.6753 }), { latitude: 24.7, longitude: 46.7 });
});

test('curated images reject remote src and missing license', () => {
  assert.throws(() => parseCuratedImages([{ src: 'https://images.test/a.jpg', alt: 'a' }]));
});
```

- [ ] **Step 2: Run and confirm missing adapters**

Run: `pnpm exec tsx --test tests/unit/weather-adapter.test.ts tests/unit/random-images.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement fixed-city first and explicit visitor location**

The card first requests the configured city from Open-Meteo after it becomes visible. A separate “使用我的位置” action calls `navigator.geolocation`; round coordinates to one decimal before request, never persist them, never include them in errors/analytics, and fall back to the configured city on denial/timeout.

- [ ] **Step 4: Implement deterministic local random media**

Validate every manifest entry during build and select by seed/exclusions. If no licensed files exist, render the existing local geometric avatar/cover and “精选图片尚未配置”; do not call a remote random image API.

- [ ] **Step 5: Run and commit**

Run: `pnpm test:unit && pnpm exec playwright test tests/e2e/weather-consent.spec.ts && pnpm test:url-audit`

Expected: geolocation is untouched before the user action; every rendered random image is local and dimensioned.

```bash
git add src/services/weather src/components/integrations/WeatherCard.svelte src/services/random-images src/data/media/random-images.json public/images/random src/components/home/EnvironmentPreview.astro tests/unit/weather-adapter.test.ts tests/unit/random-images.test.ts tests/e2e/weather-consent.spec.ts
git commit -m "feat: add weather and licensed random media"
```

### Task 6: Add licensed music, public service status, owner presence, and build-time profiles

**Files:**
- Create: `src/data/media/music.json`
- Create: `public/audio/README.md`
- Create: `src/services/music/catalog.ts`
- Create: `src/services/music/playerState.ts`
- Create: `src/components/integrations/MusicPlayer.svelte`
- Modify: `src/pages/music/[...path].astro`
- Create: `src/services/status/gateway.ts`
- Create: `src/components/integrations/StatusSummary.svelte`
- Modify: `src/pages/status/[...path].astro`
- Create: `supabase/migrations/202608300003_public_status.sql`
- Create: `supabase/functions/status-probe/index.ts`
- Create: `supabase/functions/public-status/index.ts`
- Create: `supabase/functions/owner-heartbeat/index.ts`
- Create: `scripts/generate-public-profiles.ts`
- Create: `src/generated/public-profiles.fallback.json`
- Create: `tests/unit/music-catalog.test.ts`
- Create: `tests/unit/status-adapter.test.ts`
- Create: `tests/unit/public-profiles.test.ts`

**Interfaces:**
- `MusicTrack` includes local URL, title, artist, duration, license, credit, source URL.
- `PublicStatusSnapshot` contains only overall/status labels and checked/stale timestamps.
- `PublicProfileActivity` contains source, summary, public URL, and occurred time; no raw payload.

- [ ] **Step 1: Write catalog, stale-state, and profile-redaction tests**

```ts
test('stale health and owner heartbeat become unknown', () => {
  assert.equal(normalizeStatus(snapshot, new Date('2026-08-30T12:10:00Z')).overall, 'unknown');
  assert.equal(normalizeStatus(snapshot, new Date('2026-08-30T12:10:00Z')).owner?.status, 'unknown');
});

test('music rejects remote unlicensed tracks', () => {
  assert.throws(() => parseMusicCatalog([{ src: 'https://proxy.test/song.mp3', title: 'x' }]));
});
```

- [ ] **Step 2: Run and verify missing modules**

Run: `pnpm exec tsx --test tests/unit/music-catalog.test.ts tests/unit/status-adapter.test.ts tests/unit/public-profiles.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement a non-autoplay local player**

Persist only track ID, position, and volume. On navigation/reload restore metadata but keep `playing = false`; start audio only from a trusted user gesture. Preview with an empty catalog loads no `<audio>` resource.

- [ ] **Step 4: Implement cached, redacted service and owner status**

The probe uses server-only `STATUS_TARGETS_JSON`; the public table stores only service ID, public label, status, checked/stale time. The heartbeat endpoint requires its dedicated secret, never accepts visitor updates, and expires to unknown. Public responses exclude target URL, IP, latency detail, body, version, logs, and probe token.

- [ ] **Step 5: Generate GitHub and optional Bilibili summaries at build time**

GitHub defaults to username `SunTBurst`; optional profiles are skipped unless explicitly configured. The build adapter fetches through a token stored only in CI, validates public HTTPS URLs, writes a small `.cache/public-profiles.json`, and falls back without failing the portal. Never emit emails, raw API JSON, full commit messages, or visitor-side API calls.

- [ ] **Step 6: Run and commit**

Run: `pnpm test:unit && pnpm build && pnpm test:build`

Expected: no autoplay, stale status is unknown, and browser artifacts contain neither monitoring targets nor GitHub token.

```bash
git add src/data/media/music.json public/audio src/services/music src/services/status src/components/integrations/MusicPlayer.svelte src/components/integrations/StatusSummary.svelte src/pages/music src/pages/status supabase/migrations/202608300003_public_status.sql supabase/functions/status-probe supabase/functions/public-status supabase/functions/owner-heartbeat scripts/generate-public-profiles.ts src/generated/public-profiles.fallback.json tests/unit/music-catalog.test.ts tests/unit/status-adapter.test.ts tests/unit/public-profiles.test.ts
git commit -m "feat: add media status and public activity modules"
```

### Task 7: Implement double-opt-in email subscription

**Files:**
- Create: `supabase/migrations/202608300002_newsletter.sql`
- Create: `supabase/functions/newsletter-subscribe/index.ts`
- Create: `supabase/functions/newsletter-confirm/index.ts`
- Create: `supabase/functions/newsletter-unsubscribe/index.ts`
- Create: `supabase/functions/newsletter-webhook/index.ts`
- Create: `supabase/functions/newsletter-send/index.ts`
- Create: `supabase/functions/_shared/tokens.ts`
- Create: `src/services/newsletter/gateway.ts`
- Create: `src/components/integrations/NewsletterForm.svelte`
- Modify: `src/pages/subscribe/[...path].astro`
- Create: `supabase/functions/_tests/newsletter.test.ts`
- Create: `tests/e2e/newsletter.spec.ts`

**Interfaces:**
- Subscribe input `{ email, locale, turnstileToken, honeypot: '' }` always returns `{ state: 'confirmation_required' }` for accepted-shaped requests.
- Confirmation and unsubscribe tokens are random, single-use, expiring; only keyed hashes are stored.

- [ ] **Step 1: Write enumeration, replay, expiry, and webhook tests**

```ts
Deno.test('subscribe does not reveal whether an email already exists', async () => {
  const first = await subscribe('person@example.test');
  const duplicate = await subscribe('person@example.test');
  assertEquals(first.publicBody, duplicate.publicBody);
});

Deno.test('confirmation token is single use', async () => {
  assertEquals((await confirm(token)).status, 200);
  assertEquals((await confirm(token)).status, 410);
});
```

- [ ] **Step 2: Create the privacy-minimal schema**

Store encrypted email, keyed email hash, status, locale, timestamps, token purpose/hash/expiry/use time, and delivery event IDs. Do not store article bodies, IPs, Turnstile tokens, or plaintext confirmation tokens. Add RLS denying anonymous/direct browser access to every newsletter table.

- [ ] **Step 3: Implement Turnstile, honeypot, rate limit, and mail adapter**

All endpoints verify portal origin. Subscribe verifies Turnstile server-side and sends a confirmation URL under the public portal. Confirm/unsubscribe pages use `Referrer-Policy: no-referrer` and do not mount analytics, comments, weather, or music. Webhooks require provider signature verification and idempotent event IDs.

- [ ] **Step 4: Implement the accessible form and states**

The Svelte form validates format/length locally, does not claim success before the service response, and shows confirmation-required, confirmed, unsubscribed, rate-limited, and unavailable states. It never echoes the full email in an error.

- [ ] **Step 5: Run and commit**

Run: `supabase functions serve --env-file supabase/.env.test` in one terminal, then `deno test supabase/functions/_tests/newsletter.test.ts && pnpm exec playwright test tests/e2e/newsletter.spec.ts`

Expected: all security cases PASS; database and browser logs contain no plaintext token or email.

```bash
git add supabase/migrations/202608300002_newsletter.sql supabase/functions/newsletter-* supabase/functions/_shared/tokens.ts supabase/functions/_tests/newsletter.test.ts src/services/newsletter src/components/integrations/NewsletterForm.svelte src/pages/subscribe tests/e2e/newsletter.spec.ts
git commit -m "feat: add double opt-in newsletter"
```

### Task 8: Make friend applications reviewed and screenshot previews SSRF-safe

**Files:**
- Create: `.github/ISSUE_TEMPLATE/friend.yml`
- Create: `.github/workflows/validate-friend.yml`
- Create: `scripts/validate-friend-submission.mjs`
- Create: `supabase/functions/friend-preview/index.ts`
- Create: `src/components/integrations/FriendPreview.astro`
- Modify: `src/pages/friends.astro`
- Create: `tests/friend-workflow-security.test.mjs`
- Create: `supabase/functions/_tests/friend-preview.test.ts`

**Interfaces:**
- Validation output `{ valid, normalizedUrl, errors }`.
- Preview output `{ title, description, imageUrl: string | null, checkedAt }`; it never returns arbitrary HTML.

- [ ] **Step 1: Write malicious URL and workflow tests**

```js
for (const url of ['http://127.0.0.1', 'https://169.254.169.254', 'file:///etc/passwd', 'https://user:pass@example.test', 'javascript:alert(1)']) {
  assert.equal(validateFriendUrl(url).valid, false);
}
assert.doesNotMatch(workflow, /pull_request_target|write-all|github\.event\.issue\.body[^\n]*run:/);
```

- [ ] **Step 2: Implement structured Issue validation only**

The workflow has `contents: read` and `issues: write` only to add a validation label/comment. It parses the form through a script argument/file API, never interpolates Issue text into shell, and never commits or merges. A maintainer manually approves a structured data PR.

- [ ] **Step 3: Implement server-side preview isolation**

Resolve DNS and reject loopback, private, link-local, multicast, non-HTTPS, redirects to forbidden ranges, oversized responses, non-HTML, and unknown screenshot providers. Fetch with a strict timeout and no cookies. Cache only sanitized title/description and an approved screenshot asset; if unavailable, use the normal avatar/color fallback.

- [ ] **Step 4: Run and commit**

Run: `node --test tests/friend-workflow-security.test.mjs && deno test supabase/functions/_tests/friend-preview.test.ts`

Expected: malicious inputs fail and the workflow cannot write repository content.

```bash
git add .github/ISSUE_TEMPLATE/friend.yml .github/workflows/validate-friend.yml scripts/validate-friend-submission.mjs supabase/functions/friend-preview src/components/integrations/FriendPreview.astro src/pages/friends.astro tests/friend-workflow-security.test.mjs supabase/functions/_tests/friend-preview.test.ts
git commit -m "feat: secure friend applications and previews"
```

### Task 9: Build and synchronize a versioned public AI index

**Files:**
- Create: `supabase/migrations/202608300004_public_ai.sql`
- Create: `scripts/generate-public-ai-index.ts`
- Create: `scripts/sync-public-ai-index.ts`
- Create: `src/generated/public-index-meta.fallback.json`
- Create: `supabase/functions/public-index-sync/index.ts`
- Create: `supabase/functions/embedding-worker/index.ts`
- Create: `supabase/functions/_shared/aiProvider.ts`
- Create: `supabase/functions/_shared/embeddings.ts`
- Create: `tests/unit/public-index.test.ts`
- Create: `supabase/functions/_tests/public-index-sync.test.ts`

**Interfaces:**
- `PublicIndexBundle { schemaVersion: 1, indexVersion, generatedAt, documents, checksum }`.
- Portal tables: `portal_index_versions`, `portal_index_documents`, `portal_index_chunks`.
- AI cache key contains scope, scope key, index version, model, and question hash.

- [ ] **Step 1: Write draft/private/checksum/index-version tests**

```ts
test('public AI bundle excludes non-public markers and is deterministic', async () => {
  const bundle = await buildPublicIndex(fixture);
  assert.doesNotMatch(JSON.stringify(bundle), /draft|private|withdrawn|service_role/i);
  assert.equal(bundle.indexVersion, await sha256(canonicalJson(bundle.documents)));
});
```

- [ ] **Step 2: Create public-only tables and RLS**

Anonymous/authenticated clients may call only a stable public retrieval RPC for the active version. Direct writes are denied. Index sync uses a dedicated HMAC token scoped to this function; the function validates total size, schema, document URL origin, per-document checksum, and whole-bundle checksum before staging.

- [ ] **Step 3: Implement atomic version activation**

Upload documents, enqueue embeddings, validate expected vector dimensions/model, and activate the new version only when every chunk succeeds. A failed bundle leaves the previous active version intact. Retain one previous version for rollback and remove older versions through a scheduled job.

- [ ] **Step 4: Wire CI sync without a service-role secret**

`sync-public-ai-index.ts` uses only `PORTAL_INDEX_SYNC_URL` and `PORTAL_INDEX_SYNC_TOKEN`. It sends the verified public bundle; it never reads Supabase private tables or has a general database key.

- [ ] **Step 5: Run and commit**

Run: `pnpm test:unit && deno test supabase/functions/_tests/public-index-sync.test.ts && pnpm build`

Expected: bundle and sync tests PASS; `dist` and the bundle contain only public portal records.

```bash
git add supabase/migrations/202608300004_public_ai.sql scripts/generate-public-ai-index.ts scripts/sync-public-ai-index.ts src/generated/public-index-meta.fallback.json supabase/functions/public-index-sync supabase/functions/embedding-worker supabase/functions/_shared/aiProvider.ts supabase/functions/_shared/embeddings.ts tests/unit/public-index.test.ts supabase/functions/_tests/public-index-sync.test.ts
git commit -m "feat: add versioned public AI index"
```

### Task 10: Implement fixed-scope public AI endpoints with verified citations

**Files:**
- Create: `src/services/ai/types.ts`
- Create: `src/services/ai/sse.ts`
- Create: `src/services/ai/client.ts`
- Create: `supabase/functions/_shared/publicAi.ts`
- Create: `supabase/functions/_shared/citations.ts`
- Create: `supabase/functions/public-ai-summary/index.ts`
- Create: `supabase/functions/public-ai-article/index.ts`
- Create: `supabase/functions/public-ai-site/index.ts`
- Create: `supabase/functions/public-ai-knowledge/index.ts`
- Create: `supabase/functions/_tests/public-ai-isolation.test.ts`
- Create: `tests/unit/ai-sse.test.ts`

**Interfaces:**
- Endpoints are fixed: `/public-ai-article`, `/public-ai-site`, `/public-ai-knowledge`.
- SSE events: `meta`, `token`, `citation`, `suggestions`, `done`, `error`.
- Summary is cached-only: `GET /public-ai-summary?slug=...&indexVersion=...`.

- [ ] **Step 1: Write scope-confusion and citation-forgery tests**

```ts
Deno.test('public endpoint rejects private-scope fields', async () => {
  for (const field of ['scope', 'workspaceId', 'userId', 'role', 'table']) {
    const response = await callSiteAi({ question: 'x', turnstileToken: 'ok', indexVersion: 'v1', [field]: 'private' });
    assertEquals(response.status, 400);
  }
});

Deno.test('model URLs never become citations', async () => {
  const response = await runWithModelText('[source](https://evil.test)');
  assertEquals(response.citations, serverRetrievedCitations);
});
```

- [ ] **Step 2: Implement one shared public AI pipeline**

The wrapper fixes its scope in code, validates portal origin and Turnstile, limits question length/concurrency/daily tokens, checks `indexVersion`, embeds the question, calls the scope-specific retrieval RPC, assigns `C1..Cn`, treats chunks as untrusted content, asks the model to cite only those IDs, and builds final URLs from server records.

```ts
export async function handlePublicAi(scope: 'article' | 'site' | 'knowledge', request: Request): Promise<Response> {
  const input = await parseStrictRequest(request);
  const candidates = await retrievePublicCandidates(scope, input);
  return streamVerifiedAnswer({ input, candidates, scope });
}
```

Each endpoint calls the wrapper with a literal scope; there is no request scope parameter. Knowledge retrieval uses only `published_chunks` supplied by the knowledge-platform plan.

- [ ] **Step 3: Implement bounded SSE and cached summaries**

Cap individual event size and total output, send heartbeat comments without content, abort provider work when the client disconnects, and end with `done` or sanitized `error`. Anonymous summary GET never invokes the model; missing cache returns 404 so the UI uses the author description.

- [ ] **Step 4: Implement the browser client parser**

The client accepts only the six named events, checks citation URLs against the local public route manifest/site origin, cancels stale conversations, and maps 409 to search/index refresh, 429 to budget copy, and 503 to ordinary search fallback.

- [ ] **Step 5: Run and commit**

Run: `pnpm exec tsx --test tests/unit/ai-sse.test.ts && deno test supabase/functions/_tests/public-ai-isolation.test.ts`

Expected: isolation, injection, citation, budget, and stream-abort tests PASS.

```bash
git add src/services/ai supabase/functions/_shared/publicAi.ts supabase/functions/_shared/citations.ts supabase/functions/public-ai-* supabase/functions/_tests/public-ai-isolation.test.ts tests/unit/ai-sse.test.ts
git commit -m "feat: add scoped public AI services"
```

### Task 11: Add article AI, site AI, public knowledge AI, IndexNow, and read-only WebMCP UIs

**Files:**
- Create: `src/components/integrations/ArticleAISummary.svelte`
- Create: `src/components/integrations/PublicAIChat.svelte`
- Create: `src/components/integrations/AICitations.svelte`
- Modify: `src/pages/posts/[id].astro`
- Modify: `src/pages/ai/[...path].astro`
- Modify: `src/pages/knowledge/[slug].astro`
- Modify: `src/pages/lab.astro`
- Create: `public/webmcp-register.js`
- Create: `scripts/submit-indexnow.mjs`
- Create: `tests/e2e/public-ai.spec.ts`
- Create: `tests/webmcp-syntax.test.mjs`
- Create: `tests/indexnow-security.test.mjs`

**Interfaces:**
- `PublicAIChat` consumes `scope: 'article'|'site'|'knowledge'`, optional public slug, index version, and embedded search fallback.
- WebMCP exposes only `search_public_site`, `summarize_public_page`, `navigate_public_route`.

- [ ] **Step 1: Write browser fallback and WebMCP syntax tests**

```ts
test('AI failure keeps ordinary search usable', async ({ page }) => {
  await page.route('**/public-ai-site', (route) => route.fulfill({ status: 503 }));
  await page.goto('/ai');
  await page.getByLabel('问题').fill('这里有什么');
  await page.getByRole('button', { name: '提问' }).click();
  await expect(page.getByRole('link', { name: /改用站内搜索/ })).toBeVisible();
});
```

- [ ] **Step 2: Implement all three UI scopes without a scope switcher**

Article pages pass a fixed article slug; `/ai` passes `site`; public knowledge pages pass `knowledge` and their public slug. The UI shows model-generated labels, evidence sufficiency, verified citations, suggestions, clear-session action, and no-evidence wording. Public conversation stays in `sessionStorage` at most for the current tab and is never sent to analytics.

- [ ] **Step 3: Register read-only public agent tools**

`webmcp-register.js` must parse as JavaScript, feature-detect the API, and expose only local manifest-backed search/navigation/summary. It may not accept arbitrary URL, execute scripts, write content, authenticate, call AI private endpoints, or access browser storage.

- [ ] **Step 4: Submit only public changed URLs to IndexNow**

The CI script reads the build's public route manifest, compares it with the previous public manifest, rejects private/preview/confirmation routes, and submits at most the provider limit over HTTPS. The key is a CI secret and its verification file contains only the public key value required by the protocol.

- [ ] **Step 5: Run and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/public-ai.spec.ts && node --test tests/webmcp-syntax.test.mjs tests/indexnow-security.test.mjs`

Expected: UI/fallback tests PASS; WebMCP has no mutating/private tool; IndexNow payload contains only public portal URLs.

```bash
git add src/components/integrations/ArticleAISummary.svelte src/components/integrations/PublicAIChat.svelte src/components/integrations/AICitations.svelte src/pages/posts/[id].astro src/pages/ai src/pages/knowledge/[slug].astro src/pages/lab.astro public/webmcp-register.js scripts/submit-indexnow.mjs tests/e2e/public-ai.spec.ts tests/webmcp-syntax.test.mjs tests/indexnow-security.test.mjs
git commit -m "feat: add cited public AI experiences"
```

### Task 12: Complete privacy, network, CI, deployment, and outage gates

**Files:**
- Modify: `src/pages/privacy.astro`
- Modify: `README.md`
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-supabase.yml`
- Create: `scripts/scan-secrets.mjs`
- Create: `scripts/scan-workflows.mjs`
- Create: `tests/artifact-leak.test.mjs`
- Create: `tests/workflow-security.test.mjs`
- Create: `tests/e2e/network-allowlist.spec.ts`
- Create: `docs/operations/external-services.md`
- Create: `docs/operations/public-ai.md`
- Create: `docs/operations/privacy-data-map.md`
- Create: `docs/operations/public-integrations-incident-runbook.md`

**Interfaces:**
- Produces a production feature register with evidence links and a separate credential blocker list.
- Produces a network snapshot per build listing feature, origin, method, load trigger, and consent requirement.

- [ ] **Step 1: Write artifact and workflow attack-pattern tests**

```js
for (const pattern of [/SUPABASE_SERVICE_ROLE_KEY/, /AI_API_KEY/, /RESEND_API_KEY/, /BEGIN PRIVATE KEY/, /github_pat_/, /upxuu/i]) {
  assert.doesNotMatch(allArtifacts, pattern);
}
assert.doesNotMatch(allWorkflows, /pull_request_target|write-all|rsync|sshpass|curl[^\n]*\|[^\n]*(?:sh|bash)/i);
```

- [ ] **Step 2: Test disabled, preview, and one-feature-at-a-time builds**

Create a matrix runner. All-disabled must have zero external runtime sinks and no optional feature routes. Preview emits explanation routes but no SDK/endpoint. Each enabled feature build contains only its registered origin; enabling weather cannot introduce Waline, Umami, Supabase AI, or music requests.

- [ ] **Step 3: Test actual browser request timing and outages**

Playwright fails any unknown origin. Verify analytics waits for consent, geolocation waits for click, comments/weather wait for visibility, AI waits for submit, music never autoplays, and a 429/5xx/timeout/malformed JSON leaves core navigation and article content usable.

- [ ] **Step 4: Update privacy and operations documentation**

For every module record data, purpose, provider, origin, retention, consent, disable method, failure state, secret owner, and deletion path. State that GitHub Pages can use meta CSP only as a partial defense and cannot supply full response-header CSP; do not claim otherwise.

- [ ] **Step 5: Gate deployments in the correct order**

Pages: install → lint/unit/build/browser/security tests → public index sync/activation when enabled → static build → artifact leak scan → deploy → public route/endpoint smoke test. Supabase migration/functions deploy through a separate protected, manually approved workflow. Never place backend deploy secrets in the Pages job.

- [ ] **Step 6: Run the full public integration release gate**

Run: `pnpm lint && pnpm test && pnpm build && pnpm exec playwright test && node scripts/scan-secrets.mjs dist && node scripts/scan-workflows.mjs .github/workflows && git diff --check`

Expected: PASS; every enabled module has a healthy self-owned service and evidence, every unavailable credential remains a documented blocker, and no preview state is counted as final completion.

- [ ] **Step 7: Commit and deploy only verified configuration**

```bash
git add src/pages/privacy.astro README.md .github/workflows scripts/scan-secrets.mjs scripts/scan-workflows.mjs tests/artifact-leak.test.mjs tests/workflow-security.test.mjs tests/e2e/network-allowlist.spec.ts docs/operations
git commit -m "chore: gate public integrations and AI release"
git push origin main
```

Expected: Pages and protected Supabase workflows succeed; live checks show no request to an unregistered origin and no private/secret material in public artifacts.
