# Comprehensive Personal Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing static Astro blog into an engaging SunTBurst personal portal that remains useful with zero posts and establishes safe preview surfaces for every later external module.

**Architecture:** Keep the existing Astro 6 static site at the repository root and extend it with typed local portal data, three additional public content collections, focused Astro/Svelte components, and build-time search/exploration indexes. Core navigation and content remain network-independent; browser-local favorites, history, theme, and intent prefetch do not send data to third parties.

**Tech Stack:** Astro 6.4, Svelte 5.56, React 19, Tailwind CSS 4.1, TypeScript 5.8, Node.js 22.12+, pnpm 9.15.4, Node test runner with `tsx`, Playwright Chromium/WebKit.

**Spec:** `docs/superpowers/specs/2026-08-30-comprehensive-personal-portal-design.md`

## Global Constraints

- Preserve the current Toy Brick Brutalism visual language and the working GitHub Pages static deployment.
- Use `SunTBurst` for the public identity; do not introduce unconfirmed biography, employment, project, count, traffic, online, or activity claims.
- Never copy upstream posts, talks, images, accounts, endpoints, IDs, workflows, statistics, or private services.
- Keep `*.upxuu.com`, upstream IP addresses, upstream account IDs, and unknown runtime URLs permanently forbidden.
- Private knowledge, credentials, provider tokens, and service-role keys must never enter this repository, `dist/`, RSS, sitemap, search, or `llms*.txt`.
- Core routes must build and navigate with every external feature disabled; a failed optional module must never block the page body.
- Respect `prefers-reduced-motion`, keyboard navigation, a minimum 44px primary touch target, and 360px/390px layouts without horizontal overflow.
- Production `enabled` features with missing configuration must fail validation; only local development may explicitly downgrade them to `preview`.
- Run `pnpm lint`, `pnpm test`, `pnpm build`, and the relevant Playwright checks before each release commit.

---

### Task 1: Add typed portal contracts and a lightweight TypeScript test runner

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/types/portal.ts`
- Create: `src/config/portal.ts`
- Create: `src/utils/portalConfig.ts`
- Create: `tests/unit/portal-config.test.ts`

**Interfaces:**
- Produces: `PortalLink`, `PortalProject`, `KnowledgeTopic`, `PortalUpdate`, `FeatureImplementationStatus`, `FeatureRuntimeState`.
- Produces: `portalProfile`, `startHereLinks`, `currentFocus`, `knowledgeTopics`, `portalProjects`.
- Produces: `validatePortalConfig(config: PortalConfig): string[]`.

- [ ] **Step 1: Add the failing contract test**

```ts
// tests/unit/portal-config.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { portalConfig } from '../../src/config/portal';
import { validatePortalConfig } from '../../src/utils/portalConfig';

test('portal config has three distinct two-level exploration paths', () => {
  assert.deepEqual(validatePortalConfig(portalConfig), []);
  assert.ok(portalConfig.startHere.length >= 3);
  assert.equal(new Set(portalConfig.startHere.map((item) => item.href)).size, portalConfig.startHere.length);
  assert.ok(portalConfig.startHere.every((item) => item.href.startsWith('/') && item.nextHref.startsWith('/')));
});

test('portal config never uses invented numeric claims', () => {
  const serialized = JSON.stringify(portalConfig);
  assert.doesNotMatch(serialized, /(?:访问|在线|用户|文章)[^\n]{0,12}\d+/);
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `pnpm exec tsx --test tests/unit/portal-config.test.ts`

Expected: FAIL because `src/config/portal.ts` and `src/utils/portalConfig.ts` do not exist.

- [ ] **Step 3: Add `tsx` and the package scripts**

```json
{
  "scripts": {
    "test:unit": "tsx --test tests/unit/*.test.ts",
    "test:node": "node --test --test-concurrency=1 tests/*.test.mjs",
    "test": "pnpm test:unit && pnpm test:node"
  },
  "devDependencies": {
    "tsx": "^4.20.5"
  }
}
```

Run: `pnpm add -D tsx@^4.20.5`

Expected: `package.json` and `pnpm-lock.yaml` update without changing the pinned pnpm version.

- [ ] **Step 4: Implement the contracts and honest initial configuration**

```ts
// src/types/portal.ts
export type FeatureImplementationStatus = 'planned' | 'implemented' | 'verified';
export type FeatureRuntimeState = 'disabled' | 'preview' | 'enabled';
export type PortalKind = 'page' | 'post' | 'talk' | 'knowledge' | 'project' | 'update';

export interface PortalLink {
  title: string;
  description: string;
  href: `/${string}`;
  nextHref: `/${string}`;
  accent: 'blue' | 'amber' | 'emerald' | 'violet';
}

export interface KnowledgeTopic {
  slug: string;
  title: string;
  description: string;
  status: 'mapping' | 'growing' | 'established';
}

export interface PortalProject {
  slug: string;
  title: string;
  summary: string;
  status: 'building' | 'maintaining' | 'archived';
  href: `/${string}`;
  updated: string;
}

export interface PortalConfig {
  identity: { name: string; tagline: string; timeZone: string };
  startHere: PortalLink[];
  focus: string[];
  topics: KnowledgeTopic[];
  projects: PortalProject[];
}
```

```ts
// src/config/portal.ts
import type { PortalConfig } from '../types/portal';

export const portalConfig: PortalConfig = {
  identity: {
    name: 'SunTBurst',
    tagline: '把学习、实践与知识连接成一张长期生长的地图',
    timeZone: 'Asia/Riyadh',
  },
  startHere: [
    { title: '认识这个空间', description: '先了解这里为什么存在。', href: '/start', nextHref: '/about', accent: 'blue' },
    { title: '沿着知识地图走', description: '按主题而不是发布时间探索。', href: '/knowledge', nextHref: '/topics/site-building', accent: 'emerald' },
    { title: '看看正在建设什么', description: '查看真实项目和更新记录。', href: '/projects', nextHref: '/changelog', accent: 'amber' },
  ],
  focus: ['建设可长期维护的个人门户', '连接公开博客与隔离的私有知识平台'],
  topics: [
    { slug: 'site-building', title: '站点建设', description: '设计、开发、发布与运行记录。', status: 'growing' },
    { slug: 'knowledge-management', title: '知识管理', description: '收集、整理、连接与公开发布的方法。', status: 'mapping' },
    { slug: 'ai-knowledge', title: 'AI 与知识库', description: '带权限和引用的检索增强问答。', status: 'mapping' },
  ],
  projects: [
    { slug: 'suntburst-portal', title: 'SunTBurst 个人门户', summary: '把静态博客建设成公开门户和知识入口。', status: 'building', href: '/projects#suntburst-portal', updated: '2026-08-30' },
  ],
};
```

```ts
// src/utils/portalConfig.ts
import type { PortalConfig } from '../types/portal';

export function validatePortalConfig(config: PortalConfig): string[] {
  const errors: string[] = [];
  if (config.identity.name !== 'SunTBurst') errors.push('identity.name must be SunTBurst');
  if (config.startHere.length < 3) errors.push('at least three start paths are required');
  const hrefs = config.startHere.map(({ href }) => href);
  if (new Set(hrefs).size !== hrefs.length) errors.push('start paths must be unique');
  for (const link of config.startHere) {
    if (!link.href.startsWith('/') || !link.nextHref.startsWith('/')) errors.push(`invalid local path: ${link.title}`);
    if (link.href === link.nextHref) errors.push(`path must continue to a second page: ${link.title}`);
  }
  return errors;
}
```

- [ ] **Step 5: Run the focused and full tests**

Run: `pnpm test:unit && pnpm lint`

Expected: PASS with two unit tests and zero TypeScript errors.

- [ ] **Step 6: Commit the contracts**

```bash
git add package.json pnpm-lock.yaml src/types/portal.ts src/config/portal.ts src/utils/portalConfig.ts tests/unit/portal-config.test.ts
git commit -m "feat: define personal portal contracts"
```

### Task 2: Add public knowledge, project, and update collections with real seed entries

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/utils/portalCollections.ts`
- Create: `src/content/knowledge/personal-portal-map.md`
- Create: `src/content/projects/suntburst-portal.md`
- Create: `src/content/updates/2026-08-30-blog-live.md`
- Create: `tests/unit/portal-collections.test.ts`

**Interfaces:**
- Consumes: `PortalKind` from Task 1.
- Produces: `getPublishedKnowledge()`, `getPublishedProjects()`, `getPublishedUpdates()`.
- Produces collection slugs `personal-portal-map` and `suntburst-portal`.

- [ ] **Step 1: Write source-level schema tests**

```ts
// tests/unit/portal-collections.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('portal collections have draft gates and explicit status fields', async () => {
  const source = await readFile(new URL('../../src/content.config.ts', import.meta.url), 'utf8');
  for (const name of ['knowledge', 'projects', 'updates']) assert.match(source, new RegExp(`${name}Collection`));
  assert.match(source, /draft:\s*z\.boolean\(\)\.default\(false\)/);
  assert.match(source, /status:/);
});
```

- [ ] **Step 2: Verify the test fails**

Run: `pnpm exec tsx --test tests/unit/portal-collections.test.ts`

Expected: FAIL because the three collection definitions are absent.

- [ ] **Step 3: Add strict collection schemas**

```ts
// append to src/content.config.ts
const knowledgeCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/knowledge' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    topics: z.array(z.string()).default([]),
    status: z.enum(['seed', 'growing', 'stable']).default('seed'),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const projectsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    started: z.coerce.date(),
    updated: z.coerce.date(),
    status: z.enum(['building', 'maintaining', 'archived']),
    tags: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const updatesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    published: z.coerce.date(),
    kind: z.enum(['site', 'knowledge', 'project', 'content']),
    href: z.string().startsWith('/'),
    status: z.enum(['completed', 'in-progress']),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  posts: postsCollection,
  talks: talksCollection,
  knowledge: knowledgeCollection,
  projects: projectsCollection,
  updates: updatesCollection,
};
```

- [ ] **Step 4: Add factual seed content**

```markdown
---
title: 个人门户建设地图
summary: 记录这个网站从静态博客走向公开门户与知识入口的真实路线。
published: 2026-08-30
updated: 2026-08-30
topics: [站点建设, 知识管理]
status: growing
draft: false
---

