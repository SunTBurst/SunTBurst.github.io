# Web Blog CMS Implementation Plan

**Goal:** 在博客内完成登录、内容编辑发布、图片、权限和站点配置，数据库真实持久化。

**Architecture:** Astro 静态兼容与 Node 服务端双模式；Supabase GitHub Auth、限权数据库 RPC 和私有 Storage；工作副本和公开快照分离。

**Tech Stack:** Astro 6、Svelte 5、TypeScript、Supabase PostgreSQL/Storage、Node 22.12+。

**Spec:** `docs/superpowers/specs/2026-09-20-web-blog-cms-design.md`

## Global Constraints

- 保留 `src/config/appearance.ts`、`src/config/site.ts`、`src/index.css` 及主题素材中用户已有修改。
- 真实密钥不写入源文件、日志或测试；未配置服务不模拟成功。
- 使用现有 GitHub-only 登录选择；新成员默认无写权限。
- 公开读取只访问发布快照，草稿、私有知识和历史版本不能进入公开 HTML、索引或 RSS。
- 现有静态部署必须仍然可构建，服务器部署说明不得误称 GitHub Pages 可以运行后端。

## Task 1: 数据与权限

- [ ] 创建 `supabase/migrations/202609200001_blog_cms.sql`：profiles、documents、publications、revisions、settings、media、publication_media、audit_log。
- [ ] 实现 `cms_bootstrap_profile()`、`cms_save_document(p_document,p_expected_version)`、`cms_document_action(p_id,p_action,p_expected_version,p_revision_id)`、`cms_save_settings(p_settings,p_expected_version)`、`cms_set_member_role(p_user_id,p_role,p_active)`、`cms_register_media(p_id,p_name,p_mime,p_size)` RPC。
- [ ] pgTAP 证明匿名隔离、GitHub 身份、角色边界、并发、发布和媒体授权。

## Task 2: CMS 合约和网页后台

- [ ] `src/features/cms/types.ts` / `config.ts` 定义数据合约与公开连接配置。
- [ ] `src/services/cms/client.ts` 实现 Auth、RPC、受权查询、图片上传、导出。
- [ ] `src/components/cms/*` / `/admin` / `/account` 实现登录、列表、编辑、预览、媒体、版本、设置、成员和操作状态。
- [ ] 检验错误/冲突不会清空输入，导航不会静默丢失草稿。

## Task 3: 前台动态内容

- [ ] `src/services/cms/public.ts` 在完整版只读取公开数据库条目；静态模式保留原 Markdown，停用/撤回不回退旧文件。
- [ ] 内容集合、文章/随记/知识/项目动态路由和分页支持请求时读取；Markdown 使用安全渲染。
- [ ] 首页、分类、标签、搜索、RSS、sitemap 自动消费相同公开来源。
- [ ] `/media/[id]` 只返回有公开引用的私有桶图片。

## Task 4: 站点设置与部署

- [ ] Layout、导航、关于页和页脚消费数据库设置；接入后台入口。
- [ ] Astro Node 模式、启动脚本、环境示例、Dockerfile、部署和导入说明。
- [ ] 静态模式不暴露服务端凭据；配置错误显式报错。

## Task 5: 集成验收

- [ ] SQL 权限/生命周期测试，TypeScript 和现有测试回归，静态及服务器构建。
- [ ] 实库端到端验证发布、草稿隔离、撤回、设置和图片；浏览器检查后台。
- [ ] 独立安全/正确性审查，修复阻断问题；记录外部未具备资源。

## Progress

2026-09-20：确认当前仅有评论数据库、无 CMS。工作分支 `codex/web-blog-cms`；现有用户主题修改保持原状。Supabase 生产项目和新的服务器尚未由用户提供，独立开发继续。
