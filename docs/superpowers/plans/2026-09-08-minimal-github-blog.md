# SunTBurst 免费 GitHub 博客精简优化实施方案（Implementation Plan）

**实施状态（2026-09-08）：Tasks 1–5 已完成本地实现、验证和独立审查；Task 6 正式发布待最终确认。** 结果与验证记录见 [本地改版验收记录](../../reviews/2026-09-08-blog-implementation.md)。

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 `subagent-driven-development` 或 `executing-plans` 按任务实施。独立文件可并行处理；共享文件、构建测试、集成与发布顺序执行。任务前读取本方案及下面的 Spec。复用现有组件，不根据历史调研另起 CMS 项目。

**Goal:** 保留现有 LOGO、内容与地址，在不架设新服务器的条件下，让博客更好读、更容易从 GitHub 发帖，并能检索正文。

**Architecture:** 继续使用当前单仓库、Astro 静态页面和 GitHub Pages / Actions。博客只提供清楚的写作入口，GitHub 负责登录、文件编辑和保存权限。搜索、阅读、导航和外观在现有代码上做小范围调整。

**Tech Stack:** 现有 Astro、Svelte、Tailwind、Markdown、markdown-it、Node 自带测试和 tsx；Node ≥22.12，项目锁定 pnpm 9.15.4；不新增应用依赖。

**Spec:** [当前有效的免费 GitHub 与最小改动方案](../../reviews/2026-09-08-blog-review.md)，以该文件顶部“当前有效方案”为准。

## Global Constraints

- “只使用免费 GitHub 作为博客托管，不额外架设服务器，优先复用已有代码。”
- 保留 `public/images/avatar.svg`、蓝黄品牌、现有文章地址和内容集合。
- 默认不新增数据库、OAuth 服务、Cloudflare Worker、付费模型、常驻服务器或第二个内容仓库。
- 编辑发生在 GitHub；静态写作工具页不是私密后台，不能通过隐藏按钮声称实现权限控制。
- 私密草稿继续保存在 Obsidian；公开仓库中的文件、草稿分支和历史提交都不能视为私密存储。
- 本轮不启用 Supabase、Giscus、Discussions、访客统计或模型服务，不删除现有尚未启用的相关代码。
- 不改文章 slug、旧 URL、RSS 地址和评论目标路径，不合并内容目录，不替换整套主题。
- 不迁移 React/Svelte 框架、不做无关清理，不为本任务引入新的工作区结构。
- 代码实现后先提供本地可审阅结果；推送 main 触发现网部署前再处理发布确认。

---

## 第一部分：你主要看这一部分

### 完成后，博客会是什么样

首页顶部保留现在的 TS 标识。常用导航是“文章、随记、关于”，搜索和深浅色切换仍然容易找到。知识、项目、归档、友链和工具放进“更多”，原页面仍然可以访问。

首页从上到下是：**简短介绍 → 最近文章 → 最近随记 → 简短页脚**。最近文章最多展示 4 篇，随记最多展示 3 条；有几条就展示几条，不用示例或更新日志凑数。短介绍保留现有个人信息，避免重新编写个人经历。

文章页只出现一次文章标题。正文背景更接近浅米白，保留蓝黄点缀，减少粗边框和阴影。文章正文旁不再放日历；长文保留目录，手机可以展开查看目录，短文不出现空目录框。

页脚新增“写作工具”。点击后可以直接进入新建文章、编辑文章、上传图片、调整外观、查看发布记录等位置。真正编辑时会打开 GitHub；不用安装新平台，也不用在博客里填写访问令牌。

### 五步实施，每步都有看得见的结果

| 步骤 | 我来做什么、怎么做 | 你需要做什么 | 完成后的结果 |
| --- | --- | --- | --- |
| 1. 整理首页和导航 | 重排现有区块，压缩导航和页脚；复用现有文章列表、随记数据和手机菜单 | 看桌面、手机预览，确认主要内容容易找到 | 第一屏更早看到文章；原有功能有清楚入口 |
| 2. 改善文章阅读 | 使用现有布局开关去掉重复横幅，减轻底色，按需显示目录，集中少量外观配置 | 看一篇短文和一篇含目录的长文，确认字大小、行距和配色舒适 | 文章成为视觉重点，保留原 LOGO 与蓝黄风格 |
| 3. 增加写作工具 | 新建一个轻量工具页；所有按钮都链接到你自己的 GitHub 仓库；文章页增加准确的编辑链接 | 使用现有 GitHub 账号登录，试着打开编辑页面；无需实际提交测试内容 | 不用记目录地址，从博客就能找到常用操作 |
| 4. 补全正文搜索 | 把公开正文接入现有搜索，保留现有搜索框、键盘操作、筛选和收藏 | 输入一个只在正文里出现的词，确认能找到文章 | 全站搜索和主要文章列表能搜正文，不增加搜索服务 |
| 5. 检查并上线 | 检查页面、链接、草稿过滤和发布流程，提供最终变更供查看；发布后核对线上结果 | 最后确认正式发布；此后可以按下面的流程写文章 | 本地通过、GitHub 部署成功、线上页面一致 |