这里记录网站为什么这样设计、已经具备什么、下一步如何验证。它不是虚构案例，而是这个站点本身的建设知识。
```

```markdown
---
title: SunTBurst 个人门户
summary: 把已经上线的静态博客建设成可探索的个人门户，并为独立知识平台保留安全入口。
started: 2026-08-30
updated: 2026-08-30
status: building
tags: [站点建设, Astro, 知识管理]
links:
  - label: 访问网站
    href: https://suntburst.github.io/
draft: false
---

这个项目只记录已经完成和正在进行的站点工作。访问量、在线人数和未启用服务不会被写成成果。
```

```markdown
---
title: 个人博客已上线
summary: GitHub Pages 已完成首次部署，公开地址可以正常访问。
published: 2026-08-30
kind: site
href: /changelog
status: completed
draft: false
---

首次部署完成后，站点具备文章、说说、标签、分类、归档、RSS、sitemap、响应式布局和深浅色主题。
```

- [ ] **Step 5: Add the published collection helpers**

```ts
// src/utils/portalCollections.ts
import { getCollection } from 'astro:content';

export const getPublishedKnowledge = () => getCollection('knowledge', ({ data }) => !data.draft);
export const getPublishedProjects = () => getCollection('projects', ({ data }) => !data.draft);
export const getPublishedUpdates = () => getCollection('updates', ({ data }) => !data.draft);
```

- [ ] **Step 6: Run schema, draft, and build checks**

Run: `pnpm test:unit && pnpm test:content && pnpm test:drafts && pnpm build`

Expected: PASS; Astro reports the three new collections and emits no private content.

- [ ] **Step 7: Commit the public portal content model**

```bash
git add src/content.config.ts src/utils/portalCollections.ts src/content/knowledge src/content/projects src/content/updates tests/unit/portal-collections.test.ts
git commit -m "feat: add public portal content collections"
```

### Task 3: Build one public exploration and search index

**Files:**
- Create: `src/utils/portalIndex.ts`
- Create: `src/utils/portalIndexCore.ts`
- Create: `src/pages/portal-index.json.ts`
- Modify: `src/pages/posts-data.json.ts`
- Create: `tests/unit/portal-index.test.ts`
- Create: `tests/portal-index-build.test.mjs`

**Interfaces:**
- Consumes: processed posts/talks and the three collections from Task 2.
- Produces: `PortalIndexEntry { id, kind, title, description, href, updatedAt, topics }` in `src/types/portal.ts`.
- Produces: `buildPortalIndex(): Promise<PortalIndexEntry[]>` and `pickRandomEntry(entries, randomValue): PortalIndexEntry | null`.
- Produces: static `/portal-index.json`; no private or draft content.

- [ ] **Step 1: Write deterministic index tests**

```ts
// tests/unit/portal-index.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearchText, pickRandomEntry } from '../../src/utils/portalIndexCore';

const entries = [
  { id: 'a', kind: 'page', title: '开始', description: '入口', href: '/start', updatedAt: '2026-08-30', topics: [] },
  { id: 'b', kind: 'project', title: '门户', description: '建设', href: '/projects', updatedAt: '2026-08-30', topics: ['站点'] },
] as const;

test('random selection only returns real entries', () => {
  assert.equal(pickRandomEntry([...entries], 0)?.href, '/start');
  assert.equal(pickRandomEntry([...entries], 0.99)?.href, '/projects');
  assert.equal(pickRandomEntry([], 0.5), null);
});

test('search normalization is stable for Chinese and Latin text', () => {
  assert.equal(normalizeSearchText('  AI 与 Knowledge  '), 'ai 与 knowledge');
});
```

- [ ] **Step 2: Run and confirm the missing export failures**

Run: `pnpm exec tsx --test tests/unit/portal-index.test.ts`

Expected: FAIL because `portalIndexCore.ts` does not exist.

- [ ] **Step 3: Implement deterministic helpers and the index builder**

```ts
// src/utils/portalIndexCore.ts
import type { PortalIndexEntry } from '../types/portal';

export const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase('zh-CN');

export function pickRandomEntry(entries: PortalIndexEntry[], randomValue = Math.random()): PortalIndexEntry | null {
  if (entries.length === 0) return null;
  const safe = Math.min(Math.max(randomValue, 0), 0.999999999);
  return entries[Math.floor(safe * entries.length)] ?? null;
}

