# Private Knowledge Platform and RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phone- and desktop-ready multi-user knowledge platform with GitHub-only login, reviewed membership, private/workspace permissions, versioned documents, reviewed public snapshots, and citation-backed public/private RAG.

**Architecture:** Keep the public Astro portal at the repository root and add a separate React/Vite knowledge SPA under `apps/knowledge`, deployed to a different origin. Supabase Auth/PostgreSQL/RLS/Storage/pgvector/Edge Functions provide identity, permissions, files, queues, publication, and AI; the public portal imports only checksum-verified published snapshots during its static build.

**Tech Stack:** React 19, Vite 8, React Router 7, TanStack Query 5, Supabase JS 2, Zod 4, PostgreSQL RLS, pgvector `vector(1536)`, pgmq, pg_cron, Supabase Edge Functions/Deno, isolated Node PDF parser, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-30-comprehensive-personal-portal-design.md`

## Global Constraints

- The knowledge application must use a different origin from `https://suntburst.github.io`; the preferred initial hostname is `suntburst-kb.pages.dev` only if Cloudflare assigns it.
- The knowledge origin loads no public portal comments, analytics, weather, music, ads, external profile widgets, or public activity scripts.
- GitHub OAuth is the only authentication provider; first login creates only a profile and no workspace membership.
- Security identity comes from the server-verified GitHub OAuth identity numeric ID, stored as PostgreSQL `bigint` and represented as a string in JavaScript; never trust mutable `user_metadata` or client-supplied role/user IDs.
- Workspaces use `owner|admin|editor|viewer`; role is an operation ceiling and document visibility/ACL narrows the object set. ACL never raises a user above the role ceiling.
- Admin/owner may manage private document metadata but cannot read another user's private versions, chunks, attachments, search hits, or AI context without explicit read ACL.
- Normal CRUD uses the user's JWT and RLS. Private retrieval/RAG must not use `service_role`; privileged background keys never derive authority solely from client fields.
- Private and workspace documents never enter the repository, portal source, `dist/`, source maps, RSS, sitemap, public search, public attachments, or `llms*.txt`.
- Public publishing copies an immutable candidate and then an independent published snapshot; it never toggles a private document row to public.
- Private AI cache is off by default. Model-generated URLs are never trusted; citations are built from authorized server retrieval records.
- Production enablement requires separate database and object backups, a verified restore, RPO ≤24h, RTO ≤8h, and cross-workspace/withdrawal leak tests.

---

### Task 1: Add the isolated knowledge application and shared contracts workspace

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `apps/knowledge/package.json`
- Create: `apps/knowledge/index.html`
- Create: `apps/knowledge/tsconfig.json`
- Create: `apps/knowledge/vite.config.ts`
- Create: `apps/knowledge/src/main.tsx`
- Create: `apps/knowledge/src/router.tsx`
- Create: `apps/knowledge/src/env.ts`
- Create: `apps/knowledge/src/styles.css`
- Create: `apps/knowledge/src/routes/LoginPage.tsx`
- Create: `apps/knowledge/src/routes/NotFoundPage.tsx`
- Create: `apps/knowledge/scripts/generate-security-files.mjs`
- Create: `apps/knowledge/public/_redirects`
- Create: `packages/content-contracts/package.json`
- Create: `packages/content-contracts/src/index.ts`
- Create: `packages/content-contracts/src/auth.ts`
- Create: `packages/content-contracts/src/knowledge.ts`
- Create: `packages/content-contracts/src/publication.ts`
- Create: `packages/content-contracts/src/ai.ts`
- Create: `tests/workspace-build.test.mjs`

