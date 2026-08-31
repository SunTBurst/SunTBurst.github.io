# Prepublication Comment Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub-only comments that remain private until an AI provider or SunTBurst explicitly approves them, with OpenAI, Kimi, and DeepSeek server-side adapters.

**Architecture:** Keep the Astro portal static and render an honest preview unless complete public Supabase configuration exists. A Svelte comment island talks only to authenticated Supabase Edge Functions; those functions own validation, state transitions, model calls, and moderator authorization, while PostgreSQL RLS remains the final read boundary.

**Tech Stack:** Astro 6, Svelte 5, TypeScript 5.8, Supabase Auth/PostgreSQL/Edge Functions, `@supabase/supabase-js`, OpenAI Moderation/Chat Completions, Kimi and DeepSeek OpenAI-compatible Chat Completions, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-31-prepublication-comment-moderation-design.md`

## Global Constraints

- Comments support only `post`, `talk`, `knowledge`, and `project` targets from the built public index.
- Only GitHub OAuth may create a session; email/password, anonymous comments, uploads, and arbitrary HTML remain disabled.
- AI decisions are only `approve` or `manual_review`; failures and ambiguity always become `manual_review`.
- Production activates one provider at a time and never automatically forwards a comment to a second provider.
- The moderator allowlist uses GitHub numeric ID `105589585`, never username alone.
- Real AI keys, OAuth secrets, and the Supabase service-role key never enter Git, build output, logs, source maps, or browser code.
- Preview mode emits no comment SDK, endpoint, network sink, or usable input form.
- Comment failures never block static content, search, navigation, RSS, or other portal tools.
- Plain-text bodies are 2–2000 Unicode characters; no HTML or Markdown interpretation is allowed in phase one.
- All commands run from `F:\TSunWebBlog`; integration builds run serially because they share `dist/`.

---

## File Map

### Public configuration and domain

- `src/features/comments/config.ts`: validates preview/enabled public configuration without reading secrets.
- `src/features/comments/domain.ts`: target normalization, body validation, status transitions, and public contracts.
- `src/features/comments/copy.ts`: Chinese state and error labels shared by Astro/Svelte UI.
- `src/env.d.ts`, `.env.example`: public variable declarations and intentionally empty examples.

### Server-side comments

- `supabase/migrations/202608310001_prepublication_comments.sql`: tables, constraints, indexes, RLS, grants, and cleanup function.
- `supabase/functions/_shared/comment-review/types.ts`: provider-neutral review types.
- `supabase/functions/_shared/comment-review/policy.ts`: versioned policy prompt and strict result parser.
- `supabase/functions/_shared/comment-review/providers.ts`: OpenAI/Kimi/DeepSeek adapters with fixed origins.
- `supabase/functions/_shared/comments/contracts.ts`: request/response parsers safe for Node and Deno.
- `supabase/functions/_shared/comments/submit.ts`: injectable submit workflow and fail-closed state updates.
- `supabase/functions/_shared/comments/moderate.ts`: injectable moderator workflow.
- `supabase/functions/_shared/http.ts`: exact CORS, redacted errors, and method handling.
- `supabase/functions/submit-comment/index.ts`: authenticated submit endpoint.
- `supabase/functions/list-comments/index.ts`: public plus own-pending read endpoint.
- `supabase/functions/delete-comment/index.ts`: authenticated owner withdrawal/deletion endpoint.
- `supabase/functions/moderate-comment/index.ts`: GitHub numeric-ID protected review endpoint.

### Browser UI

- `src/services/comments/client.ts`: lazy Supabase browser client, OAuth, list/submit/delete calls.
- `src/components/comments/CommentsSection.astro`: build-time preview/enabled gate.
- `src/components/comments/CommentsPanel.svelte`: published list, GitHub login, composer, and own review state.
- `src/components/comments/ModerationQueue.svelte`: administrator queue and review actions.
- `src/pages/comments-policy.astro`: public rules, data flow, retention, and current availability.
- `src/pages/moderation.astro`: noindex administrator shell; preview is non-interactive.

### Integration, evidence, and operations

- Detail routes mount `CommentsSection` after reusable content and navigation.
- `src/pages/privacy.astro`, `src/utils/homeModel.ts`, `src/utils/portalIndex.ts`, and the portal project/update Markdown reflect the honest state.
- `tests/unit/comments-*.test.ts` cover domain, configuration, providers, submit, and moderator authorization.
- `tests/comments-build.test.mjs` covers preview/enabled bundles, routes, privacy copy, and zero-secret guarantees.
- `tests/comments-migration.test.mjs` verifies SQL constraints, grants, RLS, and cleanup definitions.
- `docs/operations/comments-runbook.md` records external setup, rotation, rollout, and shutdown without real values.

---

### Task 1: Public configuration and comment domain

**Files:**
- Modify: `.env.example`
- Modify: `src/env.d.ts`
- Create: `src/features/comments/config.ts`
- Create: `src/features/comments/domain.ts`
- Create: `src/features/comments/copy.ts`
- Test: `tests/unit/comments-config.test.ts`
- Test: `tests/unit/comments-domain.test.ts`

**Interfaces:**
- Produces: `createCommentPublicConfig(env): CommentPublicConfig`.
- Produces: `canonicalCommentTarget(input): CommentTarget`.
- Produces: `validateCommentBody(value): string`.
- Produces: `canTransitionComment(from, to): boolean`.

- [ ] **Step 1: Write failing configuration tests**

```ts
test('preview needs no endpoint and emits no client configuration', () => {
  assert.deepEqual(createCommentPublicConfig({ PUBLIC_COMMENTS_STATE: 'preview' }), {
    state: 'preview',
    endpoint: null,
    publishableKey: null,
  });
});