export function assertUniqueLocalEntries(entries: PortalIndexEntry[]): PortalIndexEntry[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.href.startsWith('/') || entry.href.startsWith('//')) throw new Error(`non-local portal href: ${entry.href}`);
    if (seen.has(entry.href)) throw new Error(`duplicate portal href: ${entry.href}`);
    seen.add(entry.href);
  }
  return entries;
}
```

Add this interface to `src/types/portal.ts`:

```ts
export interface PortalIndexEntry {
  id: string;
  kind: PortalKind;
  title: string;
  description: string;
  href: `/${string}`;
  updatedAt: string;
  topics: string[];
}
```

Implement the server-only builder without importing Astro content APIs into browser bundles:

```ts
// src/utils/portalIndex.ts
import { getPublishedPosts, getPublishedTalks } from './contentCollections';
import { getPublishedKnowledge, getPublishedProjects, getPublishedUpdates } from './portalCollections';
import { normalizeEntrySlug } from './slugify';
import { assertUniqueLocalEntries } from './portalIndexCore';
import type { PortalIndexEntry } from '../types/portal';

const staticPages: PortalIndexEntry[] = [
  ['start', '从这里开始', '认识网站并选择第一条探索路线', '/start'],
  ['about', '关于', '认识 SunTBurst 和这个空间', '/about'],
  ['knowledge', '知识地图', '按主题探索公开知识', '/knowledge'],
  ['projects', '项目台', '查看真实项目与建设状态', '/projects'],
  ['now', '现在', '查看当前关注和近期建设', '/now'],
  ['changelog', '更新记录', '查看站点的真实变化', '/changelog'],
  ['archive', '归档', '按时间浏览全部公开内容', '/archive'],
  ['calendar', '日历', '按日期回看公开更新', '/calendar'],
  ['timeline', '时间线', '沿时间查看站点内容', '/timeline'],
  ['explore', '随机探索', '从真实公开路由中随机发现', '/explore'],
  ['lab', '实验室', '查看可控的小工具和实验', '/lab'],
  ['friends', '友链', '发现其他值得访问的个人空间', '/friends'],
  ['privacy', '隐私', '了解本站的数据边界', '/privacy'],
].map(([id, title, description, href]) => ({
  id: `page:${id}`,
  kind: 'page' as const,
  title,
  description,
  href: href as `/${string}`,
  updatedAt: '2026-08-30T00:00:00+03:00',
  topics: [],
}));

const plain = (value: string) => value
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/[#>*_`\[\]()-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export async function buildPortalIndex(): Promise<PortalIndexEntry[]> {
  const [posts, talks, knowledge, projects, updates] = await Promise.all([
    getPublishedPosts(), getPublishedTalks(), getPublishedKnowledge(), getPublishedProjects(), getPublishedUpdates(),
  ]);
  const entries: PortalIndexEntry[] = [...staticPages];
  for (const post of posts) entries.push({ id: `post:${post.id}`, kind: 'post', title: post.data.title, description: post.data.description ?? plain(post.body ?? '').slice(0, 180), href: `/posts/${normalizeEntrySlug(post)}`, updatedAt: post.data.published.toISOString(), topics: [post.data.category ?? '', ...post.data.tags].filter(Boolean) });
  for (const talk of talks) entries.push({ id: `talk:${talk.id}`, kind: 'talk', title: talk.data.title ?? '随手记', description: talk.data.description ?? plain(talk.body ?? '').slice(0, 180), href: `/talk/${normalizeEntrySlug(talk)}`, updatedAt: talk.data.published.toISOString(), topics: talk.data.tags });
  for (const item of knowledge) entries.push({ id: `knowledge:${item.id}`, kind: 'knowledge', title: item.data.title, description: item.data.summary, href: `/knowledge/${normalizeEntrySlug(item)}`, updatedAt: item.data.updated.toISOString(), topics: item.data.topics });
  for (const item of projects) entries.push({ id: `project:${item.id}`, kind: 'project', title: item.data.title, description: item.data.summary, href: `/projects/${normalizeEntrySlug(item)}`, updatedAt: item.data.updated.toISOString(), topics: item.data.tags });
  for (const item of updates) entries.push({ id: `update:${item.id}`, kind: 'update', title: item.data.title, description: item.data.summary, href: `/changelog#${normalizeEntrySlug(item)}`, updatedAt: item.data.published.toISOString(), topics: [item.data.kind] });
  return assertUniqueLocalEntries(entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.href.localeCompare(b.href)));
}
```

The pure random/search helpers stay in `portalIndexCore.ts`; Astro collection imports stay in `portalIndex.ts`.

- [ ] **Step 4: Emit the static JSON and add a build assertion**

```ts
// src/pages/portal-index.json.ts
import type { APIRoute } from 'astro';
import { buildPortalIndex } from '../utils/portalIndex';

export const GET: APIRoute = async () => new Response(JSON.stringify(await buildPortalIndex()), {
  headers: { 'content-type': 'application/json; charset=utf-8' },
});
```

The build test must parse `dist/portal-index.json`, assert unique local `href` values, and reject `draft`, `private`, `service_role`, `upxuu`, or an absolute attachment URL.

- [ ] **Step 5: Run index and production security tests**

Run: `pnpm test:unit && node --test tests/portal-index-build.test.mjs && pnpm test:build`

Expected: PASS; the static index contains the factual portal project and permanent start pages.

- [ ] **Step 6: Commit the public index**

```bash
git add src/types/portal.ts src/utils/portalIndex.ts src/utils/portalIndexCore.ts src/pages/portal-index.json.ts src/pages/posts-data.json.ts tests/unit/portal-index.test.ts tests/portal-index-build.test.mjs
git commit -m "feat: add unified public portal index"
```

### Task 4: Prepare grouped desktop and mobile navigation components

**Files:**
- Create: `src/config/navigation.ts`
- Create: `src/components/MobileNav.svelte`
- Create: `src/components/GlobalTools.astro`
- Create: `tests/unit/navigation-config.test.ts`

**Interfaces:**
- Produces: `navigationGroups` with `primary`, `explore`, and `connect` groups.
- Produces: `isNavigationActive(pathname, item): boolean`.
- Produces events `portal:open-search` and `portal:random-explore`.

- [ ] **Step 1: Write the failing navigation contract test**

```ts
test('navigation has unique local destinations and exact home matching', () => {
  const items = Object.values(navigationGroups).flat();
  assert.deepEqual(items.map(({ label }) => label), ['首页', '文章', '知识', '项目', '动态', '说说', '主题', '更新', '实验室', '友链', '关于']);
  assert.equal(new Set(items.map(({ href }) => href)).size, items.length);
  assert.ok(items.every(({ href }) => href.startsWith('/') && !href.startsWith('//')));
  assert.equal(isNavigationActive('/posts/a', { href: '/posts', label: '文章', match: 'prefix' }), true);
  assert.equal(isNavigationActive('/about', { href: '/', label: '首页', match: 'exact' }), false);
});
```

- [ ] **Step 2: Run the test and verify it fails on missing portal links**

Run: `pnpm exec tsx --test tests/unit/navigation-config.test.ts`

Expected: FAIL because `src/config/navigation.ts` does not exist.

- [ ] **Step 3: Define grouped navigation and render the desktop menu**

```ts
// src/config/navigation.ts
export const navigationGroups = {
  primary: [
    { href: '/', label: '首页', match: 'exact' },
    { href: '/posts', label: '文章', match: 'prefix' },
    { href: '/knowledge', label: '知识', match: 'prefix' },
    { href: '/projects', label: '项目', match: 'prefix' },
    { href: '/now', label: '动态', match: 'prefix' },
  ],
  explore: [
    { href: '/talks', label: '说说', match: 'prefix' },
    { href: '/topics', label: '主题', match: 'prefix' },
    { href: '/changelog', label: '更新', match: 'prefix' },
    { href: '/lab', label: '实验室', match: 'prefix' },
  ],
  connect: [
    { href: '/friends', label: '友链', match: 'prefix' },
    { href: '/about', label: '关于', match: 'prefix' },
  ],
} as const;