这些步骤中，代码和检查由我完成。你主要负责看效果、用自己的账号进行日常内容操作，以及最后确认发布，不需要自己搭环境或写代码。

### 以后发一篇文章，你怎么操作

1. **在 Obsidian 写好正文。**只挑选决定公开的内容；私密草稿留在本地。
2. **有图片时先上传。**进入博客页脚的“写作工具”，点“上传图片”，打开 GitHub 的现有图片目录，上传本篇文章用到的图片。
3. **点“新建文章”。**在 GitHub 输入文件名，例如 `2026-09-08-learning-note.md`。文件名尽量简短，发布后尽量不改。
4. **粘贴内容和文章属性。**写作工具提供模板；如果 Obsidian 原稿已经有属性，就按模板检查，不重复粘贴两套属性。
5. **检查并保存。**核对标题、日期和图片地址后，在 GitHub 保存更改。写入 main 后，现有发布流程会自动开始；若仓库届时启用了分支保护，则按 GitHub 提示走合并流程。
6. **确认上线。**点“查看发布记录”，确认本次任务成功，再打开文章和图片。GitHub 编辑器里的预览不等同于博客最终排版。

参考模板如下，标题和日期均为示例，发布时按实际内容修改：

```markdown
---
title: 一次学习记录
published: 2026-09-08
description: 用一句话说明这篇文章的内容。
tags:
  - 学习
category: 随笔
---

从这里开始粘贴正文。

![图片说明](/images/learning-note.jpg)
```

首轮继续使用标准 Markdown 图片语法。`![[图片名]]` 要改成 `![说明](/images/图片名)`；`[[另一篇笔记]]` 改为已公开文章的普通链接，尚未公开的笔记先写成普通文字。本轮不修改你的整个 Obsidian 库，也不承诺自动转换所有插件语法。

如果文章和多张图片需要一次保存，可以从写作工具打开免费的 `github.dev`，在那里一起整理并提交。它只是浏览器编辑器，本方案不使用 Codespaces。

### 修改已有文章、外观和处理错误

**修改文章：**打开文章 → 点击“在 GitHub 编辑” → 修改并保存 → 查看发布记录。即使文章网址与文件名不同，按钮也必须打开真实源文件。

**修改外观：**写作工具 → “调整外观” → GitHub 打开配置文件。可调整的颜色和首页图片放在文件顶部，并写中文注释。只改指定项，保存后自动发布；没有图片时首页依然完整。首轮不需要专门制作大背景图。

**发布失败：**旧版本通常继续提供访问，新内容不会因为“保存成功”就被误称为已经上线。查看失败的发布任务，修正后重新保存；必要时在 GitHub 撤销对应更改并重新部署。私密内容若误提交公开仓库，普通撤稿不能清除 Git 历史，应另行处理，不能只改 `draft`。

### 这轮不做什么

不做私密后台、云端草稿、在线人数、博客 PV/UV、发布前 AI 审核和新的评论服务。现有内容统计、构建状态、RSS、收藏及工具继续保留。GitHub 仓库 Traffic 是仓库访问，不当作博客流量。

### 你验收时，只需要检查这些结果

- 首页容易找到文章和随记，LOGO 还是原来的 LOGO。
- 文章标题不重复，手机没有横向滚动；目录能跳到正确位置，文字不被顶部导航挡住。
- “新建文章”“编辑本文”“上传图片”“发布记录”都指向你的 GitHub 仓库。
- 只出现在正文中的关键词能被搜索到；私密草稿不进入公开搜索。
- 原文章地址、图片、RSS、收藏、深浅色和主要工具仍可用。
- 没有要求你新买服务、建立数据库、设置令牌或维护额外服务器。

---

## 第二部分：给实施者的明确任务

### 文件边界与执行顺序

预计新增的应用源码仅为 `src/pages/write.astro`、`src/utils/githubAuthoring.ts` 和构建端的 `src/utils/searchText.ts`。其它修改落在已有组件、配置和测试中。若实现时发现必须新增更多模块，先判断是否能复用，不能借机扩展范围。