test('enabled rejects incomplete and non-Supabase HTTPS endpoints', () => {
  assert.throws(() => createCommentPublicConfig({ PUBLIC_COMMENTS_STATE: 'enabled' }), /PUBLIC_SUPABASE_URL/);
  assert.throws(() => createCommentPublicConfig({
    PUBLIC_COMMENTS_STATE: 'enabled',
    PUBLIC_SUPABASE_URL: 'https://example.test',
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  }), /approved Supabase HTTPS origin/);
});
```

- [ ] **Step 2: Write failing domain tests**

```ts
test('targets are local indexed detail paths without query or hash', () => {
  assert.deepEqual(canonicalCommentTarget({ kind: 'post', path: '/posts/hello-world?x=1#top' }), {
    kind: 'post',
    path: '/posts/hello-world/',
  });
  assert.throws(() => canonicalCommentTarget({ kind: 'post', path: '//evil.test/x' }), /local path/);
});

test('AI can publish or defer but never reject', () => {
  assert.equal(canTransitionComment('ai_reviewing', 'published'), true);
  assert.equal(canTransitionComment('ai_reviewing', 'manual_review'), true);
  assert.equal(canTransitionComment('ai_reviewing', 'rejected'), false);
});
```

- [ ] **Step 3: Run the red tests**

Run: `pnpm exec tsx --test tests/unit/comments-config.test.ts tests/unit/comments-domain.test.ts`

Expected: FAIL because `src/features/comments/config.ts` and `domain.ts` do not exist.

- [ ] **Step 4: Implement strict configuration and state contracts**

```ts
export type CommentFeatureState = 'preview' | 'enabled';
export interface CommentPublicConfig {
  state: CommentFeatureState;
  endpoint: string | null;
  publishableKey: string | null;
}

export function createCommentPublicConfig(env: Record<string, string | undefined>): CommentPublicConfig {
  const state = env.PUBLIC_COMMENTS_STATE === 'enabled' ? 'enabled' : 'preview';
  if (state === 'preview') return { state, endpoint: null, publishableKey: null };
  const rawUrl = env.PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!rawUrl) throw new Error('PUBLIC_SUPABASE_URL is required');
  if (!publishableKey) throw new Error('PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname) || url.pathname !== '/') {
    throw new Error('PUBLIC_SUPABASE_URL must be an approved Supabase HTTPS origin');
  }
  return { state, endpoint: url.origin, publishableKey };
}
```

Define the exact transition map in `domain.ts`; normalize one trailing slash; allow only the four target prefixes; reject control characters and bodies outside 2–2000 characters. Put all visible status labels in `copy.ts` so model/vendor text never becomes UI copy.

- [ ] **Step 5: Declare public variables without secrets**

Append to `.env.example`:

```dotenv
# 评论默认保持预览；只有完整 Supabase 公共配置存在时才能启用
PUBLIC_COMMENTS_STATE=preview
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Add the same optional readonly fields to `ImportMetaEnv`. Do not add any AI key variable to Astro public types.

