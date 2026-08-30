# SunTBurst 个人门户

这是一个使用 Astro 构建的个人公开门户，保留 Toy Brick Brutalism（积木粗野主义）视觉风格。文章、说说、公开知识、项目、更新、图片和站点信息都保存在本地文件中，并由 GitHub Pages 托管。

站点默认公开地址为 `https://suntburst.github.io`。AI、访问统计、邮件订阅、音乐和服务状态目前是无网络请求的 preview，只说明用途、配置要求和隐私边界，不提供虚构数据或不可用表单。

## 本地启动

需要 Node.js 22.12.0 或更高版本。打开 Visual Studio 的终端，进入本项目目录后运行：

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

正式构建默认使用 `https://suntburst.github.io`。预览其他部署地址时，可以复制 `.env.example` 为 `.env` 后修改，或在 PowerShell 中临时覆盖：

```powershell
$env:PUBLIC_SITE_URL = 'https://preview.example'
npx --yes pnpm@9.15.4 build
```

构建结果位于 `dist/`。站点的 canonical、RSS、sitemap 和 robots 地址都会使用同一个 `PUBLIC_SITE_URL`。

## 部署到 GitHub Pages

需要重新配置 GitHub Pages 时，可检查以下步骤：

1. 确认公开仓库名称和 Pages 地址与 `suntburst.github.io` 配置一致。
2. 打开新仓库的 `Settings` → `Pages`，将发布来源选择为 `GitHub Actions`。
3. 在本项目根目录添加远程仓库并推送 `main`：

   ```powershell
   git remote add origin https://github.com/suntburst/suntburst.github.io.git
   git push -u origin main
   ```

4. 打开仓库的 `Actions` 页面，等待 `Deploy to GitHub Pages` 工作流完成；完成后访问 `https://suntburst.github.io`。

本地命令不会自动创建远程仓库或推送代码。

## 来源说明

视觉和代码骨架来源于 [ImUpXuu/xuhome](https://github.com/ImUpXuu/xuhome)，详细边界见 `UPSTREAM_NOTICE.md`。本仓库没有复制原作者的文章、说说或个人图片；正式公开前仍应确认上游许可证文本或获得明确授权。