任务 1 和任务 4 的独立文件可以并行；任务 2、3 都涉及文章页与站点配置，必须顺序整合。任何会写入内容 fixture、`.env` 或 `dist` 的构建测试只能串行执行。

实施开始先运行 `git status --short`，记录现有未提交文件，保留本轮评估和计划文档。应用变更放在独立分支或现有隔离工作区；不清理、不覆盖用户修改。保存原 LOGO 文件摘要，完成后比较，证明未替换。

### Task 1：复用组件，整理首页、导航和页脚

**Files — Modify:**

- `src/config/navigation.ts`
- `src/components/NavBar.astro`
- `src/components/GlobalTools.astro`
- `src/components/PortalFooter.astro`
- `src/layouts/Layout.astro`
- `src/components/home/PortalHome.astro`
- `src/components/home/HomeHero.astro`
- `src/components/home/ActivityStream.astro`
- `src/utils/homeModel.ts`
- `src/config/site.ts`（“说说”相关展示文字同步为“随记”，地址不变）

**Interfaces:** 保留 `NavigationGroups`、`isNavigationActive()`、`buildHomeModel()` 和 `PortalHome` 的现有调用；给 `HomeModel` 增加 `talks: PortalIndexEntry[]`。`ActivityStream` 增加可选的 `title`、`description`，默认值仍兼容旧用途。

- [x] **Step 1：按下列配置调整导航，保留三组数据结构。**

```ts
primary: [
  { href: '/posts', label: '文章', match: 'prefix' },
  { href: '/talks', label: '随记', match: 'prefix' },
  { href: '/about', label: '关于', match: 'prefix' },
],
explore: [
  { href: '/knowledge', label: '知识', match: 'prefix' },
  { href: '/projects', label: '项目', match: 'prefix' },
  { href: '/topics', label: '专题', match: 'prefix' },
  { href: '/archive', label: '归档', match: 'prefix' },
  { href: '/now', label: '近况', match: 'prefix' },
  { href: '/changelog', label: '更新记录', match: 'prefix' },
  { href: '/favorites', label: '收藏', match: 'prefix' },
  { href: '/explore', label: '随机看看', match: 'prefix' },
  { href: '/lab', label: '工具', match: 'prefix' },
],
connect: [
  { href: '/friends', label: '友链', match: 'prefix' },
],
```

桌面下拉标题改为“更多”。LOGO 保持链接 `/`。`GlobalTools` 仅显示搜索与主题按钮；保留这两项的现有事件与主题初始化，不删除手机需要的能力。

- [x] **Step 2：保持同一份 GlobalTools 在桌面和手机可访问，移除手机第二排知识/AI 快捷导航。**

把现有 `GlobalTools` 移到公共的顶栏区域，搜索/主题使用 44px 触控目标，手机上缩短文字或使用已有图标。继续使用原 `MobileNav` 菜单及焦点锁定，不新增抽屉实现。同步缩小 `Layout` 顶部留白，检查原固定导航及锚点滚动偏移。

- [x] **Step 3：输出真实随记并重排首页。**

```ts
// HomeModel 新增属性，buildHomeModel 返回时保留传入的公开随记。
talks: input.talks,
```

`PortalHome` 保留现有 HomeHero 和文章列表，文章区增加稳定标记 `id="recent-posts"`。在其后复用：

```astro
{model.talks.length > 0 && (
  <ActivityStream
    entries={model.talks.slice(0, 3)}
    title="最近随记"
    description="简短记录此刻的想法。"
  />
)}
```

ActivityStream 保留 `id="recent-activity"` 和真实条目链接。不能直接把混合 `model.recent` 改名为随记。首页移出 PortalPulse、StartHereGrid、KnowledgeMap、FocusPanel、ProjectShelf、ExploreDock、PortalToolbox；组件和对应独立页面保留。首页无文章时显示一句真实空状态和关于/随记入口。

- [x] **Step 4：压缩 Hero 和页脚。**

Hero 使用现有 identity，只保留一个“浏览文章”主入口，链接 `/posts`；介绍区域不再承担知识库和 AI 推广。页脚使用普通链接呈现 RSS、关于、友链、隐私和工具，没有大面积导览卡片。`/write` 入口与任务 3 的页面一起加入，避免本阶段产生坏链接。全站名称与原 LOGO 不变。

- [x] **Step 5：调整现有验证中与旧布局绑定的断言。**