- [ ] **Step 6: Run and commit**

Run: `pnpm exec tsx --test tests/unit/comments-config.test.ts tests/unit/comments-domain.test.ts && pnpm lint`

Expected: PASS.

```powershell
git add .env.example src/env.d.ts src/features/comments tests/unit/comments-config.test.ts tests/unit/comments-domain.test.ts
git commit -m "feat: define secure comment configuration"
```

---

### Task 2: PostgreSQL schema and RLS boundary

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202608310001_prepublication_comments.sql`
- Test: `tests/comments-migration.test.mjs`

**Interfaces:**
- Produces: `public.comments`, `public.comment_reviews`, `public.comment_moderation_actions`.
- Produces: `public.cleanup_expired_comment_content(now_value timestamptz)`.
- Consumes: status and target values from Task 1.

- [ ] **Step 1: Write the migration contract test**

```js
test('comment migration enforces prepublication RLS and no browser writes', () => {
  const sql = readFileSync(migration, 'utf8');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /status = 'published'/i);
  assert.match(sql, /author_id = auth\.uid\(\)/i);
  assert.match(sql, /revoke all on .*comments.* from anon, authenticated/is);
  assert.doesNotMatch(sql, /create policy[^;]+for insert/is);
  assert.match(sql, /cleanup_expired_comment_content/i);
});
```

- [ ] **Step 2: Run the red test**

Run: `node --test tests/comments-migration.test.mjs`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Create constrained tables**

The migration must include these checks:

```sql
status text not null check (status in ('pending','ai_reviewing','manual_review','published','rejected','deleted')),
target_kind text not null check (target_kind in ('post','talk','knowledge','project')),
target_path text not null check (target_path ~ '^/(posts|talk|knowledge|projects)/[^?#]+/$'),
body text check (body is null or char_length(body) between 2 and 2000),
published_at timestamptz,
check ((status = 'deleted') = (body is null)),
check (status <> 'published' or published_at is not null)
```

Use UUID primary keys, an authenticated `author_id`, immutable GitHub ID, username snapshot, idempotency key unique per author, one-level `parent_id`, policy version, and timestamps. Index `(target_path, status, published_at)` and `(author_id, created_at)`.

- [ ] **Step 4: Apply grants and RLS**

Revoke writes from `anon` and `authenticated`. Grant `SELECT` on `comments`; policies permit `status = 'published'` to everyone and `author_id = auth.uid()` to authenticated owners. Do not grant any browser role access to reviews or moderation actions. Edge Functions use the service role for state transitions.

- [ ] **Step 5: Add retention cleanup**

Create a security-definer function owned by the migration role that changes rejected comments older than 30 days and manual-review comments older than 90 days to `deleted`, clears their bodies, deletes moderation-action rows older than 180 days, and returns affected row count. Explicit user/admin deletion also changes status to `deleted` and clears the body in the same statement. Revoke execution from public browser roles; only service role may invoke it.

- [ ] **Step 6: Run and commit**

Run: `node --test tests/comments-migration.test.mjs`

Expected: PASS.

```powershell
git add supabase/config.toml supabase/migrations/202608310001_prepublication_comments.sql tests/comments-migration.test.mjs
git commit -m "feat: add prepublication comment schema"
```

---

### Task 3: Provider-neutral AI review adapters

**Files:**
- Create: `supabase/functions/_shared/comment-review/types.ts`
- Create: `supabase/functions/_shared/comment-review/policy.ts`
- Create: `supabase/functions/_shared/comment-review/providers.ts`
- Test: `tests/unit/comments-review-providers.test.ts`

**Interfaces:**
- Produces: `CommentReviewProvider.review(input, signal)`.
- Produces: `createCommentReviewProvider(config, fetchImpl)`.
- Produces: `parsePolicyReview(value, provider, model)`.
- Consumes: only server-side secret configuration.

- [ ] **Step 1: Write fail-closed provider tests**

```ts
test('strict parser accepts approve and rejects unknown fields or decisions', () => {
  assert.equal(parsePolicyReview({ decision: 'approve', reason_codes: [] }, 'kimi', 'model').decision, 'approve');
  assert.throws(() => parsePolicyReview({ decision: 'reject', reason_codes: [] }, 'kimi', 'model'));
  assert.throws(() => parsePolicyReview({ decision: 'approve', reason_codes: [], analysis: 'hidden' }, 'kimi', 'model'));
});