export function isNavigationActive(pathname: string, item: { href: string; match: 'exact' | 'prefix' }) {
  return item.match === 'exact' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
```

Keep five primary links visible on wide screens; the component prepared here places remaining links in a keyboard-operable “探索” menu when mounted in Task 6.

- [ ] **Step 4: Add a focus-trapped mobile drawer and global tools**

`MobileNav.svelte` must accept `groups`, close on Escape or route selection, return focus to the opener, and lock body scroll while open. `GlobalTools.astro` renders search, random, favorites, theme, and knowledge-platform controls with text alternatives.

```svelte
<button aria-label="打开主菜单" aria-expanded={open} on:click={() => (open = true)}>菜单</button>
{#if open}
  <div role="dialog" aria-modal="true" aria-label="主菜单">
    <!-- Render every group; first link receives focus on open. -->
  </div>
{/if}
```

- [ ] **Step 5: Run type and navigation contract tests**

Run: `pnpm lint && pnpm exec tsx --test tests/unit/navigation-config.test.ts`

Expected: PASS; components compile but are not mounted until every target route exists in Task 6.

- [ ] **Step 6: Commit the navigation**

```bash
git add src/config/navigation.ts src/components/MobileNav.svelte src/components/GlobalTools.astro tests/unit/navigation-config.test.ts
git commit -m "feat: prepare grouped portal navigation"
```

### Task 5: Build the zero-content-safe homepage model and components

**Files:**
- Create: `src/components/home/PortalHome.astro`
- Create: `src/components/home/HomeHero.astro`
- Create: `src/components/home/StartHereGrid.astro`
- Create: `src/components/home/KnowledgeMap.astro`
- Create: `src/components/home/FocusPanel.astro`
- Create: `src/components/home/ProjectShelf.astro`
- Create: `src/components/home/ActivityStream.astro`
- Create: `src/components/home/ExploreDock.svelte`
- Create: `src/components/home/EnvironmentPreview.astro`
- Create: `src/utils/homeModel.ts`
- Create: `tests/unit/home-model.test.ts`

**Interfaces:**
- Consumes: `portalConfig`, `buildPortalIndex()`, and published collections.
- Produces: `buildHomeModel(input): HomeModel`, a pure zero-content-safe model used by tests and `index.astro`.
- Produces section IDs `identity`, `start-here`, `knowledge-map`, `current-focus`, `project-shelf`, `recent-activity`, `random-explore`, `environment`.
- `ExploreDock` consumes `entries: PortalIndexEntry[]` and never fetches at runtime.

- [ ] **Step 1: Write the failing zero-content model test**

```ts
test('homepage model stays meaningful with every editorial collection empty', () => {
  const model = buildHomeModel({ posts: [], talks: [], knowledge: [], projects: [], updates: [] });
  assert.ok(model.startHere.length >= 3);
  assert.equal(new Set(model.startHere.map(({ href }) => href)).size, model.startHere.length);
  assert.equal(model.projects[0]?.title, 'SunTBurst 个人门户');
  assert.equal(model.randomFallback, '/start');
  assert.doesNotMatch(JSON.stringify(model), /(?:访问|在线|用户|文章)[^\n]{0,12}\d+/);
});
```

- [ ] **Step 2: Run and observe the missing-section failure**

Run: `pnpm exec tsx --test tests/unit/home-model.test.ts`

Expected: FAIL because `buildHomeModel` does not exist.

- [ ] **Step 3: Implement the hero and start paths**

```ts
// src/utils/homeModel.ts
import { portalConfig } from '../config/portal';
import type { PortalIndexEntry, PortalProject } from '../types/portal';

interface HomeModelInput {
  posts: PortalIndexEntry[];
  talks: PortalIndexEntry[];
  knowledge: PortalIndexEntry[];
  projects: PortalProject[];
  updates: PortalIndexEntry[];
}

export function buildHomeModel(input: HomeModelInput) {
  const projects = input.projects.length > 0 ? input.projects : portalConfig.projects;
  return {
    identity: portalConfig.identity,
    startHere: portalConfig.startHere,
    focus: portalConfig.focus,
    topics: portalConfig.topics,
    projects,
    recent: [...input.updates, ...input.knowledge, ...input.posts, ...input.talks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
    randomFallback: '/start' as const,
  };
}
```

`HomeHero.astro` renders the configured name, tagline, current site update time, and three primary actions. `StartHereGrid.astro` renders every `PortalLink` with both its current destination and a visible “接下来可去” label for `nextHref`.

```astro
<section id="identity" aria-labelledby="identity-title">
  <p>PERSONAL PORTAL</p>
  <h1 id="identity-title">{identity.name}</h1>
  <p>{identity.tagline}</p>
  <nav aria-label="首页主要入口">
    <a href="/start">开始探索</a><a href="/knowledge">进入知识地图</a><a href="/ai">询问 AI 导览</a>
  </nav>
</section>
```

- [ ] **Step 4: Implement the map, project, activity, and environment sections**

Render only actual configured topics/projects and published updates. `EnvironmentPreview` uses `preview` labels for weather, music, status, statistics, and subscription; it must not display numeric fallbacks or create browser network requests.

- [ ] **Step 5: Implement embedded random exploration**

```svelte
<script lang="ts">
  import type { PortalIndexEntry } from '../../types/portal';
  import { pickRandomEntry } from '../../utils/portalIndexCore';
  export let entries: PortalIndexEntry[] = [];
  let selected = pickRandomEntry(entries, 0);
  const choose = () => { selected = pickRandomEntry(entries); };
</script>

<section id="random-explore">
  {#if selected}
    <a href={selected.href}>{selected.title}</a>
    <button type="button" on:click={choose}>换一个</button>
  {:else}
    <a href="/start">从这里开始</a>
  {/if}
</section>
```

- [ ] **Step 6: Assemble the reusable `PortalHome` component**

`PortalHome.astro` composes all eight sections from one `HomeModel` prop. If posts exist, it renders a “最近文章” slot; if none exist, it renders a compact link to the article collection policy rather than a blank grid. `src/pages/index.astro` is deliberately unchanged until Task 6 has created every linked route.

- [ ] **Step 7: Run the homepage, security, and full build tests**

Run: `pnpm lint && pnpm exec tsx --test tests/unit/home-model.test.ts`

Expected: PASS; all components type-check and the pure model proves the zero-content fallback.

- [ ] **Step 8: Commit the portal homepage**

```bash
git add src/components/home src/utils/homeModel.ts tests/unit/home-model.test.ts
git commit -m "feat: build portal homepage components"
```

### Task 6: Add the meaningful portal routes and honest preview pages

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/NavBar.astro`
- Modify: `src/layouts/Layout.astro`
- Create: `src/pages/start.astro`
- Create: `src/pages/knowledge/index.astro`
- Create: `src/pages/knowledge/[slug].astro`
- Create: `src/pages/projects/index.astro`
- Create: `src/pages/projects/[slug].astro`
- Create: `src/pages/now.astro`
- Create: `src/pages/changelog.astro`
- Modify: `src/pages/posts.astro`
- Create: `src/pages/archive.astro`
- Create: `src/pages/categories.astro`
- Create: `src/pages/calendar.astro`
- Create: `src/pages/timeline.astro`
- Create: `src/pages/explore.astro`
- Create: `src/pages/topics/index.astro`
- Create: `src/pages/topics/[slug].astro`
- Create: `src/pages/search.astro`
- Create: `src/pages/lab.astro`
- Create: `src/pages/favorites.astro`
- Create: `src/pages/ai.astro`
- Create: `src/pages/music.astro`
- Create: `src/pages/stats.astro`
- Create: `src/pages/status.astro`
- Create: `src/pages/subscribe.astro`
- Create: `src/components/FeaturePreview.astro`
- Create: `src/components/UnifiedSearch.svelte`
- Create: `tests/portal-routes-build.test.mjs`
- Create: `tests/navigation-build.test.mjs`
- Create: `tests/home-portal-build.test.mjs`

**Interfaces:**
- Consumes: collections and portal config from Tasks 1–3.
- Produces every public route referenced by homepage/navigation.
- `FeaturePreview` consumes `{ feature, title, purpose, privacy, requirements, fallback }`.
- Mounts `PortalHome`, grouped navigation, mobile drawer, and global tools only after route inventory is complete.

- [ ] **Step 1: Write a route inventory test**

```js
const routes = ['start', 'knowledge', 'knowledge/personal-portal-map', 'projects', 'projects/suntburst-portal', 'now', 'changelog', 'posts', 'archive', 'categories', 'calendar', 'timeline', 'explore', 'topics', 'topics/site-building', 'search', 'lab', 'favorites', 'ai', 'music', 'stats', 'status', 'subscribe'];
for (const route of routes) {
  assert.ok(existsSync(path.join(distDir, route, 'index.html')), `missing /${route}`);
}
```

- [ ] **Step 2: Run and confirm all new routes fail**

Run: `node --test tests/portal-routes-build.test.mjs`

Expected: FAIL on `/start`.

- [ ] **Step 3: Implement content-bearing routes**

- `/start` explains the three exploration paths and links each to a second valid page.
- `/knowledge` and `/knowledge/[slug]` render the topic map and only published knowledge entries.
- `/projects` lists factual projects; `/projects/[slug]` renders each published project body and current status.
- `/now` renders configured focus plus an explicit last-updated date.
- `/changelog` renders published update entries by date and source kind.
- `/posts` becomes the article browse/filter page; move the current chronological archive implementation to `/archive`.
- `/categories`, `/tags`, `/calendar`, and `/timeline` provide alternate views of the same published content counts.
- `/explore` embeds the true route manifest and random selector; empty candidates link to `/start`.
- `/topics/[slug]` aggregates matching posts, talks, knowledge, projects, and updates.

Use `getStaticPaths()` with normalized slugs and return 404 for unknown entries; never generate pages for drafts.

- [ ] **Step 4: Add unified search and local utility routes**

Create `UnifiedSearch.svelte` now so this task remains independently usable. `/search` embeds the full index as a prop; it filters title, description, kind, and topics, synchronizes `?q=` with `history.replaceState`, supports keyboard result navigation, and performs no runtime fetch. `/favorites` explains local-only storage and passes no data beyond the route manifest. `/lab` lists only implemented experiments and labels WebMCP as unavailable until its capability test passes.

```svelte
<script lang="ts">
  import type { PortalIndexEntry } from '../types/portal';
  export let entries: PortalIndexEntry[] = [];
  let query = '';
  $: normalized = query.trim().toLocaleLowerCase('zh-CN');
  $: results = normalized
    ? entries.filter((item) => [item.title, item.description, item.kind, ...item.topics].join(' ').toLocaleLowerCase('zh-CN').includes(normalized))
    : entries;
</script>
<label for="portal-search">搜索公开内容</label>
<input id="portal-search" bind:value={query} type="search" />
<p aria-live="polite">找到 {results.length} 项</p>
{#each results as result}<a href={result.href}>{result.title}</a>{/each}
```

- [ ] **Step 5: Add meaningful external-feature previews**

```astro
<!-- src/components/FeaturePreview.astro -->
<article data-feature={feature} data-state="preview">
  <p>PREVIEW</p>
  <h1>{title}</h1>
  <p>{purpose}</p>
  <h2>启用前会确认什么</h2><p>{requirements}</p>
  <h2>隐私边界</h2><p>{privacy}</p>
  <p>{fallback}</p>
</article>
```

AI, music, stats, status, and subscribe pages must explain their eventual value, required self-owned service, and current network-free fallback. Do not show disabled form controls that pretend to submit.

- [ ] **Step 6: Mount the new homepage and navigation after routes exist**

`index.astro` builds the `HomeModel` and renders `PortalHome` before the optional recent-article feed. `NavBar.astro` consumes `navigationGroups`, renders five wide-screen primary links plus an “探索” menu, and mounts `MobileNav`/`GlobalTools`. `Layout.astro` keeps the old PageBanner on collection/detail pages but hides it for the portal homepage.

The navigation build test asserts all labels, the mobile dialog trigger, search/random/favorites tools, and that every local href resolves to an emitted HTML route. The homepage build test asserts all eight section IDs, SunTBurst identity, the factual portal project, three `data-start-path` links, and no fabricated traffic/online number.

- [ ] **Step 7: Run route, homepage, navigation, draft, and URL audits**

Run: `pnpm build && node --test tests/portal-routes-build.test.mjs tests/navigation-build.test.mjs tests/home-portal-build.test.mjs && pnpm test:drafts && pnpm test:url-audit && pnpm test:build`

Expected: PASS; every navigation route is local, homepage sections are present, preview pages have `data-state="preview"`, and the browser bundle still has no network sink.

- [ ] **Step 8: Commit the routes, homepage, and navigation together**

```bash
git add src/pages/index.astro src/components/NavBar.astro src/layouts/Layout.astro src/pages/start.astro src/pages/knowledge src/pages/projects src/pages/now.astro src/pages/changelog.astro src/pages/posts.astro src/pages/archive.astro src/pages/categories.astro src/pages/calendar.astro src/pages/timeline.astro src/pages/explore.astro src/pages/topics src/pages/search.astro src/pages/lab.astro src/pages/favorites.astro src/pages/ai.astro src/pages/music.astro src/pages/stats.astro src/pages/status.astro src/pages/subscribe.astro src/components/FeaturePreview.astro src/components/UnifiedSearch.svelte tests/portal-routes-build.test.mjs tests/navigation-build.test.mjs tests/home-portal-build.test.mjs
git commit -m "feat: launch meaningful portal routes"
```

### Task 7: Implement unified search, random exploration, favorites, and reading history locally

**Files:**
- Modify: `src/components/UnifiedSearch.svelte`
- Create: `src/components/FavoritesManager.svelte`
- Create: `src/components/BookmarkButton.svelte`
- Create: `src/components/ReadingFootprint.astro`
- Create: `src/components/IntentPrefetch.astro`
- Create: `src/utils/browserStorage.ts`
- Modify: `src/pages/search.astro`
- Modify: `src/pages/favorites.astro`
- Modify: `src/layouts/Layout.astro`
- Create: `tests/unit/browser-storage.test.ts`

**Interfaces:**
- Produces: `StoredPortalItem { href, title, kind, savedAt }`.
- Produces: `readStoredItems(key)`, `writeStoredItems(key, items)`, `toggleFavorite(item)`, `clearLocalPortalData()`.
- Storage keys: `suntburst:favorites:v1`, `suntburst:footprints:v1`; maximum 100 metadata-only entries.

- [ ] **Step 1: Write storage parsing and cap tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseStoredItems, upsertStoredItem } from '../../src/utils/browserStorage';

test('storage parser rejects unknown and non-local routes', () => {
  assert.deepEqual(parseStoredItems('[{"href":"https://evil.test","title":"x"}]'), []);
  assert.deepEqual(parseStoredItems('not-json'), []);
});

test('history is unique and capped at 100 metadata records', () => {
  const items = Array.from({ length: 105 }, (_, i) => ({ href: `/p/${i}`, title: String(i), kind: 'page', savedAt: i }));
  assert.equal(upsertStoredItem(items, items[0]).length, 100);
});
```

- [ ] **Step 2: Run and verify missing helpers**

Run: `pnpm exec tsx --test tests/unit/browser-storage.test.ts`

Expected: FAIL because `browserStorage.ts` is missing.

- [ ] **Step 3: Implement defensive metadata-only storage**

```ts
export interface StoredPortalItem {
  href: string;
  title: string;
  kind: string;
  savedAt: number;
}

export function parseStoredItems(raw: string | null): StoredPortalItem[] {
  try {
    const value = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item.href === 'string' && item.href.startsWith('/') && !item.href.startsWith('//') && typeof item.title === 'string').slice(0, 100);
  } catch { return []; }
}

export function upsertStoredItem(items: StoredPortalItem[], item: StoredPortalItem) {
  return [item, ...items.filter(({ href }) => href !== item.href)].slice(0, 100);
}
```

Add browser wrappers that no-op when storage is unavailable and never store body text, query content, email, or AI messages.

- [ ] **Step 4: Implement search and favorites UIs**

`UnifiedSearch` filters title, description, kind, and topics in the embedded index; it updates `?q=` with `history.replaceState`, supports arrow keys, and never calls `/portal-index.json` at runtime. `FavoritesManager` reads local storage on mount, removes stale hrefs not present in the embedded route manifest, and exposes export JSON plus one-click clear.

- [ ] **Step 5: Record reading footprints and add safe intent prefetch**

`ReadingFootprint.astro` only records public GET pages after DOM ready when the user has explicitly enabled history in `/favorites`; the separate key `suntburst:history-enabled:v1` defaults to `false`. `IntentPrefetch.astro` inserts `<link rel="prefetch">` for same-origin links after hover/focus only when `navigator.connection?.saveData !== true`, the effective type is not `2g`, and the target is not `/knowledge-app`, `/login`, or an external URL.

- [ ] **Step 6: Run tests and verify the browser bundle has no fetch sink**

Run: `pnpm test:unit && pnpm build && pnpm test:build`

Expected: PASS; the production audit still reports no `fetch`, XHR, WebSocket, beacon, worker, or external runtime URL.

- [ ] **Step 7: Commit local exploration tools**

```bash
git add src/components/UnifiedSearch.svelte src/components/FavoritesManager.svelte src/components/BookmarkButton.svelte src/components/ReadingFootprint.astro src/components/IntentPrefetch.astro src/utils/browserStorage.ts src/pages/search.astro src/pages/favorites.astro src/layouts/Layout.astro tests/unit/browser-storage.test.ts
git commit -m "feat: add private local exploration tools"
```

### Task 8: Restore safe reading, sharing, and motion enhancements

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/components/ReadingProgress.astro`
- Create: `src/components/BackToTop.astro`
- Create: `src/components/ArticleEnhancements.astro`
- Create: `src/components/ArticleLightbox.svelte`
- Create: `src/components/ShareMenu.svelte`
- Create: `src/components/PortalEffects.astro`
- Modify: `src/pages/posts/[id].astro`
- Modify: `src/pages/talk/[id].astro`
- Modify: `src/layouts/Layout.astro`
- Modify: `src/index.css`
- Modify: `src/utils/readingTime.ts`
- Create: `tests/unit/reading-time.test.ts`
- Create: `tests/reading-enhancements-build.test.mjs`

**Interfaces:**
- `ShareMenu` consumes `{ title, description, canonicalUrl }` and uses only Clipboard/Web Share/local Canvas.
- `PortalEffects` emits decorative elements with `aria-hidden="true"` and disables them under reduced motion.
- `countReadableUnits(markdown)` returns `{ cjkCharacters, latinWords }`; `calculateReadingTime` uses both counts and excludes code/URLs/image syntax.

- [ ] **Step 1: Write the failing artifact test**

```js
test('article contains local reading and sharing controls', () => {
  const article = readFileSync(path.join(distDir, 'posts/hello-world/index.html'), 'utf8');
  assert.match(article, /id="reading-progress"/);
  assert.match(article, /aria-label="返回顶部"/);
  assert.match(article, /data-share-menu/);
  assert.doesNotMatch(article, /api\.qrserver|upxuu/);
});

test('Chinese prose contributes real reading units', () => {
  const units = countReadableUnits('这是一段没有空格的中文正文。 English words.');
  assert.ok(units.cjkCharacters >= 10);
  assert.equal(units.latinWords, 2);
});
```

- [ ] **Step 2: Run and confirm the controls are absent**

Run: `node --test tests/reading-enhancements-build.test.mjs`

Expected: FAIL at the reading progress assertion.

- [ ] **Step 3: Implement reading progress and back-to-top controls**

Use passive scroll listeners scheduled through `requestAnimationFrame`; derive progress from the article element rather than the entire document. The back-to-top button becomes visible after one viewport and uses instant scrolling under reduced motion.

Move the existing heading/TOC synchronization, code copy/fold, image-caption, and cleanup logic out of `src/pages/posts/[id].astro` into `ArticleEnhancements.astro`. `ArticleLightbox.svelte` reuses the sanitized image model from `SvelteLightbox.svelte`, opens only local/approved article images, traps focus, and closes on Escape.

Fix reading time by removing fenced/inline code, image/link destinations and HTML-like syntax, counting `\p{Script=Han}` characters plus Unicode Latin word sequences, then using explicit rates (300 CJK characters/minute and 200 Latin words/minute) with a one-minute minimum.

- [ ] **Step 4: Implement local sharing**

```ts
async function sharePage() {
  if (navigator.share) return navigator.share({ title, text: description, url: canonicalUrl });
  await navigator.clipboard.writeText(canonicalUrl);
  copied = true;
}
```

Add platform links as ordinary anchors with encoded canonical URLs. Generate the poster from local avatar, title, description, and URL on Canvas; if a QR code is included, add `qrcode@^1.5.4` and generate it locally rather than calling a QR API.

- [ ] **Step 5: Add reduced-motion-safe cursor and click decoration**

Only enable the custom cursor for `(pointer: fine)` and no reduced-motion preference. Decorative stars are capped, removed after animation, ignored for form controls, and never intercept pointer events. Add a visible default cursor fallback.

Add native cross-document transitions as progressive enhancement:

```css
@view-transition { navigation: auto; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
}
```

Do not add Astro ClientRouter or client-side navigation fetches for this effect.

- [ ] **Step 6: Run reading, motion, URL, and sanitization tests**

Run: `pnpm lint && node --test tests/reading-enhancements-build.test.mjs && pnpm test:url-audit && pnpm test:post-security && pnpm test:security`

Expected: PASS with no remote QR/image/font services.

- [ ] **Step 7: Commit reading enhancements**

```bash
git add package.json pnpm-lock.yaml src/components/ReadingProgress.astro src/components/BackToTop.astro src/components/ArticleEnhancements.astro src/components/ArticleLightbox.svelte src/components/ShareMenu.svelte src/components/PortalEffects.astro src/pages/posts/[id].astro src/pages/talk/[id].astro src/layouts/Layout.astro src/index.css src/utils/readingTime.ts tests/unit/reading-time.test.ts tests/reading-enhancements-build.test.mjs
git commit -m "feat: add safe portal reading enhancements"
```

### Task 9: Generate honest Git build statistics and article history

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `scripts/generate-public-git-data.mjs`
- Create: `src/generated/public-git-data.fallback.json`
- Create: `src/utils/gitStats.ts`
- Create: `src/pages/blogstats.astro`
- Create: `src/pages/posts/[id]/history.astro`
- Create: `tests/unit/git-stats.test.ts`
- Create: `tests/git-data-build.test.mjs`

**Interfaces:**
- Produces `PublicGitData { generatedAt, commitCount: number | null, activeDays: string[], articleHistory: Record<string, PublicCommit[]> }`.
- `PublicCommit` contains only `{ hashShort, date, subject, path }`; no name, email, remote URL, body, or diff.
- Build command becomes `pnpm generate:git-data && astro build`.

- [ ] **Step 1: Write redaction tests for parsed Git output**

```ts
test('public commit parser drops identity and body fields', () => {
  const parsed = parseGitRecord('abcdef123456\u001f2026-08-30\u001ffeat: portal\u001fAuthor Name\u001fa@example.test\u001fsrc/content/posts/a.md');
  assert.deepEqual(parsed, { hashShort: 'abcdef1', date: '2026-08-30', subject: 'feat: portal', path: 'src/content/posts/a.md' });
  assert.doesNotMatch(JSON.stringify(parsed), /Author|example\.test/);
});
```

- [ ] **Step 2: Run and verify the parser is absent**

Run: `pnpm exec tsx --test tests/unit/git-stats.test.ts`

Expected: FAIL because `src/utils/gitStats.ts` does not exist.

- [ ] **Step 3: Implement the parser and generator**

Use `spawnSync('git', ['log', '--date=short', '--format=...','--name-only'])` with an argument array, never a shell-built command. Normalize paths to `src/content/posts/<file>.md`, escape subjects as plain text, and write `.cache/public-git-data.json`. `loadPublicGitData()` reads that ignored cache file and falls back to the tracked `src/generated/public-git-data.fallback.json`, which contains `commitCount: null` and empty history. Builds must not rewrite a tracked timestamped file.

- [ ] **Step 4: Wire the generator into local and CI builds**

```json
{
  "scripts": {
    "generate:git-data": "node scripts/generate-public-git-data.mjs",
    "build": "pnpm generate:git-data && astro build"
  }
}
```

Change checkout to `fetch-depth: 0`. Add CI steps `pnpm lint` and `pnpm test` before the build. Do not add a GitHub token to browser code or generated JSON.

- [ ] **Step 5: Implement `/blogstats` and per-article history**

Show verified commit count, active-day heatmap, content counts, and generated time. When commit data is unavailable, show “Git 历史在本次构建中不可用” rather than `0`. The article history route lists only commits for that public Markdown path.

- [ ] **Step 6: Run shallow-history fallback and full-history tests**

Run: `pnpm test:unit && node --test tests/git-data-build.test.mjs && pnpm build`

Expected: tests PASS; `tests/git-data-build.test.mjs` asserts that generated data has no author, committer, email, body, diff, or remote field.

- [ ] **Step 7: Commit Git-derived public metadata**

```bash
git add package.json .gitignore .github/workflows/deploy-pages.yml scripts/generate-public-git-data.mjs src/generated/public-git-data.fallback.json src/utils/gitStats.ts src/pages/blogstats.astro src/pages/posts/[id]/history.astro tests/unit/git-stats.test.ts tests/git-data-build.test.mjs
git commit -m "feat: add privacy-safe blog build history"
```

### Task 10: Complete public SEO, feeds, and AI-readable indexes

**Files:**
- Modify: `src/layouts/Layout.astro`
- Modify: `src/pages/rss.xml.ts`
- Modify: `src/pages/latest.xml.ts`
- Modify: `src/pages/sitemap.xml.ts`
- Modify: `src/pages/robots.txt.ts`
- Create: `src/pages/llms.txt.ts`
- Create: `src/pages/llms-full.txt.ts`
- Create: `src/utils/publicTextExport.ts`
- Create: `tests/public-distribution-build.test.mjs`

**Interfaces:**
- Produces JSON-LD for Person, WebSite, Article, CollectionPage, and BreadcrumbList.
- Produces four feeds: all public updates, posts, talks, and latest ten entries.
- Produces `llms.txt` index and opt-in `llms-full.txt` containing only published public collections.

- [ ] **Step 1: Write feed and leak-prevention tests**

```js
for (const file of ['rss.xml', 'posts.xml', 'talk.xml', 'latest.xml', 'llms.txt', 'llms-full.txt', 'sitemap.xml', 'robots.txt']) {
  assert.ok(existsSync(path.join(distDir, file)), `missing ${file}`);
}
const exportsText = ['rss.xml', 'latest.xml', 'llms.txt', 'llms-full.txt'].map(readDist).join('\n');
assert.match(exportsText, /个人门户建设地图/);
assert.doesNotMatch(exportsText, /draft|private|service_role|upxuu/i);
```

- [ ] **Step 2: Run and verify missing LLM export failures**

Run: `node --test tests/public-distribution-build.test.mjs`

Expected: FAIL because `llms.txt` and `llms-full.txt` are absent.

- [ ] **Step 3: Implement one public export source**

`publicTextExport.ts` consumes `buildPortalIndex()` plus rendered public Markdown and returns records with `title`, `url`, `kind`, `summary`, `updatedAt`, and optional `body`. It filters drafts before rendering and asserts that every URL is under `siteConfig.url`.

- [ ] **Step 4: Use the export source for feeds and LLM indexes**

`rss.xml` includes posts, talks, knowledge, projects, and updates. `latest.xml` includes the ten newest public records. `llms.txt` lists titles/summaries/URLs; `llms-full.txt` includes body only for collections explicitly marked public and never reads arbitrary repository files.

- [ ] **Step 5: Add structured data and accurate robots/sitemap links**

Derive every absolute URL from `PUBLIC_SITE_URL`. Do not add bot UA middleware because GitHub Pages cannot execute it; accessible semantic HTML and the public exports are the equivalent crawler path.

- [ ] **Step 6: Run distribution, draft, and URL audits**

Run: `pnpm build && node --test tests/public-distribution-build.test.mjs && pnpm test:drafts && pnpm test:url-audit`

Expected: PASS with no draft/private record in any public text artifact.

- [ ] **Step 7: Commit public distribution support**

```bash
git add src/layouts/Layout.astro src/pages/rss.xml.ts src/pages/latest.xml.ts src/pages/sitemap.xml.ts src/pages/robots.txt.ts src/pages/llms.txt.ts src/pages/llms-full.txt.ts src/utils/publicTextExport.ts tests/public-distribution-build.test.mjs
git commit -m "feat: publish complete public discovery indexes"
```

### Task 11: Add browser-level desktop, mobile, empty-state, and accessibility verification

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.gitignore`
- Create: `playwright.config.ts`
- Create: `.lighthouserc.cjs`
- Create: `tests/e2e/portal.spec.ts`
- Create: `tests/e2e/mobile-portal.spec.ts`
- Create: `tests/e2e/reduced-motion.spec.ts`
- Create: `tests/empty-state-contract.test.mjs`

**Interfaces:**
- Produces scripts `test:e2e`, `test:e2e:mobile`, and `test:all`.
- Tests the static preview server at `http://127.0.0.1:4321` after `pnpm build`.

- [ ] **Step 1: Add Playwright and failing smoke tests**

Run: `pnpm add -D @playwright/test@^1.55.0 @lhci/cli@^0.15.1`

```ts
// tests/e2e/portal.spec.ts
import { expect, test } from '@playwright/test';

test('three exploration paths continue for two valid pages', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#start-here a[data-start-path]');
  await expect(cards).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) {
    const first = await cards.nth(i).getAttribute('href');
    await page.goto(first!);
    const next = page.locator('[data-next-path]').first();
    await expect(next).toBeVisible();
    await page.goto((await next.getAttribute('href'))!);
    await expect(page.locator('main')).toBeVisible();
    await page.goto('/');
  }
});
```

- [ ] **Step 2: Configure Chromium and WebKit projects**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  webServer: { command: 'pnpm preview --host 127.0.0.1', port: 4321, reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://127.0.0.1:4321', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-360', use: { viewport: { width: 360, height: 800 }, hasTouch: true } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
});
```

- [ ] **Step 3: Test mobile menu, search, random, favorites, and overflow**

For both mobile projects, open/close the drawer, run a Chinese search, choose a random entry, add/remove a favorite, and assert `document.documentElement.scrollWidth === document.documentElement.clientWidth`. Assert primary buttons have bounding boxes at least 44px high.

- [ ] **Step 4: Test reduced motion and keyboard-only operation**

Emulate `reducedMotion: 'reduce'`, verify decorative cursor/stars are absent, Tab through global tools and the mobile dialog, close with Escape, and confirm focus returns to the opener.

- [ ] **Step 5: Add a code-level empty-state contract**

Test `buildHomeModel({ posts: [], talks: [], knowledge: [], projects: portalConfig.projects, updates: [] })` and assert at least three start paths, one factual portal project, no numeric traffic claim, and a random fallback to `/start`.

- [ ] **Step 6: Add the Lighthouse release thresholds**

```js
// .lighthouserc.cjs
module.exports = {
  ci: {
    collect: { staticDistDir: './dist', url: ['http://localhost/', 'http://localhost/knowledge/', 'http://localhost/start/'] },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
```

Add `.lighthouseci/` to `.gitignore`; reports remain local/CI artifacts and are never uploaded to a public third-party report host.

- [ ] **Step 7: Run the complete browser and performance suite**

Run: `pnpm exec playwright install chromium webkit && pnpm build && pnpm exec playwright test && pnpm exec lhci autorun`

Expected: all desktop, mobile, reduced-motion, exploration-path, performance, accessibility, and CLS checks PASS.

- [ ] **Step 8: Commit browser acceptance coverage**

```bash
git add package.json pnpm-lock.yaml .gitignore playwright.config.ts .lighthouserc.cjs tests/e2e tests/empty-state-contract.test.mjs
git commit -m "test: verify portal exploration across devices"
```

### Task 12: Update privacy, operations, CI, and perform the release gate

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `src/pages/privacy.astro`
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `docs/operations/portal-content.md`
- Create: `docs/operations/feature-status.md`
- Create: `tests/reference-boundary.test.mjs`

**Interfaces:**
- Produces a feature status table with implementation status, runtime state, required credential, owner, and evidence path.
- Leaves every external feature in `preview` until its own integration plan is implemented and configured.

- [ ] **Step 1: Add a permanent upstream/private boundary test**

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readTree(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return readTree(target);
    return /\.(?:astro|css|html|js|json|mjs|svg|ts|tsx|txt|xml|ya?ml)$/.test(entry.name)
      ? [readFileSync(target, 'utf8')]
      : [];
  });
}

test('source and distribution never contain upstream identity or private markers', () => {
  const roots = ['src', 'public', 'scripts', '.github', 'dist']
    .map((name) => path.join(projectRoot, name))
    .filter(existsSync);
  const text = roots.flatMap(readTree).join('\n');
  assert.doesNotMatch(text, /(?:[a-z0-9-]+\.)*upxuu\.com|8\.220\.197\.92|47\.243\.228\.164/i);
  assert.doesNotMatch(text, /service_role|BEGIN PRIVATE KEY|github_pat_/i);
});
```

- [ ] **Step 2: Run and verify the current README/privacy assertions need revision**

Run: `node --test tests/reference-boundary.test.mjs tests/production-build.test.mjs`

Expected: the new boundary test passes; the old production expectations fail on newly intentional routes and must be updated without weakening the upstream ban.

- [ ] **Step 3: Replace the zero-network route ban with explicit phase-one rules**

Keep runtime `fetch`/XHR/WebSocket/beacon/worker forbidden in phase one. Remove assertions that `/ai`, `/music`, `/stats`, `/status`, and `/subscribe` must not exist; replace them with assertions that these routes exist in `preview` and contain no external endpoint or form submission.

- [ ] **Step 4: Update public documentation and privacy wording**

README must state the site is live at `https://suntburst.github.io`, explain the new knowledge/project/update collections, and distinguish implemented local capabilities from preview external modules. Privacy must disclose local theme/favorites/footprints storage and state clearly that comments, analytics, location, AI, and email transmission are not active yet.

- [ ] **Step 5: Harden the Pages workflow**

Before `pnpm build`, run `pnpm lint` and `pnpm test`. After build, run the reference-boundary test against `dist`. Keep `contents: read`, `pages: write`, and `id-token: write`; add no SSH, cloud purge, repository write, or external deployment secret.

- [ ] **Step 6: Run the complete release gate**

Run: `pnpm lint && pnpm test && pnpm build && pnpm exec playwright test && git diff --check && git status --short --branch`

Expected: all checks PASS; status contains only the planned documentation/test changes before commit; `dist` contains every portal route and no upstream/private string.

- [ ] **Step 7: Commit the portal release gate**

```bash
git add README.md .env.example src/pages/privacy.astro .github/workflows/deploy-pages.yml docs/operations/portal-content.md docs/operations/feature-status.md tests/reference-boundary.test.mjs tests/production-build.test.mjs
git commit -m "docs: complete personal portal release gate"
```

- [ ] **Step 8: Push only after the local gate is green and verify Pages**

Run: `git push origin main`

Expected: the GitHub Pages workflow succeeds, `https://suntburst.github.io/` serves the new homepage, and desktop/mobile spot checks match the local build. If the workflow fails, diagnose and commit a scoped fix; do not bypass the failing check.