涉及 `tests/unit/navigation-config.test.ts`、`tests/unit/home-model.test.ts`、`tests/navigation-build.test.mjs`、`tests/home-portal-build.test.mjs`、`tests/home-components-build.test.mjs` 和 `tests/production-build.test.mjs`。只替换“九大区块/首页所有工具/旧主导航”断言，保留有效链接、真实数据、无外部运行期请求与键盘行为保护。

首页顺序的核心断言应改为：

```js
const identity = html.indexOf('id="identity"');
const posts = html.indexOf('id="recent-posts"');
const talks = html.indexOf('id="recent-activity"');
assert.ok(identity >= 0 && posts > identity && talks > posts);
assert.doesNotMatch(html, /id="portal-pulse"|id="portal-tools"/);
```

用有文章和随记的 fixture 验证上述顺序；对空集合保留独立空状态断言，不以空数据错误要求随记区存在。

**阶段结果：**首页及手机导航可以独立预览，已有页面仍可找到。此时不发布线上。

### Task 2：用现有布局开关改善阅读，并提供少量外观配置

**Files — Modify:** `src/pages/posts/[id].astro`、`src/config/site.ts`、`src/layouts/Layout.astro`、`src/index.css`、`src/components/home/HomeHero.astro`。

**Interfaces:** 复用 `Layout.hidePageBanner`、`render(articleEntry).headings`、`.article-paper`、`.prose`。不改 Markdown 渲染插件或代码高亮库。

- [x] **Step 1：文章页传入 `hidePageBanner`，保留正文自身的 h1 与日期等元信息。**

```astro
<Layout
  title={post.title}
  description={post.description}
  isArticle
  hidePageBanner
  post={{ title: post.title, date: post.date, dateISO: post.dateISO, keywords: post.keywords }}
>
  <!-- 原文章内容及功能保留，只调整外层布局。 -->
</Layout>
```

上述展示新增参数的位置，原有其它必要参数仍保留。移除文章页左日历栏及其空占位；日历组件和 `/calendar` 不动。文章列宽控制在约 720–800px。

- [x] **Step 2：只在有有效标题时渲染目录，手机复用同一份 toc。**

保留桌面现有目录循环，在整个容器外加 `toc.length > 0`。手机在正文前用原生 `<details>` 渲染同一目录：