test('provider timeout and malformed JSON become manual review', async () => {
  const provider = createCommentReviewProvider(kimiConfig, async () => new Response('not json', { status: 200 }));
  assert.deepEqual((await provider.review(input, AbortSignal.timeout(100))).decision, 'manual_review');
});
```

- [ ] **Step 2: Run the red test**

Run: `pnpm exec tsx --test tests/unit/comments-review-providers.test.ts`

Expected: FAIL on missing provider modules.

- [ ] **Step 3: Define exact contracts and reason codes**

```ts
export const REVIEW_REASON_CODES = [
  'unsafe_content', 'personal_data', 'off_topic', 'promotion', 'suspicious_link',
  'spam', 'prompt_injection', 'uncertain', 'provider_error', 'invalid_response',
] as const;
export type ReviewDecision = 'approve' | 'manual_review';
```

The strict parser accepts exactly `decision` and `reason_codes`, rejects unknown keys, deduplicates known reasons, and never returns provider text.

- [ ] **Step 4: Implement fixed-origin adapters**

Use these compiled mappings:

```ts
const PROVIDER_ORIGINS = {
  openai: 'https://api.openai.com',
  kimiCn: 'https://api.moonshot.cn',
  kimiGlobal: 'https://api.moonshot.ai',
  deepseek: 'https://api.deepseek.com',
} as const;
```

OpenAI calls `/v1/moderations` first and then the configured structured policy model only when safety is unflagged. Kimi and DeepSeek call `/v1/chat/completions` with temperature `0`, no tools, a 1200-token output cap, and JSON mode where the provider supports it. The system prompt contains the versioned six-rule policy and explicitly treats the comment/page summary as untrusted data.

Every network exception, non-2xx response, invalid JSON, unknown result, timeout, or OpenAI flag returns `{ decision: 'manual_review', reasonCodes: [...] }`. The adapter result exposes provider/model but no raw response.

- [ ] **Step 5: Prove no automatic provider fallback**

Add a test whose Kimi request returns 500 and assert there is one fetch call and no DeepSeek origin. Provider selection is a single discriminated config value; no array or fallback order is accepted.

- [ ] **Step 6: Run and commit**

Run: `pnpm exec tsx --test tests/unit/comments-review-providers.test.ts && pnpm lint`

Expected: PASS.

```powershell
git add supabase/functions/_shared/comment-review tests/unit/comments-review-providers.test.ts
git commit -m "feat: add pluggable comment reviewers"
```

---

### Task 4: Authenticated submit, list, and moderation functions

**Files:**
- Create: `supabase/functions/_shared/comments/contracts.ts`
- Create: `supabase/functions/_shared/comments/submit.ts`
- Create: `supabase/functions/_shared/comments/moderate.ts`
- Create: `supabase/functions/_shared/http.ts`
- Create: `supabase/functions/submit-comment/index.ts`
- Create: `supabase/functions/list-comments/index.ts`
- Create: `supabase/functions/delete-comment/index.ts`
- Create: `supabase/functions/moderate-comment/index.ts`
- Test: `tests/unit/comments-submit.test.ts`
- Test: `tests/unit/comments-moderate.test.ts`

**Interfaces:**
- Produces: `submitComment(input, dependencies): Promise<SubmitCommentResult>`.
- Produces: `moderateComment(input, actor, dependencies): Promise<ModerateCommentResult>`.
- Consumes: domain and provider interfaces from Tasks 1 and 3.

- [ ] **Step 1: Write submit workflow tests**

```ts
test('safe AI result publishes only after pending and reviewing states', async () => {
  const events: string[] = [];
  const result = await submitComment(input, fakeDependencies(events, { decision: 'approve', reasonCodes: [] }));
  assert.deepEqual(events, ['insert:pending', 'update:ai_reviewing', 'review:approve', 'update:published']);
  assert.equal(result.status, 'published');
});

