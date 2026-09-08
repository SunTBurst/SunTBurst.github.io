# SunTBurst 个人门户

这是一个使用 Astro 构建、由 GitHub Pages 免费托管的个人博客。保留原有 TS 标识和蓝黄配色，以浅色纸面承载正文。首页集中展示介绍、最近文章和随记；知识、项目、归档等原页面可从“更多”进入。

站点默认公开地址为 `https://suntburst.github.io`。内容保存在当前 GitHub 仓库中，通过已有 GitHub Actions 工作流发布；日常写作不需要运行本地命令、填写访问令牌或搭建新服务器。本轮没有启用新的评论、统计、AI 或订阅服务；相关功能的说明页以实际页面状态为准。

## 本地启动

需要 Node.js 22.12.0 或更高版本。打开 Visual Studio 的终端，进入本项目目录后运行：

```powershell
npx --yes pnpm@9.15.4 install --frozen-lockfile
npx --yes pnpm@9.15.4 dev
```

浏览器打开 `http://localhost:3000` 即可预览。以后依赖没有变化时，通常只需运行第二条命令。

## 从 GitHub 写文章

打开博客页脚的“写作工具”（`/write`），即可找到新建文章、新建随记、编辑内容、上传图片、调整外观和查看发布记录的入口。工具页是公开的静态页面，真正的登录、编辑和保存权限由 GitHub 处理。

1. 在 Obsidian 或本地编辑器写好内容，只选择决定公开的部分。
2. 有图片时先用“上传图片”将文件放入 `public/images/`。
3. 复制工具页提供的文章或随记模板，打开相应的新建入口，输入简短的 `.md` 文件名并粘贴内容。模板日期按利雅得时区生成，发布时仍需核对标题、日期和图片路径。
4. 在 GitHub 保存更改。写入 `main` 后会自动开始发布；如果启用了分支保护，按 GitHub 的提示提交并合并更改。
5. 打开“查看发布记录”，确认对应的 `Deploy to GitHub Pages` 任务成功，再检查博客里的文章和图片。

GitHub 保存成功只表示文件已经保存，不表示博客已经上线。发布失败时，先查看任务日志并修正内容；旧版本通常仍可访问。GitHub 编辑器的预览也不等同于博客的最终排版。

修改已有文章时，可从文章页点击“在 GitHub 编辑”，直接打开真实源文件。多篇文章或多张图片需要一起整理时，工具页也提供免费的 `github.dev` 浏览器编辑器入口。

## 内容格式

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

随记放在 `src/content/talks/`。`title` 可以不写，其余地点、天气和心情等字段也都是选填项：

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

这是一条简短的随记。
```

图片放到 `public/images/`，在 Markdown 中统一写成 `/images/文件名`，不要使用 `./` 或 `../` 相对路径。文章中的原始 HTML 被禁用，请使用普通 Markdown 语法；Markdown 代码块仍可正常显示。

从 Obsidian 复制内容时，把 `![[图片名]]` 改为 `![说明](/images/图片名)`；把 `[[另一篇笔记]]` 改为公开文章的普通链接。尚未公开的笔记引用先写成普通文字。

`draft: true` 的内容不会进入博客的公开页面、搜索、RSS 或 sitemap，但公开仓库中的文件、草稿分支和提交历史仍可被查看。私密草稿留在本地 Obsidian，不要上传到公开仓库。误上传私密内容后，仅改 `draft` 或删除当前文件不能清除 Git 历史。

## 搜索

全站搜索（`/search`）支持公开文章、随记、知识、项目和更新记录的标题、摘要、标签及正文，包括代码块内的文字。主要文章列表（`/posts`）也支持正文搜索，并保留分类、标签筛选和分页。

分类及标签的旧列表只筛选标题、摘要和标签。正文搜索数据只随需要它的搜索页和文章列表输出，通用索引与本地收藏记录不保存整篇正文。

## 修改个人信息和外观

- 站名、简介、作者和时区：修改 `src/config/site.ts`。
- 关于页内容：修改 `src/config/about.md`。
- 头像：替换 `public/images/avatar.svg`，或同时修改 `src/config/site.ts` 中的头像路径。

“写作工具”中的“调整外观”会打开 `src/config/site.ts`。文件顶部的 `appearanceConfig` 集中设置页面背景、卡片/文章纸面颜色和可选的首页图片，并附中文注释。不设置首页图片也可以正常展示。

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