**Interfaces:**
- Root scripts: `build:portal`, `build:knowledge`, `build:all`, `test:knowledge`.
- Knowledge env parser exposes only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PORTAL_URL`.
- Shared contracts contain no secret, database client, DOM, or provider SDK.

- [ ] **Step 1: Write the failing dual-build test**

```js
test('portal and isolated knowledge app build independently', () => {
  const portal = spawnSync('pnpm', ['build:portal'], { cwd: root, shell: true, encoding: 'utf8' });
  const knowledge = spawnSync('pnpm', ['build:knowledge'], { cwd: root, shell: true, encoding: 'utf8' });
  assert.equal(portal.status, 0, portal.stderr);
  assert.equal(knowledge.status, 0, knowledge.stderr);
  assert.ok(existsSync(path.join(root, 'apps/knowledge/dist/index.html')));
});
```

- [ ] **Step 2: Run and confirm workspace scripts are absent**

Run: `node --test tests/workspace-build.test.mjs`

Expected: FAIL because `build:portal` and `build:knowledge` do not exist.

- [ ] **Step 3: Define the workspace without moving the portal**

```yaml
# pnpm-workspace.yaml
packages:
  - .
  - apps/*
  - packages/*
```

Root `build:portal` runs the current Astro build; `build:knowledge` runs `pnpm --filter @suntburst/knowledge build`; `build:all` runs both serially. Add React/Vite/Router/Query/Supabase/Zod/react-markdown dependencies only to the knowledge package.

- [ ] **Step 4: Create an isolated SPA shell and strict generated headers**

```tsx
// apps/knowledge/src/router.tsx
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
```

`generate-security-files.mjs` parses the exact Supabase HTTPS origin and writes `_headers` with `default-src 'self'`, exact `connect-src` for Supabase HTTPS/WSS, `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`, and no portal third-party origins. `_redirects` contains `/* /index.html 200`.

- [ ] **Step 5: Define shared request/response contracts**

```ts
// packages/content-contracts/src/auth.ts
export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type MembershipStatus = 'pending' | 'active' | 'disabled';
export interface ActiveMembership { workspaceId: string; role: WorkspaceRole }
export interface BootstrapResponse {
  profile: { userId: string; githubNumericId: string; login: string; avatarUrl?: string };
  activeMemberships: ActiveMembership[];
  pendingCount: number;
}
```

- [ ] **Step 6: Run, verify isolation, and commit**

Run: `pnpm install --no-frozen-lockfile && pnpm build:all && node --test tests/workspace-build.test.mjs && rg -n -i "waline|umami|weather|music" apps/knowledge/dist`

Expected: both builds PASS and `rg` returns no public integration script/module in the knowledge artifact.

```bash
git add pnpm-workspace.yaml package.json pnpm-lock.yaml apps/knowledge packages/content-contracts tests/workspace-build.test.mjs
git commit -m "feat: scaffold isolated knowledge application"
```

### Task 2: Create Supabase schemas, identity/workspace tables, and permission helpers

**Files:**
- Modify: `supabase/config.toml`
- Create: `supabase/seed.sql`
- Create: `supabase/migrations/202608300101_foundation.sql`
- Create: `supabase/migrations/202608300102_identity_workspaces.sql`
- Create: `supabase/tests/database/001_schema_contract.test.sql`
- Create: `supabase/tests/database/010_profiles_memberships_rls.test.sql`
- Create: `supabase/tests/database/090_role_escalation.test.sql`
- Create: `packages/content-contracts/src/database.types.ts`

**Interfaces:**
- Business tables live in schema `app`, callable RPC in `api`, non-exposed permission helpers in `private`.
- Produces `private.is_active_member`, `private.member_role`, `private.role_at_least`, `private.can_manage_member`.
- Data API exposes only required `app` tables and `api` functions; all tables use RLS.

- [ ] **Step 1: Write pgTAP tests for anonymous, pending, disabled, cross-workspace, and escalation denial**

```sql
select plan(6);
select is_empty($$ select * from app.workspaces $$, 'anon sees no workspace');
select is_empty($$ select * from app.workspaces where id = :'workspace_a' $$, 'pending sees no workspace name');
select throws_ok($$ update app.workspace_members set role = 'owner' where user_id = auth.uid() $$, '42501', null, 'member cannot self elevate');
select is_empty($$ select * from app.workspace_members where workspace_id = :'workspace_b' $$, 'workspace A member sees no B membership');
select throws_ok($$ update app.workspaces set owner_id = auth.uid() where id = :'workspace_a' $$, '42501', null, 'owner transfer requires RPC');
select * from finish();
```

- [ ] **Step 2: Add schemas, enums, extensions, and revoked defaults**

Enable `pgcrypto`, `vector`, `pg_trgm`, `pgmq`, `pg_cron`, and `pg_net`. Create enums for workspace role, membership status, visibility, job state, and publication state. Revoke public access to `private`; revoke default table/sequence/function privileges and grant only explicit operations.

- [ ] **Step 3: Create identity and workspace tables with immutable GitHub ID**

```sql
create table app.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  github_numeric_id bigint not null unique,
  login text not null,
  avatar_url text,
  global_status text not null default 'active' check (global_status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.workspace_members (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  user_id uuid not null references app.profiles(user_id) on delete cascade,
  role app.workspace_role not null,
  status app.membership_status not null default 'pending',
  revision bigint not null default 1,
  primary key (workspace_id, user_id)
);
```

Create `workspace_invites` bound to `github_numeric_id`, with expiry/use/revocation timestamps; a URL token alone cannot choose a different GitHub account.

- [ ] **Step 4: Implement fixed-search-path permission helpers**

```sql
create function private.is_active_member(p_workspace_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app.workspace_members m
    join app.profiles p on p.user_id = m.user_id
    where m.workspace_id = p_workspace_id and m.user_id = p_user_id
      and m.status = 'active' and p.global_status = 'active'
  );
$$;
revoke all on function private.is_active_member(uuid, uuid) from public;
```

Implement the remaining helpers with fully qualified names and `auth.uid()` defaults; do not accept a client role as authority.

- [ ] **Step 5: Add exact RLS policies and seed identities**

Seed two workspaces and fixed test users for anonymous, pending/disabled viewer, active viewer/editor/admin/owner, cross-workspace member, and invitee. Owner/admin can read member metadata according to the truth table; only owner can manage admin or transfer/delete a workspace.

- [ ] **Step 6: Run the database gate and generate types**

Run: `supabase start && supabase db reset && supabase db lint && supabase test db && supabase gen types typescript --local --schema app,api > packages/content-contracts/src/database.types.ts`

Expected: all pgTAP tests PASS and generated types contain no `private` schema.

- [ ] **Step 7: Commit database identity foundations**

```bash
git add supabase/config.toml supabase/seed.sql supabase/migrations/202608300101_foundation.sql supabase/migrations/202608300102_identity_workspaces.sql supabase/tests packages/content-contracts/src/database.types.ts
git commit -m "feat: add knowledge identity and workspace RLS"
```

### Task 3: Implement GitHub-only OAuth, safe bootstrap, and membership gates

**Files:**
- Create: `supabase/functions/_shared/auth.ts`
- Modify: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/auth-bootstrap/index.ts`
- Create: `supabase/functions/workspace-create/index.ts`
- Create: `supabase/functions/member-invite/index.ts`
- Create: `supabase/functions/member-review/index.ts`
- Create: `supabase/functions/member-role/index.ts`
- Create: `supabase/functions/_tests/auth-bootstrap.test.ts`
- Create: `supabase/functions/_tests/member-admin.test.ts`
- Create: `apps/knowledge/src/lib/supabase.ts`
- Create: `apps/knowledge/src/lib/edgeApi.ts`
- Create: `apps/knowledge/src/auth/AuthProvider.tsx`
- Create: `apps/knowledge/src/auth/AuthGate.tsx`
- Create: `apps/knowledge/src/auth/WorkspaceGate.tsx`
- Create: `apps/knowledge/src/auth/RoleGate.tsx`
- Create: `apps/knowledge/src/routes/AuthCallbackPage.tsx`
- Create: `apps/knowledge/src/routes/PendingPage.tsx`
- Create: `apps/knowledge/src/routes/DashboardPage.tsx`
- Modify: `apps/knowledge/src/router.tsx`
- Create: `apps/knowledge/e2e/pending-access.spec.ts`

**Interfaces:**
- `auth-bootstrap` returns `BootstrapResponse` from Task 1.
- OAuth callback is fixed to `${KNOWLEDGE_PUBLIC_ORIGIN}/auth/callback`.
- One-time owner bootstrap uses `BOOTSTRAP_OWNER_GITHUB_ID`; no first-login-wins path exists.

- [ ] **Step 1: Write identity spoofing and pending-leak tests**

```ts
Deno.test('bootstrap ignores mutable user metadata and requires GitHub identity', async () => {
  const response = await bootstrap(userWithMetadata({ githubNumericId: '1' }, noGithubIdentity));
  assertEquals(response.status, 403);
});

Deno.test('pending response reveals no workspace name', async () => {
  const body = await bootstrap(pendingUser);
  assertEquals(body.activeMemberships, []);
  assertEquals('workspaceName' in body, false);
});
```

- [ ] **Step 2: Implement verified GitHub identity extraction**

Use `auth.getUser(jwt)` and the returned provider identity. Require `provider === 'github'`; take the numeric subject/provider ID from the verified identity, validate digits, and pass it to PostgreSQL as a string. Never take it from request JSON or mutable metadata. Do not store the GitHub provider access token.

- [ ] **Step 3: Implement membership admin functions**

Each function verifies the caller, current membership status, role ceiling, target numeric ID, expected membership revision, and workspace. Admin may manage viewer/editor only; owner alone manages admin, transfers ownership, and deletes workspace. Write an audit event for every success and denial without including private content.

- [ ] **Step 4: Implement PKCE login and application gates**

```ts
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: { redirectTo: `${env.knowledgeOrigin}/auth/callback`, skipBrowserRedirect: false },
});
```

Supabase configuration enables only GitHub; email/password, anonymous, phone, and other providers remain disabled. `AuthGate` handles expired/revoked sessions. `WorkspaceGate` routes no-membership users to a neutral dashboard and workspace-pending users to `/pending` without exposing names.

- [ ] **Step 5: Run functions and browser gates**

Run: `deno test supabase/functions/_tests/auth-bootstrap.test.ts supabase/functions/_tests/member-admin.test.ts && pnpm --filter @suntburst/knowledge test && pnpm exec playwright test apps/knowledge/e2e/pending-access.spec.ts`

Expected: spoofed/non-GitHub identities fail, pending/disabled users see no workspace content, and a GitHub rename preserves the numeric identity link.

- [ ] **Step 6: Commit authentication and gates**

```bash
git add supabase/functions apps/knowledge/src/lib apps/knowledge/src/auth apps/knowledge/src/routes apps/knowledge/src/router.tsx apps/knowledge/e2e/pending-access.spec.ts
git commit -m "feat: add GitHub-only knowledge access"
```

### Task 4: Add private/workspace documents, immutable versions, ACL, and conflict-safe editing

**Files:**
- Create: `supabase/migrations/202608300103_documents_versions_acl.sql`
- Create: `supabase/tests/database/020_documents_rls.test.sql`
- Create: `supabase/tests/database/030_versions_acl_rls.test.sql`
- Create: `packages/content-contracts/src/documents.ts`
- Create: `apps/knowledge/src/features/documents/api.ts`
- Create: `apps/knowledge/src/features/documents/DocumentEditor.tsx`
- Create: `apps/knowledge/src/features/documents/VersionConflict.tsx`
- Create: `apps/knowledge/src/features/documents/DocumentHistory.tsx`
- Create: `apps/knowledge/src/routes/WorkspacePage.tsx`
- Create: `apps/knowledge/src/routes/DocumentPage.tsx`
- Modify: `apps/knowledge/src/router.tsx`
- Create: `apps/knowledge/e2e/documents.spec.ts`
- Create: `apps/knowledge/e2e/version-conflict.spec.ts`

**Interfaces:**
- RPC: `api.create_document`, `api.save_document_version`, `api.update_document_metadata`, `api.soft_delete_document`, `api.restore_document`.
- `SaveDocumentVersionInput` requires `documentId`, `baseVersionId`, `contentMarkdown`, `checksum`.
- Conflict result uses code `VERSION_CONFLICT` and returns the current version metadata, not its body unless caller may read it.

- [ ] **Step 1: Write the complete role/ACL negative matrix**

```sql
select is_empty($$ select * from app.document_versions where document_id = :'other_private' $$, 'admin without ACL cannot read private body');
select throws_ok($$ select api.save_document_version(:'other_private', :'base', 'x', 'hash') $$, '42501', null, 'editor cannot edit another private doc');
select lives_ok($$ select api.save_document_version(:'acl_write_doc', :'base', 'x', 'hash') $$, 'editor with write ACL may save');
select throws_ok($$ select api.save_document_version(:'acl_write_doc', :'base', 'x', 'hash') $$, '42501', null, 'viewer ACL cannot exceed viewer role ceiling');
```

- [ ] **Step 2: Create metadata/body separation and RLS**

`documents` stores title, owner, visibility, status, current version ID, revision, soft-delete time. `document_versions` stores immutable Markdown/checksum/version/creator. Admin/owner may read necessary `documents` metadata but versions require author, `workspace` visibility with active membership, or explicit read ACL. `document_acl` is valid only for active workspace members.

- [ ] **Step 3: Implement transactional optimistic writes**

```sql
-- inside api.save_document_version
select current_version_id into v_current from app.documents where id = p_document_id for update;
if v_current <> p_base_version_id then
  raise exception using errcode = '40001', message = 'VERSION_CONFLICT';
end if;
-- insert immutable version, update current pointer/revision, enqueue index job, audit; one transaction
```

Protected columns (`workspace_id`, `owner_id`, `created_by`, version number) cannot be directly changed. Metadata updates require `expected_revision`.

- [ ] **Step 4: Implement a safe Markdown editor and conflict UI**

Use a plain textarea plus `react-markdown` with raw HTML disabled. Save includes base version/checksum. On conflict, keep the user's draft locally in memory, fetch authorized current metadata/body, show side-by-side comparison, and require an explicit new save; never auto-overwrite.

- [ ] **Step 5: Run RLS and two-browser conflict tests**

Run: `supabase db reset && supabase test db && pnpm exec playwright test apps/knowledge/e2e/documents.spec.ts apps/knowledge/e2e/version-conflict.spec.ts`

Expected: the role matrix passes; two editors cannot silently overwrite; admin cannot access unshared private body through version/search routes.

- [ ] **Step 6: Commit document collaboration basics**

```bash
git add supabase/migrations/202608300103_documents_versions_acl.sql supabase/tests/database/020_documents_rls.test.sql supabase/tests/database/030_versions_acl_rls.test.sql packages/content-contracts/src/documents.ts apps/knowledge/src/features/documents apps/knowledge/src/routes/WorkspacePage.tsx apps/knowledge/src/routes/DocumentPage.tsx apps/knowledge/src/router.tsx apps/knowledge/e2e
git commit -m "feat: add versioned private knowledge documents"
```

### Task 5: Add private attachments, persistent ingestion, and isolated PDF parsing

**Files:**
- Create: `supabase/migrations/202608300104_attachments_ingestion.sql`
- Create: `supabase/tests/database/040_attachments_rls.test.sql`
- Create: `supabase/functions/attachment-create-upload/index.ts`
- Create: `supabase/functions/attachment-complete/index.ts`
- Create: `supabase/functions/attachment-download/index.ts`
- Create: `supabase/functions/ingestion-worker/index.ts`
- Create: `supabase/functions/_tests/ingestion-worker.test.ts`
- Create: `workers/document-parser/package.json`
- Create: `workers/document-parser/Dockerfile`
- Create: `workers/document-parser/src/server.ts`
- Create: `workers/document-parser/src/validateRequest.ts`
- Create: `workers/document-parser/tests/parser-security.test.ts`
- Create: `apps/knowledge/src/features/attachments/AttachmentUploader.tsx`
- Create: `apps/knowledge/src/features/attachments/IngestionStatus.tsx`
- Create: `apps/knowledge/e2e/mobile-inbox.spec.ts`

**Interfaces:**
- Upload request includes document ID, normalized filename, declared MIME, size, and SHA-256.
- `ingestion_jobs` uses idempotency key, lease owner/expiry, attempts, max attempts, next run, state, and safe error code.
- Parser receives one signed input URL, expected checksum/type/size, callback URL, and HMAC signature; no database/storage admin key.

- [ ] **Step 1: Write MIME, magic-byte, lease, retry, and URL tests**

```ts
test('parser rejects private and non-storage URLs', () => {
  for (const url of ['http://127.0.0.1/a.pdf', 'https://169.254.169.254/a', 'file:///a.pdf', 'https://evil.test/a.pdf']) {
    expect(() => validateParserRequest({ inputUrl: url, mime: 'application/pdf' })).toThrow();
  }
});
```

The pgTAP test proves an expired lease can be reclaimed, an active lease cannot, duplicate idempotency keys do not create duplicate jobs, and a dead-letter job is not automatically retried.

- [ ] **Step 2: Create quarantine/private buckets and signed-only policies**

Create `knowledge-quarantine` and `knowledge-private` as private buckets. Browser users receive only short-lived, object-specific upload/download signatures after document permission checks; direct bucket listing and arbitrary object reads are denied.

- [ ] **Step 3: Implement safe upload completion and queueing**

After upload, verify object existence/size/checksum, inspect extension/MIME/magic bytes, and enqueue through pgmq. Markdown/TXT processing has strict byte limits. All PDFs—even text PDFs—go to the isolated parser. Failures keep a safe state/error code and allow authorized manual retry.

- [ ] **Step 4: Implement the isolated parser contract**

The container runs as non-root, has read-only filesystem except a bounded temp directory, size/time/memory limits, and deployment-level outbound network restricted to exact signed storage/callback origins. It extracts text only, strips active content, checks page/text limits, posts a checksum-bound result, and removes temp files on every path.

- [ ] **Step 5: Implement mobile inbox and status UI**

`/app/inbox` supports text, URL, Markdown/TXT, and PDF capture at 360px. It displays queued, processing, success, partial, failed, and dead-letter states with safe retry. The UI never claims a file is searchable until its version/chunks transaction completes.

- [ ] **Step 6: Run and commit**

Run: `supabase test db && pnpm --dir workers/document-parser test && deno test supabase/functions/_tests/ingestion-worker.test.ts && pnpm exec playwright test apps/knowledge/e2e/mobile-inbox.spec.ts`

Expected: malicious files/URLs fail, jobs are idempotent, and mobile capture works without exposing Storage keys.

```bash
git add supabase/migrations/202608300104_attachments_ingestion.sql supabase/tests/database/040_attachments_rls.test.sql supabase/functions/attachment-* supabase/functions/ingestion-worker supabase/functions/_tests/ingestion-worker.test.ts workers/document-parser apps/knowledge/src/features/attachments apps/knowledge/e2e/mobile-inbox.spec.ts
git commit -m "feat: add secure knowledge ingestion"
```

### Task 6: Add authorized search, topics, graph, comments, and mobile workbench

**Files:**
- Create: `supabase/migrations/202608300105_graph_collaboration.sql`
- Create: `supabase/migrations/202608300107_search_vectors.sql`
- Create: `supabase/tests/database/050_comments_links_rls.test.sql`
- Create: `supabase/tests/database/070_search_rag_rls.test.sql`
- Create: `apps/knowledge/src/features/search/api.ts`
- Create: `apps/knowledge/src/routes/SearchPage.tsx`
- Create: `apps/knowledge/src/features/graph/KnowledgeGraph.tsx`
- Create: `apps/knowledge/src/routes/GraphPage.tsx`
- Create: `apps/knowledge/src/features/comments/DocumentComments.tsx`
- Create: `apps/knowledge/src/layouts/AppShell.tsx`
- Create: `apps/knowledge/src/routes/InboxPage.tsx`
- Modify: `apps/knowledge/src/router.tsx`

**Interfaces:**
- `api.search_documents(workspace_id, query, kinds, limit)` is `SECURITY INVOKER` and returns only current authorized versions.
- Graph nodes contain authorized document IDs/titles only; hidden neighbors do not appear as anonymous counts.
- Comments inherit document read permission; writing requires active membership.

- [ ] **Step 1: Write cross-workspace and admin-private search tests**

```sql
select is_empty($$ select * from api.search_documents(:'workspace_a', 'SENTINEL_B', null, 20) $$, 'workspace A never finds B sentinel');
select is_empty($$ select * from api.search_documents(:'workspace_a', 'PRIVATE_AUTHOR_ONLY', null, 20) $$, 'admin without ACL cannot search private body');
select is_empty($$ select * from app.links where target_document_id = :'hidden_private' $$, 'graph does not reveal hidden neighbor');
```

- [ ] **Step 2: Implement permission-first full-text search**

Create normalized `tsvector` and trigram indexes on current chunks/metadata. The invoker RPC first applies `private.can_read_document`, current-version, not-deleted, active-membership filters, then ranks. It cannot take `user_id` or bypass role/ACL with a workspace parameter.

- [ ] **Step 3: Implement topics, backlinks, and comments under the same authorization**

Links require write permission to the source and read permission to the target. Backlinks filter both sides. Comments sanitize Markdown and cannot reveal the existence of an inaccessible document through count/error differences.

- [ ] **Step 4: Build responsive workbench routes**

AppShell provides workspaces, recent authorized docs, search, inbox, graph, and admin links. At 360px graph switches to an accessible list, editor remains usable, and no layout requires horizontal scrolling.

- [ ] **Step 5: Run and commit**

Run: `supabase test db && pnpm --filter @suntburst/knowledge test && pnpm --filter @suntburst/knowledge build`

Expected: sentinels and hidden nodes never leak; search/comment/graph UI uses only authorized responses.

```bash
git add supabase/migrations/202608300105_graph_collaboration.sql supabase/migrations/202608300107_search_vectors.sql supabase/tests/database/050_comments_links_rls.test.sql supabase/tests/database/070_search_rag_rls.test.sql apps/knowledge/src/features/search apps/knowledge/src/features/graph apps/knowledge/src/features/comments apps/knowledge/src/layouts apps/knowledge/src/routes apps/knowledge/src/router.tsx
git commit -m "feat: add authorized knowledge discovery"
```

### Task 7: Implement reviewed publication candidates and independent public snapshots

**Files:**
- Create: `supabase/migrations/202608300106_publication_pipeline.sql`
- Create: `supabase/tests/database/060_publication_rls.test.sql`
- Modify: `packages/content-contracts/src/publication.ts`
- Create: `supabase/functions/publication-submit/index.ts`
- Create: `supabase/functions/publication-review/index.ts`
- Create: `supabase/functions/publication-withdraw/index.ts`
- Create: `supabase/functions/publication-export/index.ts`
- Create: `supabase/functions/portal-sync/index.ts`
- Create: `supabase/functions/portal-deployment-report/index.ts`
- Create: `supabase/functions/_tests/publication-review.test.ts`
- Create: `supabase/functions/_tests/publication-export.test.ts`
- Create: `apps/knowledge/src/features/publication/PublishDialog.tsx`
- Create: `apps/knowledge/src/features/publication/ReviewQueue.tsx`
- Create: `apps/knowledge/e2e/publication.spec.ts`

**Interfaces:**
- Status: submitted → scanning → ready_for_review → approved → indexing → awaiting_portal_sync → published.
- Withdrawal: published → withdrawal_pending → awaiting_portal_sync → withdrawn.
- Export contract exposes no workspace/source/version/ACL/member/private attachment fields.

- [ ] **Step 1: Write tests that an admin reviews only the candidate copy**

```sql
select is_empty($$ select content_markdown from app.document_versions where document_id = :'private_without_acl' $$, 'reviewer still cannot read private source');
select results_eq($$ select content_markdown from app.publication_candidates where request_id = :'submitted_request' $$, array['author submitted copy'], 'reviewer can read submitted candidate');
```

Test that later private edits do not change candidate or published snapshot, and withdrawal immediately removes public retrieval results.

- [ ] **Step 2: Implement immutable candidate submission**

The author selects an authorized immutable version and explicitly supplies public title/slug/description/license/attachments. In one transaction copy sanitized candidate content/assets, record checksum and request revision, enqueue scan, and audit. Do not grant the reviewer source-document body permission.

- [ ] **Step 3: Implement review and public snapshot transaction**

Approval checks expected revision and scan status, creates `published_documents`/`published_assets`, enqueues `published_chunks`, increments `publication_manifests`, and inserts `portal_sync_outbox`. Reject returns a reason to the author. All operations are idempotent.

- [ ] **Step 4: Implement checksum-only public export**

```ts
export interface PublicKnowledgeManifest {
  schemaVersion: 1;
  manifestVersion: string;
  generatedAt: string;
  checksum: string;
  documents: Array<{ slug: string; title: string; description: string; publishedAt: string; updatedAt: string; license: string; topics: string[]; checksum: string; documentUrl: string }>;
}
```

`publication-export` serves only active snapshots and separately authorized public assets. It never returns source document/version IDs, workspace ID, Storage key, reviewer, email, ACL, internal comment, conversation, or audit record.

- [ ] **Step 5: Implement withdrawal and synchronization truthfulness**

Withdrawal marks the public snapshot inactive and removes public chunks/assets from public APIs before portal rebuild. UI says “撤回等待同步” until a matching deployment report arrives. It also warns that external/browser archives cannot be guaranteed deleted.

- [ ] **Step 6: Run and commit**

Run: `supabase test db && deno test supabase/functions/_tests/publication-review.test.ts supabase/functions/_tests/publication-export.test.ts && pnpm exec playwright test apps/knowledge/e2e/publication.spec.ts`

Expected: reviewer privacy, snapshot immutability, export redaction, withdrawal, and concurrent review tests PASS.

```bash
git add supabase/migrations/202608300106_publication_pipeline.sql supabase/tests/database/060_publication_rls.test.sql packages/content-contracts/src/publication.ts supabase/functions/publication-* supabase/functions/portal-sync supabase/functions/portal-deployment-report supabase/functions/_tests/publication-* apps/knowledge/src/features/publication apps/knowledge/e2e/publication.spec.ts
git commit -m "feat: add reviewed public knowledge snapshots"
```

### Task 8: Synchronize published knowledge into GitHub Pages and reconcile withdrawals

**Files:**
- Create: `scripts/sync-public-knowledge.mjs`
- Modify: `.gitignore`
- Modify: `src/content.config.ts`
- Modify: `src/utils/portalCollections.ts`
- Modify: `src/utils/portalIndex.ts`
- Modify: `src/pages/knowledge/[slug].astro`
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `.github/workflows/reconcile-publication.yml`
- Create: `tests/public-knowledge-sync.test.mjs`
- Create: `tests/public-knowledge-leak.test.mjs`
- Create: `docs/operations/publication-reconciliation.md`

**Interfaces:**
- Sync input is `PublicKnowledgeManifest`; generated Markdown lives only in ignored `src/content/knowledge-generated/` during build.
- `repository_dispatch` type is `knowledge-published`, payload only `{ manifestVersion, checksum }`.
- Deployment report contains manifest version, checksum, Pages run/deployment ID, status, and timestamp; no content.

- [ ] **Step 1: Write malicious manifest and withdrawal tests**

```js
for (const fixture of ['bad-checksum.json', 'path-traversal.json', 'private-field.json', 'wrong-origin.json']) {
  assert.notEqual(runSync(fixture).status, 0);
}
assert.equal(runSync('withdrawn-manifest.json').generatedSlugs.includes('withdrawn-note'), false);
```

- [ ] **Step 2: Implement fail-closed manifest sync**

Fetch with a read-only export token, maximum response size, timeout, exact HTTPS origin, schema version, monotonically non-decreasing manifest version, whole/per-document SHA-256, normalized slugs, and public URL allowlist. Reject unknown/private fields. Write to a temporary directory and atomically replace only the ignored generated collection after every document passes.

- [ ] **Step 3: Merge generated public snapshots into the portal**

Extend the knowledge collection schema with explicit `source: 'local'|'published-snapshot'`, `visibility: 'public'`, `version`, and license. `portalIndex`, RSS, sitemap, search, and `llms*.txt` consume the same collection filter. A missing/invalid sync must not fall back to a withdrawn cached document in production.

- [ ] **Step 4: Add dispatch, sync, deploy, report, and reconciliation order**

Pages workflow accepts push/manual/`repository_dispatch`, runs sync before build, scans all public outputs, deploys, then reports success. Withdrawal stays pending until success. Scheduled reconciliation compares database manifest/checksum with the deployed report and re-dispatches missing/failed events with bounded retries.

- [ ] **Step 5: Run leak and rebuild tests**

Run: `node --test tests/public-knowledge-sync.test.mjs tests/public-knowledge-leak.test.mjs && pnpm build:portal`

Expected: bad manifests fail closed, withdrawn fixtures disappear from HTML/RSS/sitemap/search/LLM indexes, and no private identifier appears.

- [ ] **Step 6: Commit public synchronization**

```bash
git add scripts/sync-public-knowledge.mjs .gitignore src/content.config.ts src/utils/portalCollections.ts src/utils/portalIndex.ts src/pages/knowledge/[slug].astro .github/workflows/deploy-pages.yml .github/workflows/reconcile-publication.yml tests/public-knowledge-sync.test.mjs tests/public-knowledge-leak.test.mjs docs/operations/publication-reconciliation.md
git commit -m "feat: synchronize reviewed public knowledge"
```

### Task 9: Add versioned embeddings and permission-first hybrid retrieval

**Files:**
- Modify: `supabase/migrations/202608300107_search_vectors.sql`
- Modify: `supabase/functions/embedding-worker/index.ts`
- Modify: `supabase/functions/_shared/embeddings.ts`
- Create: `supabase/functions/_tests/embedding-worker.test.ts`
- Modify: `supabase/tests/database/070_search_rag_rls.test.sql`
- Create: `docs/operations/embedding-index-migration.md`

**Interfaces:**
- Initial embedding column is `vector(1536)`; every row records `embedding_model`, `embedding_dimensions=1536`, and `index_version`.
- RPCs: `api.match_workspace_chunks(workspace_id, query_embedding, match_count)` and `api.match_published_chunks(query_embedding, match_count)`.
- Workspace RPC is user-JWT invoker and has no user ID argument.

- [ ] **Step 1: Write dimension, current-version, deleted, revoked, and cross-workspace tests**

```sql
select throws_ok($$ select api.match_workspace_chunks(:'workspace_a', array_fill(0::float, array[10])::vector, 10) $$, null, null, 'wrong dimensions fail');
select is_empty($$ select * from api.match_workspace_chunks(:'workspace_a', :'sentinel_b_embedding', 10) $$, 'A never retrieves B');
select is_empty($$ select * from api.match_workspace_chunks(:'workspace_a', :'deleted_embedding', 10) $$, 'deleted and old versions excluded');
```

- [ ] **Step 2: Implement index-versioned embedding jobs**

The worker leases pgmq jobs, validates chunk checksum/model/dimensions, calls the configured embedding provider with no ordinary content logging, and writes only when document version/checksum still matches. Provider retries are bounded and dead-lettered.

- [ ] **Step 3: Implement permission filtering inside retrieval**

The workspace RPC filters active membership, workspace, current version, not deleted, and `private.can_read_document` before ranking. If elevated access is required for the vector column, use a fixed-search-path private function that rechecks `auth.uid()` internally; never query all chunks with service role and filter in the Edge Function.

- [ ] **Step 4: Define model migration instead of in-place mixing**

A new dimensions/model requires a new index version/table or compatible parallel column, background re-embedding, validation, atomic activation, and old-version rollback window. Reject startup when `AI_EMBEDDING_DIMENSIONS !== 1536` for the initial index.

- [ ] **Step 5: Run and commit**

Run: `supabase test db && deno test supabase/functions/_tests/embedding-worker.test.ts`

Expected: dimension mismatch and every authorization negative case fail closed.

```bash
git add supabase/migrations/202608300107_search_vectors.sql supabase/functions/embedding-worker supabase/functions/_shared/embeddings.ts supabase/functions/_tests/embedding-worker.test.ts supabase/tests/database/070_search_rag_rls.test.sql docs/operations/embedding-index-migration.md
git commit -m "feat: add permission-first vector retrieval"
```

### Task 10: Implement private workspace RAG, citations, quotas, and AI UI

**Files:**
- Create: `supabase/migrations/202608300108_ai_audit_quotas.sql`
- Create: `supabase/tests/database/080_ai_conversations_rls.test.sql`
- Create: `supabase/functions/knowledge-ai/index.ts`
- Modify: `supabase/functions/_shared/aiProvider.ts`
- Modify: `supabase/functions/_shared/citations.ts`
- Create: `supabase/functions/_shared/streaming.ts`
- Create: `supabase/functions/_shared/redaction.ts`
- Create: `supabase/functions/_tests/workspace-ai.test.ts`
- Create: `supabase/functions/_tests/public-private-isolation.test.ts`
- Modify: `packages/content-contracts/src/ai.ts`
- Create: `apps/knowledge/src/features/ai/api.ts`
- Create: `apps/knowledge/src/features/ai/AiPanel.tsx`
- Create: `apps/knowledge/e2e/rag-permissions.spec.ts`

**Interfaces:**
- Request: `{ workspaceId, question, conversationId? }`; there is no scope/user/role/table field.
- SSE: `meta`, `delta`, `citations`, `done`, `error`.
- Citation contains authorized document/version/title plus heading/chunk ordinal and app-local href.
- `workspace_ai_settings` stores enabled provider/model, policy-confirmed timestamp/actor, conversation retention mode, and budget; API keys remain server secrets and never enter this table.

- [ ] **Step 1: Write public/private, admin-private, injection, revocation, and citation tests**

```ts
Deno.test('knowledge-ai never imports or uses an admin client for retrieval', async () => {
  const source = await Deno.readTextFile('supabase/functions/knowledge-ai/index.ts');
  assertFalse(/createAdminClient|service_role/i.test(source));
});

Deno.test('revoked member with an unexpired JWT receives no chunks or cache', async () => {
  const response = await askWithJwt(revokedJwt, 'UNIQUE_SENTINEL');
  assertEquals(response.status, 403);
  assertFalse((await response.text()).includes('UNIQUE_SENTINEL'));
});
```

The database test also proves editor/viewer cannot enable a provider or change retention/budget, admin/owner can only choose a server-configured provider ID, and private AI refuses a workspace without a current policy confirmation.

- [ ] **Step 2: Implement the exact private AI sequence**

Create RLS and management RPC for `workspace_ai_settings`; admin/owner must explicitly confirm the selected provider's retention/training/region notice before enabling it. Then verify JWT with `auth.getUser`; check active membership and the current workspace setting; atomically consume quota; embed question; call `api.match_workspace_chunks` using a Supabase client carrying the original user JWT; recheck returned chunk permissions/current versions; assign citation IDs; send minimal context to the model; construct citation hrefs server-side; stream; audit only actor/workspace/model/token/latency/result/citation IDs.

- [ ] **Step 3: Disable unsafe caching and logs**

Private answer cache is absent initially. If enabled in a separate reviewed change, its key must include user, workspace, membership/ACL revision, document version set, model/index version and invalidate on every permission/content change. Questions, chunks, answers, provider bodies, and private URLs never enter ordinary logs/error tracking/Umami.

- [ ] **Step 4: Enforce evidence and prompt-injection behavior**

Knowledge chunks are delimited untrusted data and cannot alter system/tool/permission instructions. The model may cite only assigned IDs. With insufficient evidence return `evidenceSufficient: false` and Chinese copy `知识库中没有足够依据`; no general model knowledge is presented as a repository answer.

- [ ] **Step 5: Implement the responsive AI panel**

Show current workspace, provider/privacy notice, quota state, streamed text, evidence status, citations, and clear/delete conversation. Before opening a citation, request current authorization again. At 360px the panel becomes a full-height sheet and never covers save/conflict controls.

- [ ] **Step 6: Run sentinel and mobile tests**

Run: `supabase test db && deno test supabase/functions/_tests/workspace-ai.test.ts supabase/functions/_tests/public-private-isolation.test.ts && pnpm exec playwright test apps/knowledge/e2e/rag-permissions.spec.ts`

Expected: workspace A/B unique sentinels never cross, admin cannot retrieve private author text, revoked access invalidates immediately, and citations are server-authorized.

- [ ] **Step 7: Commit private RAG**

```bash
git add supabase/migrations/202608300108_ai_audit_quotas.sql supabase/tests/database/080_ai_conversations_rls.test.sql supabase/functions/knowledge-ai supabase/functions/_shared/aiProvider.ts supabase/functions/_shared/citations.ts supabase/functions/_shared/streaming.ts supabase/functions/_shared/redaction.ts supabase/functions/_tests/workspace-ai.test.ts supabase/functions/_tests/public-private-isolation.test.ts packages/content-contracts/src/ai.ts apps/knowledge/src/features/ai apps/knowledge/e2e/rag-permissions.spec.ts
git commit -m "feat: add cited private knowledge AI"
```

### Task 11: Add audit, retention, deletion/export, backup, and restore operations

**Files:**
- Create: `supabase/migrations/202608300109_schedules_retention.sql`
- Create: `supabase/tests/database/100_audit_immutability.test.sql`
- Create: `supabase/functions/account-export/index.ts`
- Create: `supabase/functions/account-delete/index.ts`
- Create: `supabase/functions/workspace-transfer/index.ts`
- Create: `supabase/functions/retention-worker/index.ts`
- Create: `scripts/backup-knowledge-database.ps1`
- Create: `scripts/backup-knowledge-storage.ps1`
- Create: `scripts/restore-knowledge-drill.ps1`
- Create: `docs/operations/knowledge-backup-restore.md`
- Create: `docs/operations/membership-and-revocation.md`
- Create: `docs/operations/data-export-delete.md`
- Create: `tests/backup-scripts-safety.test.mjs`

**Interfaces:**
- Soft-deleted documents leave search/AI immediately, remain restorable 30 days, then purge body/assets/chunks/cache idempotently.
- Audit retains at least one year and is append-only to users; it contains no private body/question/answer.
- Database and object backups are separate, encrypted, retained 30 days, and restored into a non-production target for drills.

- [ ] **Step 1: Write audit mutation, purge, and script target-safety tests**

```sql
select throws_ok($$ update app.audit_events set action = 'changed' $$, '42501', null, 'audit cannot be edited');
select throws_ok($$ delete from app.audit_events $$, '42501', null, 'audit cannot be user-deleted');
```

The Node safety test rejects scripts containing recursive deletion of `$HOME`, `~`, a drive root, unresolved wildcard targets, or production restore without an explicit non-production project reference.

- [ ] **Step 2: Implement scheduled retention and revocation**

pg_cron invokes worker functions with dedicated Vault tokens for expired sessions/invites, soft-delete purge, dead-letter review, obsolete vectors, withdrawn assets, expired conversations, and sync reconciliation. Each job has a bounded batch, lease, idempotency key, audit summary, and retry limit.

- [ ] **Step 3: Implement permission-aware export/delete and ownership transfer**

Exports contain only documents the requester may read and clearly label shared material. Account deletion requires transfer/deletion of owned workspaces, revokes sessions/memberships immediately, anonymizes retained audit actor where legally appropriate, and documents backup expiry. Owner transfer requires target active owner-eligible membership, recent login, expected revision, and audit.

- [ ] **Step 4: Implement separate, safe backup commands**

PowerShell scripts require explicit project/ref/output parameters, reject broad/unresolved paths, create timestamped directories, export schema/data and each private bucket, encrypt, checksum, and write a manifest. Restore targets a named non-production project, restores DB and Storage, then runs all RLS tests and object checksums.

- [ ] **Step 5: Run a local restore drill**

Run: `node --test tests/backup-scripts-safety.test.mjs && powershell -File scripts/backup-knowledge-database.ps1 -ProjectRef local -OutputRoot .artifacts/backup-test && powershell -File scripts/backup-knowledge-storage.ps1 -ProjectRef local -OutputRoot .artifacts/backup-test && powershell -File scripts/restore-knowledge-drill.ps1 -SourceRoot .artifacts/backup-test -TargetProjectRef local-restore`

Expected: checksums match, RLS suite passes on restored data, and the drill report records achieved RPO/RTO evidence.

- [ ] **Step 6: Commit operations and retention**

```bash
git add supabase/migrations/202608300109_schedules_retention.sql supabase/tests/database/100_audit_immutability.test.sql supabase/functions/account-export supabase/functions/account-delete supabase/functions/workspace-transfer supabase/functions/retention-worker scripts/backup-knowledge-database.ps1 scripts/backup-knowledge-storage.ps1 scripts/restore-knowledge-drill.ps1 docs/operations tests/backup-scripts-safety.test.mjs
git commit -m "feat: add knowledge data lifecycle operations"
```

### Task 12: Complete production security, mobile, deployment, and recovery acceptance

**Files:**
- Create: `.github/workflows/knowledge-ci.yml`
- Create: `.github/workflows/deploy-knowledge.yml`
- Modify: `.github/workflows/deploy-supabase.yml`
- Create: `apps/knowledge/playwright.config.ts`
- Create: `apps/knowledge/e2e/production-oauth.spec.ts`
- Create: `apps/knowledge/e2e/security-boundaries.spec.ts`
- Create: `tests/private-artifact-leak.test.mjs`
- Create: `tests/knowledge-csp.test.mjs`
- Create: `docs/operations/knowledge-local-development.md`
- Create: `docs/operations/github-oauth-setup.md`
- Create: `docs/operations/cloudflare-pages-deployment.md`
- Create: `docs/operations/supabase-production-deployment.md`
- Create: `docs/operations/knowledge-incident-runbook.md`
- Modify: `README.md`

**Interfaces:**
- Knowledge CI: lint/unit/build → local Supabase reset/lint/pgTAP → Edge tests → Chromium/WebKit/mobile E2E → CSP/artifact leak scan.
- Production deploys require protected environment approval and exact origin/callback/project references.

- [ ] **Step 1: Write private sentinel and CSP artifact tests**

```js
for (const root of ['dist', 'apps/knowledge/dist']) {
  const text = readAllText(root);
  for (const sentinel of ['WORKSPACE_A_SECRET', 'WORKSPACE_B_SECRET', 'PRIVATE_AUTHOR_ONLY']) assert.doesNotMatch(text, new RegExp(sentinel));
  assert.doesNotMatch(text, /service_role|github_pat_|AI_API_KEY|private attachment/i);
}
assert.doesNotMatch(knowledgeHeaders, /waline|umami|weather|music|\*\.upxuu/i);
```

- [ ] **Step 2: Configure the full CI and protected deploy flow**

CI starts local Supabase and parser mock; deployment runs only after CI and manual approval. Supabase migrations/functions deploy before the knowledge SPA that depends on them. Cloudflare Pages receives only public Supabase URL/publishable key and portal URL. Secrets remain in Supabase/protected workflow environments.

- [ ] **Step 3: Test real OAuth and immediate revocation**

In production preview, verify GitHub is the only provider, PKCE/state/fixed callback, arbitrary redirect rejection, GitHub rename continuity, no provider token storage, pending confidentiality, and an unexpired JWT losing access immediately after membership disable.

- [ ] **Step 4: Complete desktop and mobile end-to-end paths**

On Chromium and WebKit at 360px/390px/desktop: GitHub callback, workspace choice, text edit/save/conflict, file upload/status, search, graph list, comments, publication review, withdrawal, AI question/citation, logout. Assert ≥44px primary touch targets and no horizontal overflow.

- [ ] **Step 5: Run cross-origin and leak acceptance**

The knowledge origin must never request portal comments/analytics/weather/music; portal scripts cannot read the knowledge session. Place unique sentinels in two workspaces and verify search, API, graph, attachments, versions, export, AI, cache, logs, public snapshot, portal build, RSS, sitemap, search, source maps, and `llms*.txt` never cross or leak.

- [ ] **Step 6: Run publication/recovery failure drills**

Simulate GitHub dispatch failure, Pages build failure, AI provider outage, parser timeout, revoked membership, stale status, and withdrawn content. Verify outbox reconciliation, honest pending state, ordinary search fallback, no half-published snapshot, and successful database+Storage restore followed by RLS regression.

- [ ] **Step 7: Run the final platform gate**

Run: `pnpm lint && pnpm test && pnpm build:all && supabase db reset && supabase db lint && supabase test db && deno test supabase/functions/_tests && pnpm exec playwright test && node --test tests/private-artifact-leak.test.mjs tests/knowledge-csp.test.mjs && git diff --check`

Expected: every check passes, documented RPO/RTO is achieved, all required production credentials are present, and no `preview` feature is reported as complete.

- [ ] **Step 8: Commit, deploy, and verify both origins**

```bash
git add .github/workflows apps/knowledge/playwright.config.ts apps/knowledge/e2e tests/private-artifact-leak.test.mjs tests/knowledge-csp.test.mjs docs/operations README.md
git commit -m "chore: complete knowledge platform release gate"
git push origin main
```

Expected: protected Supabase/Cloudflare/GitHub Pages deployments succeed; portal and knowledge origins remain isolated; real GitHub login, publishing, withdrawal, and cited private/public AI pass live smoke tests.
