# SunTBurst 博客本地改版验收记录

2026-09-08。Tasks 1–5 已完成，本地版本可以审阅；正式发布按实施方案 Task 6 等待最终确认。

本地预览：[首页](http://127.0.0.1:3000/) · [文章](http://127.0.0.1:3000/posts/hello-world/) · [搜索](http://127.0.0.1:3000/search) · [写作工具](http://127.0.0.1:3000/write)。预览服务仅监听本机。

## 已完成的变化

| 部分 | 最终行为 |
| --- | --- |
| 首页与导航 | 介绍、最近文章、真实随记；主要导航为文章、随记、关于，其余入口收进更多；页脚提供写作工具。 |
| 阅读 | 保留原 TS 标识和蓝黄配色，改为浅纸面；正文最大宽度 780px，标题不重复；长文按标题生成目录，手机可展开，短文不显示空目录。 |
| 写作 | 通过普通链接打开现有 GitHub 仓库的新建、编辑、图片上传、外观配置和发布记录；提供可复制模板；文章编辑使用实际源文件路径。 |
| 搜索 | 全站搜索及主要文章列表支持公开正文和代码；HTML/Markdown 图片属性不作为正文；通用索引、旧列表负载和收藏仍只保存简要信息。 |
| 日常操作 | 从页脚写作工具进入 GitHub，保存到主分支后查看发布记录，确认部署成功再检查博客。操作说明见 README。 |

## 验证结果

- 最终类型检查通过；完整单元测试 **118/118** 通过。
- 首轮完整 Node/构建回归运行 67 项，其中四条检查仍依赖旧首页区块、直达入口、动画位置或错误的文本边界。调整这些断言后，相关定向复测全部通过，原内容、安全、路由和可访问性要求保留。
- 最终生产构建与五类草稿泄漏检查再次通过；正式地址构建成功，输出 50 个页面。
- 独立任务审查与整分支审查均已关闭问题；最终代码审查结论为 APPROVE。
- 1440×900 与 390×844 实际页面检查通过：长短文章、图片加载与查看、代码展开/收起、唯一复制按钮、44px 复制触控区、目录跳转、无页面横向溢出、主题跨页保存。
- 1280×550 的更多菜单可以内部滚动，末尾友链可通过键盘到达，仍处于可视范围。手机菜单的焦点循环、Esc 关闭、焦点返回及滚动锁定通过。
- 仅出现在正文中的词及代码标识能返回目标文章；方向键和 Enter 可打开结果；正文与分类、标签的组合筛选及空状态通过。收藏保存后可在收藏页看到，本轮临时收藏已移除。
- 写作模板复制成功，日期为利雅得当天；只读属性、手机单列/电脑双列、深色模板背景通过检查。复制失败的选中文字回退已做源码检查，未人为改变浏览器权限来强制失败。
- 实际打开 GitHub 新建文章、已有文章编辑、图片上传和发布记录页面，确认文件与目录准确；没有输入或保存任何远端内容。

## 保留边界

原文章、随记、内容集合、旧 URL、RSS 和图片未改动。原标识文件 SHA256 为 `63CF8F9826D8ED4CB51E949C8AFB88EA094A9A0E3479FE4A66992C3DC762CE18`，交付文件与原文件一致。

未增加应用依赖、数据库、令牌、登录系统或托管服务；沿用当前 GitHub Pages/Actions。已有外部功能保持原状态。本地结果没有自动推送至现网。

私密草稿继续放在本地 Obsidian；公开仓库中的 `draft: true` 文件仍可被查看。保存文件不等于部署成功，发布结果以 GitHub Actions 为准。

临时长文、测试标签及测试路由已移除，并重新生成干净版本。源码改动保存在 `codex/minimal-github-blog` 独立分支，原工作区的评估和计划文件保留。

## 实施中的处理

- 将会修改同一批界面的任务合并处理，搜索和写作独立文件并行；共享构建与测试串行，避免临时内容相互干扰。
- 复用本机已安装的依赖，没有重新安装或改变锁文件。Windows 沙箱无法正常读取用户信息，确认原因后使用经过自动审批的本机权限完成测试。
- 文章原有两套复制按钮和目录监听存在冲突，只修正重复部分，保留现有代码折叠与阅读功能。
- 搜索提取由 Markdown/HTML token 识别处理，复用已有清理工具；图片属性与代码示例分别处理，避免用连续补正则的方式漏掉图片文件名。
- 按已确定的本地审阅与最终发布确认流程，保留分支和工作区；没有执行通用收尾流程中的自动合并、推送或清理。

这些处理均可在当前分支中审阅和撤回。最终发布仍需核对远端主分支、完成推送、等待 GitHub 部署并检查线上页面。

## 变更文件清单

下列清单包含本轮源码、测试、使用说明及方案文档；不包含本地截图和临时验收文件。

```text
README.md
docs/reviews/2026-09-08-blog-implementation.md
docs/reviews/2026-09-08-blog-reference-research.md
docs/reviews/2026-09-08-blog-review.md
docs/superpowers/plans/2026-09-08-minimal-github-blog.md
src/components/ArticleEnhancements.astro
src/components/GlobalTools.astro
src/components/NavBar.astro
src/components/PortalFooter.astro
src/components/PostBrowser.svelte
src/components/SearchablePosts.svelte
src/components/UnifiedSearch.svelte
src/components/home/ActivityStream.astro
src/components/home/HomeHero.astro
src/components/home/PortalHome.astro
src/config/navigation.ts
src/config/site.ts
src/index.css
src/layouts/Layout.astro
src/pages/posts.astro
src/pages/posts/[id].astro
src/pages/search.astro
src/pages/write.astro
src/utils/githubAuthoring.ts
src/utils/homeModel.ts
src/utils/portalIndex.ts
src/utils/postBrowserCore.ts
src/utils/searchText.ts
src/utils/unifiedSearchCore.ts
tests/accessibility-build.test.mjs
tests/draft-publication.test.mjs
tests/home-components-build.test.mjs
tests/home-portal-build.test.mjs
tests/knowledge-content-build.test.mjs
tests/navigation-build.test.mjs
tests/production-build.test.mjs
tests/reading-enhancements-build.test.mjs
tests/site-url-slug.test.mjs
tests/today-build.test.mjs
tests/unit/browser-storage.test.ts
tests/unit/full-text-search.test.ts
tests/unit/github-authoring.test.ts
tests/unit/home-model.test.ts
tests/unit/navigation-config.test.ts
tests/unit/post-browser.test.ts
tests/visual-pagination.test.mjs
```