```astro
{toc.length > 0 && (
  <details class="lg:hidden" data-mobile-toc>
    <summary>本文目录</summary>
    <nav aria-label="本文目录">
      {toc.map((item) => <a href={`#${item.id}`}>{item.text}</a>)}
    </nav>
  </details>
)}
```

保留标题 id，不新增第二套滚动高亮监听。文章页与 `ArticleEnhancements` 已各有一部分增强脚本，若验收发现重复复制按钮或高亮冲突，只合并冲突点，不扩展重构范围。

- [x] **Step 3：在 `site.ts` 顶部新增有限外观配置。**

```ts
export const appearanceConfig = {
  // 页面浅色背景
  backgroundColor: '#f7f5ef',
  // 普通卡片浅色背景
  surfaceColor: '#fffdf8',
  // 文章阅读区浅色背景
  articleColor: '#fffdf8',
  // 首页图片仅填写本站 /images/ 路径；留空则不显示。
  homeImage: '',
} as const;
```

Layout 将前三项通过普通 `style` 属性注入 CSS 变量；变量名固定为 `--site-background`、`--site-surface`、`--article-background`。使用前校验颜色是六位十六进制值，图片非空时必须是 `/images/` 开头的本地路径。用 Astro 常规属性输出，不拼接可执行 HTML。

```ts
const colors = [appearanceConfig.backgroundColor, appearanceConfig.surfaceColor, appearanceConfig.articleColor];
if (colors.some((value) => !/^#[0-9a-f]{6}$/i.test(value))) {
  throw new Error('外观颜色必须填写 # 加六位十六进制颜色值');
}
if (appearanceConfig.homeImage && !appearanceConfig.homeImage.startsWith('/images/')) {
  throw new Error('首页图片必须使用本站 /images/ 路径');
}
```

将 `.article-paper-shell`、`.article-paper` 现有浅色背景和纹理改为上述变量；保留深色覆盖。正在调整的首页卡片使用同一表面色，不为所有旧工具页进行全量颜色替换。

- [x] **Step 4：若 `homeImage` 非空，在 HomeHero 渲染一张限高图片；为空时不渲染图片占位。**

```astro
{appearanceConfig.homeImage && (
  <img src={appearanceConfig.homeImage} alt="" class="mt-4 max-h-48 w-full object-cover" />
)}
```

此图片为装饰性首页图，文章插图仍必须有对应说明。减轻当前修改区域的边框、阴影和过重字重。保持 LOGO 源文件及 `.article-paper`、`.prose` 类名。

- [x] **Step 5：用现有阅读与无障碍测试验证功能，并完成桌面/手机视觉检查。**

调整 `tests/accessibility-build.test.mjs` 中“文章页必须有日历”的旧断言，日历本身的可访问性检查移至保留日历的页面。`tests/reading-enhancements-build.test.mjs` 保留进度、分享、返回顶部等验证。短文无目录框，长文桌面/手机目录跳转有效；原有复制代码、灯箱和暗色模式可用。

**阶段结果：**首页、短文和长文形成统一且较轻的阅读风格，用户可直观看到原版与新版差异。

### Task 3：增加写作工具，复用 GitHub 的编辑和发布能力

**Files — Create:** `src/utils/githubAuthoring.ts`、`src/pages/write.astro`、`tests/unit/github-authoring.test.ts`。

**Files — Modify:** `src/config/site.ts`、`src/components/PortalFooter.astro`、`src/pages/posts/[id].astro`、`tests/site-url-slug.test.mjs`、`tests/production-build.test.mjs`。

**Interfaces:** 链接工具是纯函数，显式接收仓库配置，不请求 API、不保存登录状态。避免在单元测试导入含 `import.meta.env` 的站点配置。

- [x] **Step 1：在 site.ts 增加仓库配置，并先编写链接行为测试。**

```ts
export const githubAuthoringConfig = {
  owner: 'SunTBurst',
  name: 'SunTBurst.github.io',
  branch: 'main',
  workflow: 'deploy-pages.yml',
} as const;
```

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { githubContentEditUrl } from '../../src/utils/githubAuthoring';

const repo = { owner: 'SunTBurst', name: 'SunTBurst.github.io', branch: 'main', workflow: 'deploy-pages.yml' };

test('编辑链接按真实文件路径编码，不按文章网址猜测', () => {
  const url = githubContentEditUrl(repo, 'src/content/posts/笔记/学习 #1.md');
  assert.equal(url, 'https://github.com/SunTBurst/SunTBurst.github.io/edit/main/src/content/posts/%E7%AC%94%E8%AE%B0/%E5%AD%A6%E4%B9%A0%20%231.md');
  assert.equal(githubContentEditUrl(repo, '../secret.md'), null);
  assert.equal(githubContentEditUrl(repo, 'src/content/posts/../../secret.md'), null);
  assert.equal(githubContentEditUrl(repo, 'C:/private.md'), null);
  assert.equal(githubContentEditUrl(repo, undefined), null);
});
```

Run：`node --import tsx --test tests/unit/github-authoring.test.ts`。首次应因文件或导出尚不存在而失败；实现后必须通过。

- [x] **Step 2：实现限定用途的链接工具。**

```ts
export interface GitHubAuthoringConfig {
  owner: string;
  name: string;
  branch: string;
  workflow: string;
}

const encodePath = (value: string) => value.split('/').map(encodeURIComponent).join('/');
const repoBase = (repo: GitHubAuthoringConfig) =>
  `https://github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;

export function githubContentEditUrl(repo: GitHubAuthoringConfig, filePath?: string): string | null {
  if (!filePath) return null;
  const normalized = filePath.replaceAll('\\', '/');
  if (!/^src\/content\/(posts|talks|knowledge|projects|updates)\/.+\.md$/u.test(normalized)) return null;
  if (/[\u0000-\u001f\u007f]/u.test(normalized)) return null;
  if (normalized.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  return `${repoBase(repo)}/edit/${encodeURIComponent(repo.branch)}/${encodePath(normalized)}`;
}

export function githubAuthoringLinks(repo: GitHubAuthoringConfig) {
  const base = repoBase(repo);
  const branch = encodeURIComponent(repo.branch);
  return {
    newPost: `${base}/new/${branch}/src/content/posts`,
    newTalk: `${base}/new/${branch}/src/content/talks`,
    posts: `${base}/tree/${branch}/src/content/posts`,
    talks: `${base}/tree/${branch}/src/content/talks`,
    images: `${base}/upload/${branch}/public/images`,
    appearance: `${base}/edit/${branch}/src/config/site.ts`,
    publication: `${base}/actions/workflows/${encodeURIComponent(repo.workflow)}`,
    editor: `https://github.dev/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`,
    currentVersion: '/status',
  };
}
```

配置路径均是固定白名单，不把 helper 扩展成任意文件写入工具。新建链接只打开目录，不将用户正文放进 URL，也不预设会与现有文章重名的文件名。

- [x] **Step 3：实现 `/write` 静态工具页。**

使用现有 Layout，设置 `title="写作工具"`、`hidePageBanner`、`robots="noindex,nofollow"`。按“写作、图片与外观、发布”分组展示上述普通链接，并在现有页脚加入“写作工具”链接。提供文章和随记模板的只读文本框，可手动复制；需要自动复制时，复用项目现有 clipboard 成功/失败处理方式，失败则选中文本并提示手动复制，不另建编辑器组件。

模板使用 `description: ""` 而不是空值 `description:`，避免违反现有字符串 schema。日期使用现有 `calendarDate()`：构建时生成默认值，浏览器打开页面时以利雅得当天日期更新只读模板的 `published` 行；提示发布前核对日期。新文章模板不添加 `draft: true`，避免让用户误以为公开仓库中的草稿保密。

页面明确写明：编辑和保存由 GitHub 完成；本页不验证博主身份，也不保存正文或凭据。评论和访问统计不作为本轮配置任务。`/write` 不加入公开内容索引、RSS、sitemap 和随机漫游。

- [x] **Step 4：将文章页编辑链接接到 `articleEntry.filePath`。**

```astro
---
// 在原文章页 frontmatter 中接入，articleEntry 是页面已经查到的原始条目。
import { githubAuthoringConfig } from '../../config/site';
import { githubContentEditUrl } from '../../utils/githubAuthoring';
const editUrl = githubContentEditUrl(githubAuthoringConfig, articleEntry.filePath);
---
{editUrl && <a href={editUrl} target="_blank" rel="noopener noreferrer">在 GitHub 编辑</a>}
```

不使用 `post.id` 或 `post.slug` 拼路径：Astro 的 id 也可能来自 frontmatter.slug。写作工具的文章目录入口足以覆盖随记和其它条目，首轮不在每一种详情页重复增加按钮。

- [x] **Step 5：验证链接、源文件映射及工具页边界。**

在既有 `tests/site-url-slug.test.mjs` 自定义 slug fixture 中补充：

```js
assert.match(customPost, /github\.com\/SunTBurst\/SunTBurst\.github\.io\/edit\/main\/src\/content\/posts\/site-url-slug-fixture\.md/);
```

在生产构建验证中检查 `/write/index.html` 存在、带 noindex，链接指向正确仓库、目录和工作流；通用索引里没有 `/write`。实际浏览器打开新建、编辑、图片上传、Actions 链接，停在正确页面，不为验收提交远程内容。

**阶段结果：**用户可从博客进入常用 GitHub 操作。访客打开工具页也不能直接改写博主仓库；页面不声称是私密后台。

### Task 4：复用现有搜索，加入公开正文

**Files — Create:** `src/utils/searchText.ts`、`tests/unit/full-text-search.test.ts`。

**Files — Modify:** `src/utils/portalIndex.ts`、`src/pages/search.astro`、`src/components/UnifiedSearch.svelte`、`src/utils/unifiedSearchCore.ts`、`src/utils/postBrowserCore.ts`、`src/pages/posts.astro`、`tests/unit/post-browser.test.ts`、`tests/unit/browser-storage.test.ts`、`tests/draft-publication.test.mjs`。

**Interfaces:** 通用 `PortalIndexEntry` 和 `/portal-index.json` 不变。只在搜索页面传 `searchTextById: Record<string, string>`；主要文章列表的 `PublicPostBrowseEntry` 新增可选 `searchText?: string`。

- [x] **Step 1：先写能证明新行为的测试。**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSearchText } from '../../src/utils/searchText';
import { matchesPortalSearch } from '../../src/utils/unifiedSearchCore';

test('正文深处和代码块的内容可以检索，图片地址不作为正文', () => {
  const source = '普通内容。'.repeat(60)
    + '\n正文深处独有检索词\n\n```ts\nconst BODY_CODE_ONLY_9F = 1;\n```\n'
    + '![配图](/images/private-filename-marker.png)';
  const body = extractSearchText(source);
  const entry = { title: '普通文章', description: '普通摘要', kind: 'post', topics: [] };
  assert.equal(matchesPortalSearch(entry, '正文深处独有检索词', body), true);
  assert.equal(matchesPortalSearch(entry, 'body_code_only_9f', body), true);
  assert.equal(matchesPortalSearch(entry, '没有这个词', body), false);
  assert.doesNotMatch(body, /private-filename-marker/);
});
```

Run：`node --import tsx --test tests/unit/full-text-search.test.ts`。先确认新行为尚不可用，再实施。

- [x] **Step 2：用已安装的 markdown-it 在构建端提取文字。**

```ts
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const markdown = new MarkdownIt({ html: true, linkify: false });
const plainHtmlOptions: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {} };
interface SearchToken { type: string; content: string; children?: SearchToken[] | null }

export function extractSearchText(source: string): string {
  const parts: string[] = [];
  function collect(tokens: SearchToken[]) {
    for (const token of tokens) {
      if (token.type === 'image') continue;
      if (['text', 'code_inline', 'code_block', 'fence'].includes(token.type)) parts.push(token.content);
      else if (token.type === 'html_inline' || token.type === 'html_block') {
        parts.push(sanitizeHtml(token.content, plainHtmlOptions));
      }
      else if (token.children) collect(token.children);
    }
  }
  collect(markdown.parse(source, {}) as SearchToken[]);
  return parts.join(' ').replace(/\s+/gu, ' ').trim();
}
```

此文件只被 Astro frontmatter、构建工具和测试引用，不进入浏览器公共工具模块。不要复用会整段删除 fenced code 的 `plainTextSummary()` 来冒充完整正文提取。实施验证发现 `html: false` 会将部分 HTML 图片属性拆成 Markdown 强调 token，因此改用 HTML token 识别，并以已有 sanitize-html 提取可见文字；这里只提取索引，不渲染 HTML，代码 token 仍保留原文。

- [x] **Step 3：在 portalIndex.ts 构建独立正文字典，只使用既有公开过滤函数。**

```ts
// 补充 getPublishedPosts/getPublishedTalks 以及 extractSearchText 的导入。
export async function buildPortalSearchText(): Promise<Record<string, string>> {
  const collections = await Promise.all([
    getPublishedPosts(), getPublishedTalks(), getPublishedKnowledge(),
    getPublishedProjects(), getPublishedUpdates(),
  ]);
  const prefixes = ['post', 'talk', 'knowledge', 'project', 'update'];
  return Object.fromEntries(collections.flatMap((entries, index) =>
    entries.map((entry) => [`${prefixes[index]}:${entry.id}`, extractSearchText(entry.body ?? '')] as const),
  ));
}
```

保持与 `buildPortalIndex()` 相同的条目 id。首页、漫游、统计和 `/posts-data.json` 不调用或序列化该字典。

- [x] **Step 4：复用原检索逻辑，加入正文匹配。**

在浏览器安全的 `unifiedSearchCore.ts` 增加：

```ts
import { normalizeSearchText } from './portalIndexCore';

export function matchesPortalSearch(
  entry: { title: string; description: string; kind: string; topics: string[] },
  query: string,
  body = '',
): boolean {
  return normalizeSearchText([entry.title, entry.description, entry.kind, ...entry.topics, body].join(' '))
    .includes(normalizeSearchText(query));
}
```

`search.astro` 获取元数据和字典，将两者传给现有 `UnifiedSearch`；组件只替换原 `.filter()` 谓词：

```ts
export let searchTextById: Record<string, string> = {};
$: results = normalized
  ? entries.filter((entry) => matchesPortalSearch(entry, normalized, searchTextById[entry.id] ?? ''))
  : entries;
```

结果仍显示现有标题和摘要，不输出原始 HTML。保留 `?q=`、中文输入法处理、方向键、原生 Enter、空结果与收藏逻辑；搜索标签改为“搜索标题、正文或标签”。

- [x] **Step 5：主要文章列表同步支持正文，旧分类页保持范围清楚。**

给 `PublicPostBrowseEntry` 增加 `searchText?: string`；`browsePosts()` 原检索字段数组末尾加入 `post.searchText ?? ''`。`posts.astro` 在已有公开文章投影中添加 `searchText: extractSearchText(post.content)`。保留 PostBrowser 的筛选和分页。

扩展 `tests/unit/post-browser.test.ts`，构造正文独有词并与分类/标签条件一起查询。分类、标签旧列表暂不改数据链；其搜索提示若可能被误解为全文检索，标注为标题、摘要或标签筛选，并保留全站搜索入口。

- [x] **Step 6：保护草稿、收藏及精简索引。**

在现有 `tests/draft-publication.test.mjs` 中让五类草稿的正文带唯一词，并检查 `/search/index.html` 不包含这些词。使用已有 fixture 生命周期，不另建测试框架。

在 `tests/unit/browser-storage.test.ts` 增加带 `searchText`、`content` 的输入，断言规范化结果只包含原来的 `href/title/kind/savedAt`。`tests/portal-index-build.test.mjs` 继续通过，通用索引及 legacy payload 不增加正文。

**阶段结果：**正文词和代码中的标识符能检索，所有数据仍来自已公开内容，主要访客页面不承担额外正文数据。

### Task 5：更新使用说明，完成适量验证并交付本地预览

**Files — Modify:** `README.md`；前四个任务涉及的既有测试。原则上不修改 `.github/workflows/deploy-pages.yml`、`package.json` 或锁文件。

- [x] **Step 1：更新 README 中的写作和功能状态。**

写清 `/write` 的作用、GitHub 保存与发布的区别、图片路径、私密草稿放 Obsidian、外观配置位置、搜索范围和本轮不启用的外部服务。仍可保留本地开发命令，但不要让日常发帖依赖用户运行它们。

- [x] **Step 2：合并独立改动后执行检查。**

优先使用项目原命令 `pnpm lint` 与 `pnpm test`，且遵守 packageManager 指定版本。若机器全局 pnpm 与项目不同，在依赖已安装且无需更新的情况下可使用以下等价本地命令，避免为测试额外下载或安装：

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --import tsx --test tests/unit/*.test.ts
node --test --test-concurrency=1 tests/*.test.mjs
```

本次影响全局导航、Layout 和页脚，因此在集成末尾运行既有完整回归集一次。阶段内只运行当前逻辑相关单测，不在每一步重复全套构建。构建类测试存在共享输出和 fixture，不能并行运行。

- [x] **Step 3：重新生成用于展示的正式构建，并启动本地预览。**

```powershell
$env:PUBLIC_SITE_URL = 'https://suntburst.github.io'
node node_modules/astro/bin/astro.mjs build
node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port 3000
```

记录并在退出预览时恢复此前环境变量设置。最后这次构建用于消除测试使用的站点地址及临时输出；不执行 `profile:refresh` 或额外服务部署。服务在后台运行，不弹出新的终端窗口。

- [x] **Step 4：检查真实页面。**

浏览首页、文章列表、短文、含目录/图片/代码的长文、搜索和写作工具。使用 1440×900 和 390×844 两种尺寸；验证触控目标、手机菜单焦点、主题保存、无横向溢出、文章标题位置、目录锚点和图片展示。长文使用本地临时 fixture，交付前移除并重建；不把测试文章推到线上。

实际打开 GitHub 链接只检查真实文件位置、上传目录与工作流页面，不进行远端写入。遇到登录要求时记录该状态，交由用户使用现有账号；不为了测试退出用户账号或创建新授权。检查本地工具页没有 GitHub 写 API、令牌输入框或自建登录逻辑。

- [x] **Step 5：提供可审阅结果。**

展示首页和文章页截图、本地预览地址、变更文件清单、验证结果及上述用户操作说明。逐项对照第一部分的验收结果。复核 LOGO 摘要、旧文章 URL、RSS 和工作区状态，清理本任务临时 fixture，不改用户其它文件。

**阶段结果：**可用的本地改版和完整验证证据已交付；此时尚未改变线上网站。

### Task 6：批准发布后沿用现有 GitHub 流程

**Files:** 不预设新的工作流文件；使用 `.github/workflows/deploy-pages.yml`。

- [ ] **Step 1：在最终本地结果可审阅后，确认是否将这批修改发布到当前博客。**
- [ ] **Step 2：检查当前分支、远端 main 和待发布提交，按既有仓库流程提交/合并并推送。**不覆盖远端新提交，不强推；如有分支保护，使用相应 PR 流程。
- [ ] **Step 3：等待本次 Deploy to GitHub Pages 的构建与部署均完成。**成功推送不等于成功部署，失败时报告实际阶段。
- [ ] **Step 4：打开线上首页、旧文章、搜索和写作工具；核对页面功能、图片与当前部署版本。**新页面可能有缓存，核对实际版本后再宣称上线。
- [ ] **Step 5：交付线上链接和日常使用步骤。**说明该轮真实启用的功能及仍未启用的外部功能；完成必要验证后停止，不继续添加新模块。

**发布验收结果：**免费 GitHub 上的现有博客已呈现确认过的改版，写作入口可用、正文搜索有效、旧内容仍能访问，用户无需维护新服务。

## 方案核查记录

本方案依据现有源码完成了两条独立只读核对：首页/阅读与相关测试、写作源文件映射/正文搜索。已整合以下关键修正：随记必须有独立数据来源；编辑链接使用 `filePath`；正文不进入通用索引和收藏；现有构建测试串行执行。

本方案编制时未修改应用源码；随后已按计划完成本地实现及本轮验证，详见顶部实施状态与验收记录。当前尚未推送或部署。