test('provider failure leaves a durable manual review item', async () => {
  const result = await submitComment(input, throwingProviderDependencies());
  assert.equal(result.status, 'manual_review');
});
```

- [ ] **Step 2: Write moderator authorization tests**

```ts
test('only the immutable GitHub ID can moderate', async () => {
  await assert.rejects(() => moderateComment(action, { githubId: 7 }, deps), /forbidden/);
  assert.equal((await moderateComment(action, { githubId: 105589585 }, deps)).status, 'published');
});
```

- [ ] **Step 3: Run the red tests**

Run: `pnpm exec tsx --test tests/unit/comments-submit.test.ts tests/unit/comments-moderate.test.ts`

Expected: FAIL on missing shared workflows.

- [ ] **Step 4: Implement injectable workflows**

Pure shared functions accept repositories, provider, clock, and ID generator as dependencies. They validate canonical targets against a supplied public target set, enforce same-target one-level replies, use an author-scoped idempotency key, and persist every transition. A provider exception is caught only around the model call and converted to a `provider_error` review plus `manual_review` status.

- [ ] **Step 5: Implement thin Edge Function entries**

Each entry:

1. handles exact CORS origins from `PUBLIC_PORTAL_ORIGINS`;
2. accepts only its declared method;
3. validates the Supabase JWT and reads the GitHub provider identity server-side;
4. applies a 10-minute per-account submission bucket and daily cap;
5. uses the service-role client only after authorization;
6. returns fixed safe JSON error codes without body, token, key, SQL, or provider response.

`list-comments` returns published comments for a canonical target and, when authenticated, the caller's non-public comments. `delete-comment` verifies ownership, changes the author's pending/manual/public comment to `deleted`, clears the body, and records a fixed `author_delete` action. `moderate-comment` requires numeric GitHub ID `105589585` and creates an audit row in the same transaction as the status change.

- [ ] **Step 6: Run and commit**

Run: `pnpm exec tsx --test tests/unit/comments-submit.test.ts tests/unit/comments-moderate.test.ts && pnpm lint`

Expected: PASS.

```powershell
git add supabase/functions tests/unit/comments-submit.test.ts tests/unit/comments-moderate.test.ts
git commit -m "feat: add moderated comment functions"
```

---

### Task 5: Lazy browser client and honest comment UI

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/services/comments/client.ts`
- Create: `src/components/comments/CommentsSection.astro`
- Create: `src/components/comments/CommentsPanel.svelte`
- Test: `tests/unit/comments-client.test.ts`
- Test: `tests/comments-build.test.mjs`

**Interfaces:**
- Produces: `createCommentsClient(config)` with `session`, `loginWithGitHub`, `logout`, `list`, `submit`, and `deleteOwn`.
- `CommentsSection` consumes `{ kind, path, title, summary }`.
- Consumes: Task 1 public configuration.

- [ ] **Step 1: Add failing preview build assertions**

```js
test('preview comment sections have no form, SDK, endpoint, or network sink', () => {
  const post = readDist('posts/hello-world/index.html');
  assert.match(post, /data-comments-state="preview"/);
  assert.doesNotMatch(post, /<textarea|supabase|submit-comment/);
  assert.equal(commentRuntimeFindings.length, 0);
});
```

- [ ] **Step 2: Add failing browser client contract tests**

Test fixed Edge Function paths, authorization propagation through the Supabase SDK, safe parsing, and that no provider API origin or AI key variable appears in the source.

- [ ] **Step 3: Run the red tests**

Run: `pnpm exec tsx --test tests/unit/comments-client.test.ts && node --test tests/comments-build.test.mjs`

Expected: FAIL because the UI and client do not exist.

- [ ] **Step 4: Install and isolate Supabase**

Run: `pnpm add @supabase/supabase-js@^2`

Only `src/services/comments/client.ts` imports the package. `CommentsSection.astro` omits that Svelte component entirely in preview mode, so the default build emits neither SDK nor endpoint.

- [ ] **Step 5: Implement the enabled panel**

The panel loads on `client:visible`, reads published comments, and shows a GitHub login button when signed out. The composer renders only for an authenticated GitHub session, has a visible label, `maxlength="2000"`, remaining count, policy link, and `aria-live` result. Published top-level comments expose one reply action that passes their ID as `parentId`; replies cannot themselves be replied to. It renders body text through Svelte interpolation with `white-space: pre-wrap`; never use `{@html}`.

After submit, show `published` or “等待人工审核” from the server result. Display the caller's own pending items separately and never merge them into the public list. Buttons and links are at least 44px high.

- [ ] **Step 6: Run and commit**

Run: `pnpm exec tsx --test tests/unit/comments-client.test.ts && node --test tests/comments-build.test.mjs && pnpm lint`

Expected: PASS in preview mode; an explicit enabled fixture emits one Supabase browser origin and no model origins.

