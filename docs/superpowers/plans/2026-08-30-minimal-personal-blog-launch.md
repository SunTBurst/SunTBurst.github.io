# Minimal Personal Blog Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally runnable, GitHub-Pages-ready personal blog that preserves the upstream visual design while containing only the user's own static content and no external services.

**Architecture:** Export only the upstream presentation and static-content code into a new repository history. Use Astro static generation and Markdown content collections; configure the public site URL through `PUBLIC_SITE_URL`. GitHub Pages receives only the `dist/` artifact through an official, minimum-permission workflow.

**Tech Stack:** Astro 6, TypeScript, Tailwind CSS 4, React/Svelte islands, pnpm 9, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-30-personal-blog-design.md`

## Global Constraints

- Keep the Toy Brick Brutalism visual language and static blog core only.
- Do not copy upstream articles, talks, images, personal details, friend links, music, API data, or Git history.
- Do not retain `*.upxuu.com`, fixed server IPs, SSH deployment, automatic friend links, subscription pushes, load testing, Vercel middleware, or Cloudflare deployment files.
- Keep AI, comments, analytics, weather, random images, mail subscription, music, and status pages disabled until a separately approved second phase.
- Never publish, create a remote repository, or use a user credential during this plan.
- Use the Visual Studio Node executable at `C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe` if it satisfies the Node 22 requirement.

---

### Task 1: Create a clean local source baseline

**Files:**
- Create: repository root source tree, `.gitignore`, `UPSTREAM_NOTICE.md`
- Import: selected code from `ImUpXuu/xuhome` without `.git`, `.github`, `src/content`, or `public`
- Preserve: local planning records under `docs/superpowers/`; they are not included in the built website

**Interfaces:**
- Consumes: public upstream source at commit selected during import
- Produces: an independent local tree with no upstream Git history or content data

- [ ] **Step 1: Verify the workspace contains no user project files**

Run:

```powershell
Get-ChildItem -Force
```

Expected: only agent-created planning files are present.

- [ ] **Step 2: Clone the upstream source to a disposable staging directory**

Run:

```powershell
git clone --depth 1 https://github.com/ImUpXuu/xuhome.git "C:\Users\TSun\AppData\Local\Temp\xuhome-upstream-staging-20260830"
```

Expected: a staging directory with the upstream source and no edits to the project root.

- [ ] **Step 3: Copy only the presentation/source skeleton into the project root**

Run:

```powershell
robocopy "C:\Users\TSun\AppData\Local\Temp\xuhome-upstream-staging-20260830\src" "F:\TSunWebBlog\src" /E /XD content _archive
Copy-Item -LiteralPath "C:\Users\TSun\AppData\Local\Temp\xuhome-upstream-staging-20260830\astro.config.mjs" -Destination "F:\TSunWebBlog\astro.config.mjs"
Copy-Item -LiteralPath "C:\Users\TSun\AppData\Local\Temp\xuhome-upstream-staging-20260830\package.json" -Destination "F:\TSunWebBlog\package.json"
Copy-Item -LiteralPath "C:\Users\TSun\AppData\Local\Temp\xuhome-upstream-staging-20260830\tsconfig.json" -Destination "F:\TSunWebBlog\tsconfig.json"
```

Expected: no upstream Markdown content, images, workflows, or Git history exists in the project root.

- [ ] **Step 4: Add source attribution and a fresh Git repository**

Create `UPSTREAM_NOTICE.md` with the upstream repository URL, imported commit SHA, upstream README's code/content boundary, and a statement that no upstream content or assets are included. Initialize a new local Git repository only after the tree is clean.

- [ ] **Step 5: Run the source-boundary test**

Run:

```powershell
rg -n -i "upxuu|ImUpXuu|8\.220\.197\.92|47\.243\.228\.164" . -g '!UPSTREAM_NOTICE.md' -g '!docs/**'
```

Expected: no matches.

### Task 2: Make the retained visual core into the user's empty blog

**Files:**
- Create: `src/content/posts/hello-world.md`, `src/content/talks/first-note.md`, `src/config/about.md`, `src/config/friends.json`, `public/images/avatar.svg`, `.env.example`
- Modify: `src/config/site.ts`, `src/content.config.ts`, `astro.config.mjs`, `src/layouts/Layout.astro`, `src/pages/posts/[id].astro`, `src/pages/about.astro`, `src/pages/friends.astro`, `src/pages/robots.txt.ts`, `package.json`
- Delete: AI, statistics, music, comments, page-view, server-status, weather/welcome, Vercel/Cloudflare runtime files and pages that depend on them

**Interfaces:**
- Consumes: the clean source baseline from Task 1
- Produces: an independently branded static site where content is read exclusively from local Markdown files

- [ ] **Step 1: Add a failing content-schema check**

Create a deliberately invalid temporary Markdown fixture missing `published`, then run the Astro content validation command during build preparation.

Expected: validation rejects the invalid post with a `published` field error.

- [ ] **Step 2: Define strict post and talk collections**

Implement `z.object` schemas in `src/content.config.ts`:

```ts
title: z.string().min(1),
published: z.coerce.date(),
description: z.string().optional(),
image: z.string().optional(),
tags: z.array(z.string()).default([]),
category: z.string().optional(),
slug: z.string().optional(),
draft: z.boolean().default(false),
```

For talks, retain `location`, `weather`, `mood`, and `device` as optional local text fields.

- [ ] **Step 3: Re-run the content-schema check**

Expected: the invalid fixture fails and the two valid sample entries pass once the fixture is removed.

- [ ] **Step 4: Set the identity and feature configuration**

Set the initial title to `TSun 的博客`, use `PUBLIC_SITE_URL` with fallback `https://example.github.io`, and make external-service configuration absent rather than pointing to a third party. Configure navigation to show only home, talks, archive, tags, about, and friends.

