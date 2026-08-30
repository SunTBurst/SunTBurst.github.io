# TSun 的博客

这是一个使用 Astro 构建的个人静态博客，保留了原项目的 Toy Brick Brutalism（积木粗野主义）视觉风格。文章、说说、图片和站点信息都保存在本地文件中，构建后可交给 GitHub Pages 托管。

当前项目只是“可部署”状态，尚未创建远程仓库，也没有发布到互联网。AI、评论、访问统计、天气、随机图片、邮件订阅、音乐和在线状态等外部功能均未接入。

## 本地启动

需要 Node.js 22 或更高版本。打开 Visual Studio 的终端，进入本项目目录后运行：

```powershell
npx --yes pnpm@9.15.4 install --frozen-lockfile
npx --yes pnpm@9.15.4 dev
```

浏览器打开 `http://localhost:3000` 即可预览。以后依赖没有变化时，通常只需运行第二条命令。

## 写文章

文章放在 `src/content/posts/`，每篇文章是一个 `.md` 文件。例如：

```markdown
---
title: 我的第一篇文章
published: 2026-08-30
description: 这是一段文章摘要
tags:
  - 生活
  - 随笔
category: 日常
draft: false
---

这里开始写正文。

![图片说明](/images/example.jpg)
```

说说放在 `src/content/talks/`。`title` 可以不写，其余地点、天气和心情等字段也都是选填项：

```markdown
---
published: 2026-08-30T12:00:00+03:00
title: 今天的记录
tags:
  - 日常
location: Riyadh
weather: 晴
mood: 平静
device: 手机
draft: false
---

这是一条简短的说说。
```

图片放到 `public/images/`，在 Markdown 中统一写成 `/images/文件名`，不要使用 `./` 或 `../` 相对路径。第一阶段禁用了文章中的原始 HTML，请使用普通 Markdown 语法；Markdown 代码块仍可正常显示。

`draft: true` 的文章或说说不会进入公开页面、RSS 或 sitemap。

## 修改个人信息

- 站名、简介、作者和时区：修改 `src/config/site.ts`。
- 关于页内容：修改 `src/config/about.md`。
- 头像：替换 `public/images/avatar.svg`，或同时修改 `src/config/site.ts` 中的头像路径。

## 构建网站

正式构建前设置网站地址。可以复制 `.env.example` 为 `.env`，再把其中的地址改成自己的 GitHub Pages 地址；也可以在 PowerShell 中临时设置：

```powershell
$env:PUBLIC_SITE_URL = 'https://你的用户名.github.io'
npx --yes pnpm@9.15.4 build
```

构建结果位于 `dist/`。站点的 canonical、RSS、sitemap 和 robots 地址都会使用同一个 `PUBLIC_SITE_URL`。

## 最后部署到 GitHub Pages

准备公开发布时，再手工完成以下步骤：

1. 在 GitHub 新建一个公开仓库，名称必须是 `<你的用户名>.github.io`，不要勾选自动创建 README。
2. 在本项目根目录添加远程仓库并推送 `main`：

   ```powershell
   git remote add origin https://github.com/<你的用户名>/<你的用户名>.github.io.git
   git push -u origin main
   ```

3. 打开仓库的 `Settings` → `Pages`，将发布来源选择为 `GitHub Actions`。
4. 打开仓库的 `Actions` 页面，等待 `Deploy to GitHub Pages` 工作流完成。完成后访问 `https://<你的用户名>.github.io`。

本地准备阶段不会替你创建 GitHub 仓库、推送代码或发布网站。

## 来源说明

视觉和代码骨架来源于 [ImUpXuu/xuhome](https://github.com/ImUpXuu/xuhome)，详细边界见 `UPSTREAM_NOTICE.md`。本仓库没有复制原作者的文章、说说或个人图片；正式公开前仍应确认上游许可证文本或获得明确授权。