```powershell
git add package.json pnpm-lock.yaml src/services/comments src/components/comments tests/unit/comments-client.test.ts tests/comments-build.test.mjs
git commit -m "feat: add GitHub-only comment panel"
```

---

### Task 6: Mount comments and build the moderation experience

**Files:**
- Modify: `src/pages/posts/[id].astro`
- Modify: `src/pages/talk/[id].astro`
- Modify: `src/pages/knowledge/[slug].astro`
- Modify: `src/pages/projects/[slug].astro`
- Create: `src/components/comments/ModerationQueue.svelte`
- Create: `src/pages/comments-policy.astro`
- Create: `src/pages/moderation.astro`
- Modify: `src/utils/homeModel.ts`
- Modify: `src/utils/portalIndex.ts`
- Test: `tests/comments-routes-build.test.mjs`

**Interfaces:**
- Consumes: `CommentsSection` and `createCommentsClient` from Task 5.
- Produces: public `/comments-policy` and noindex `/moderation` routes.

- [ ] **Step 1: Write route and mount tests**

Build a test fixture and assert all four detail kinds emit one canonical `data-comments-target`, the rules page contains GitHub/AI/manual-review copy, and moderation preview contains no queue request or controls.

- [ ] **Step 2: Run the red test**

Run: `node --test tests/comments-routes-build.test.mjs`

Expected: FAIL because routes and mounts do not exist.

- [ ] **Step 3: Mount one wrapper per detail page**

Import `CommentsSection.astro` and pass normalized target kind/path/title/summary. Place it after reusable content/navigation, outside `.prose` where necessary. Do not add comment logic to the existing 500-line article page.

- [ ] **Step 4: Create public rules and admin shell**

`/comments-policy` explains GitHub-only login, prepublication AI review, manual fallback, plain text, retention, deletion, active-provider disclosure, and how to report a problem. `/moderation` includes `robots=noindex,nofollow`; preview is explanatory only, while enabled mode mounts `ModerationQueue`.

The queue verifies the session through the server, lists `manual_review`, and requires a reason plus a confirm step for approve/reject/delete. It never trusts GitHub ID from browser metadata as authorization evidence.

- [ ] **Step 5: Expose an honest portal entry**

Add `/comments-policy` to the public index and add `评论与审核` to `portalTools` as `preview` until the production backend is verified. Update affected metrics tests to expect one additional preview tool; do not mark it ready from code existence alone.

- [ ] **Step 6: Run and commit**

Run: `node --test tests/comments-routes-build.test.mjs tests/portal-routes-build.test.mjs && pnpm lint`

Expected: PASS.

```powershell
git add src/pages/posts src/pages/talk src/pages/knowledge src/pages/projects src/pages/comments-policy.astro src/pages/moderation.astro src/components/comments/ModerationQueue.svelte src/utils/homeModel.ts src/utils/portalIndex.ts tests/comments-routes-build.test.mjs
git commit -m "feat: integrate moderated comments"
```

---

### Task 7: Privacy, secret scanning, operations, and complete local verification

**Files:**
- Modify: `src/pages/privacy.astro`
- Modify: `src/config/about.md`
- Modify: `src/content/projects/suntburst-portal.md`
- Create: `src/content/updates/2026-08-31-comment-moderation-prepared.md`
- Create: `scripts/check-public-secrets.ts`
- Create: `docs/operations/comments-runbook.md`
- Modify: `package.json`
- Modify: `tests/production-build.test.mjs`
- Modify: `tests/helpers/external-url-audit.mjs`
- Test: `tests/comments-security.test.mjs`

**Interfaces:**
- Produces: `pnpm test:secrets` and the external setup/rollback runbook.
- Consumes: all previous tasks.

- [ ] **Step 1: Write failing security assertions**

Assert tracked files and `dist/` contain no known secret prefixes, authorization headers with literals, service-role values, AI keys, user-provided keys, or model origins in browser artifacts. Assert preview builds still contain exactly the existing weather runtime sink and enabled comment fixtures allow only their Supabase origin.

- [ ] **Step 2: Run the red test**

Run: `node --test tests/comments-security.test.mjs`

Expected: FAIL because scanner and explicit comment policy do not exist.

- [ ] **Step 3: Implement a redacted scanner**