- [ ] **Step 5: Remove all external-runtime imports and routes**

Remove direct imports and rendered instances of Waline, page-view counters, AI chat, weather toast, music player, statistics, status, Vercel middleware, and any source-specific bot/API pages. Keep 404, post, talk, archive, category, tag, RSS, sitemap, robots, and search routes.

- [ ] **Step 6: Add safe local replacement assets and sample content**

Use `public/images/avatar.svg` as the avatar and create one original welcome post plus one original talk. Leave `friends.json` as an empty array.

- [ ] **Step 7: Run the runtime-boundary test**

Run:

```powershell
rg -n -i "upxuu|waline|umami|clarity|blogapi|randomImage|weatherApi|serverURL" src public
```

Expected: no third-party endpoint or enabled external integration remains.

### Task 3: Make the project buildable and GitHub-Pages-ready

**Files:**
- Create: `.github/workflows/deploy-pages.yml`, `README.md`, `public/robots.txt` or `src/pages/robots.txt.ts`, `pnpm-lock.yaml`
- Modify: `astro.config.mjs`, `package.json`, `.gitignore`
- Delete: `vercel.json`, `wrangler.toml`, `middleware.js`, all upstream `.github/workflows/*`

**Interfaces:**
- Consumes: the static-only site from Task 2
- Produces: a reproducible local build and a GitHub Pages deployment artifact

- [ ] **Step 1: Add a minimal GitHub Pages workflow**

Use `actions/checkout`, `actions/setup-node` pinned to Node 22, `pnpm/action-setup` pinned to pnpm 9, `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`. Grant only `contents: read`, `pages: write`, and `id-token: write` permissions. Build with:

```yaml
env:
  PUBLIC_SITE_URL: https://${{ github.repository_owner }}.github.io
```

- [ ] **Step 2: Configure static URLs and robots**

Set `astro.config.mjs` to `output: 'static'` and `site: process.env.PUBLIC_SITE_URL || 'https://example.github.io'`. Ensure RSS, sitemap, canonical URLs, and robots use the same value and no `upxuu.com` fallback exists.

- [ ] **Step 3: Generate and commit a dependency lockfile**

Prepend the Visual Studio Node directory to the process `PATH`, run `pnpm install`, and verify `pnpm-lock.yaml` is generated. Do not use `--no-frozen-lockfile` in the new workflow.

- [ ] **Step 4: Run static checks and a production build**

Run:

```powershell
pnpm lint
pnpm build
```

Expected: exit code 0 and a populated `dist/` containing `index.html`, post/talk routes, `rss.xml`, `sitemap.xml`, and `404.html`.

- [ ] **Step 5: Run a built-artifact safety check**

Run:

```powershell
rg -n -i "upxuu|8\.220\.197\.92|47\.243\.228\.164" dist
```

Expected: no matches.

- [ ] **Step 6: Write the handoff README**

Document the two commands for local use, the Markdown frontmatter, how to set `PUBLIC_SITE_URL`, and the final manual GitHub steps: create a `<username>.github.io` repository, add it as `origin`, push `main`, and select GitHub Actions in Pages settings.