`scripts/check-public-secrets.ts` scans tracked source plus `dist/`, reports only file path, line number, and rule ID, and never prints the matched value. Rules cover common `sk-` formats, JWT/service-role literals, `Authorization: Bearer` literals, and assignments to Kimi/DeepSeek/OpenAI secret names with non-empty values. Add `test:secrets` to `package.json`.

- [ ] **Step 4: Update public disclosures honestly**

Privacy and About must distinguish prepared code from enabled service. State that GitHub identity, comment text, target page, AI supplier, retention, human moderation, and deletion apply only after enabled. The project/update Markdown records implementation evidence but does not claim live comments before external verification.

- [ ] **Step 5: Write the runbook**

The runbook includes: create Supabase project; enable GitHub only; copy the exact callback URL shown by Supabase into a GitHub OAuth App; apply migration; deploy the submit/list/delete/moderate functions; set exact portal origin; rotate exposed Kimi/DeepSeek keys; set only the selected provider's new secret; add the Supabase URL and publishable key as GitHub repository variables; test; enable; rotate; disable and rollback. Commands read values from already-set environment variables and never put a real secret on a command line captured in Git history.

- [ ] **Step 6: Run the full local suite**

```powershell
$nodeExe = 'C:\Users\TSun\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $nodeExe node_modules\typescript\bin\tsc --noEmit
& $nodeExe node_modules\tsx\dist\cli.mjs --test tests\unit\*.test.ts
& $nodeExe --test --test-concurrency=1 tests\*.test.mjs
pnpm test:secrets
git diff --check
```

Expected: all checks pass; preview emits no comment request or usable form.

- [ ] **Step 7: Browser-check preview and commit**

Use production preview at desktop 1440×900 and mobile 390×844. Verify article content, comments preview, rules, privacy, moderation preview, no overflow, 44px controls, zero browser errors, and no comment request. Then commit:

```powershell
git add src/pages/privacy.astro src/config/about.md src/content/projects/suntburst-portal.md src/content/updates scripts/check-public-secrets.ts docs/operations/comments-runbook.md package.json tests
git commit -m "docs: secure the moderated comment rollout"
```

---

### Task 8: External configuration, controlled activation, and online evidence

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `src/utils/homeModel.ts`
- Modify: `src/content/projects/suntburst-portal.md`
- Create: `src/content/updates/2026-08-31-comments-live.md`
- Modify: `docs/operations/comments-runbook.md`

**Interfaces:**
- Consumes: a Supabase project, GitHub OAuth App, newly rotated selected-provider key, project URL, and publishable key.
- Produces: verified `enabled` comments online.

- [ ] **Step 1: Stop unless external resources are authoritative**

Before changing state, verify a real Supabase project exists, GitHub OAuth is enabled and other providers are disabled, callback/site URLs are exact, migrations/functions are deployed, and the selected provider has a newly rotated server secret. Never use the keys previously pasted in chat.

- [ ] **Step 2: Run controlled backend acceptance**

With test GitHub accounts, prove: a safe comment publishes; sensitive/off-topic/promotion/prompt-injection comments remain private in `manual_review`; provider timeout remains private; a non-moderator cannot read the queue; `105589585` can approve; deleting clears body; public reads never return pending content.

- [ ] **Step 3: Add only public build variables**

Pass GitHub repository variables `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` plus `PUBLIC_COMMENTS_STATE=enabled` to the Pages build. Secrets remain in Supabase and never enter GitHub build variables.

- [ ] **Step 4: Change public status only after acceptance**

Mark `评论与审核` ready, update project/change log and privacy with the active provider and verified date, and rerun the complete Task 7 suite.

- [ ] **Step 5: Deploy and verify online**

Push `main`, wait for the exact GitHub Actions run, confirm `status.json` SHA, then test online desktop/mobile login, submit, safe publish, manual review, unauthorized access, deletion, provider failure, no overflow, no browser errors, and no secret in Pages artifacts.

- [ ] **Step 6: Perform shutdown drill**

Set `PUBLIC_COMMENTS_STATE=preview`, deploy, and prove comment requests cease while all static content remains readable. Re-enable only after the drill passes and record evidence in the runbook.

- [ ] **Step 7: Commit and push final evidence**

```powershell
git add .github/workflows/deploy-pages.yml src/utils/homeModel.ts src/content/projects/suntburst-portal.md src/content/updates/2026-08-31-comments-live.md docs/operations/comments-runbook.md
git commit -m "feat: enable reviewed GitHub comments"
git push origin main
```
