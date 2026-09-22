# 网页博客后台：运行和上线

## 现在的架构

完整版由 Astro Node 网站服务器和 Supabase（GitHub 登录、PostgreSQL 数据库、私有图片桶）组成。GitHub 继续保存源代码。GitHub Pages 只作为旧静态版发布通道，不能直接运行这个服务器。

默认 `CMS_ENABLED=false` 时仍可构建现有静态网站。`CMS_ENABLED=true` 时首页、文章、分类、标签、搜索、知识、项目、RSS 和 sitemap 在请求时读取公开数据库快照，发布后不需要再修改 GitHub 文件或构建网站。完整版的文章、随记、知识和项目只以数据库为准；仓库文件不会自动覆盖或恢复已撤回内容。

## 第一次准备

1. 创建 Supabase 项目；记录 Project URL 和 publishable/anon key。网站只需要这两个公开值，不需要 service-role key。
2. 在 GitHub Developer settings 创建 OAuth App，callback 使用 Supabase Authentication / GitHub 页面显示的地址。GitHub OAuth Client Secret 只保存在 Supabase 控制台。
3. Supabase Auth 只启用 GitHub；关闭 email、phone、anonymous 和其他 provider。Site URL 设为实际新网站地址，Redirect URLs 精确加入 `https://你的域名/admin/`。
4. 首次登录的 GitHub 数字 ID `105589585`（SunTBurst）会成为 owner。其他人首次登录成为 member；owner 可在后台授予 editor/admin。任何人都不能通过网页将自己提升为 owner。
5. 选择 Node 22.12+ 的服务器或容器托管。网站的域名与 Supabase 回调白名单确定后才能做真实登录验收。

## 数据库安装

Node 22.12+，本地开发另需 Docker Desktop。依赖锁定在 `pnpm-lock.yaml`：

```powershell
pnpm install --frozen-lockfile
pnpm supabase login
pnpm supabase link --project-ref <你的项目标识>
pnpm supabase db push --dry-run
pnpm supabase db push
```

`--dry-run` 应只显示仓库尚未安装的评论/CMS 迁移。不要使用 `db reset --linked`，它会清空远端数据。全新数据库需要按顺序应用全部迁移，因为 CMS 发布需要同步既有评论目标表。

本地验证可运行 `pnpm supabase start`，然后 `pnpm supabase migration up` 和 `pnpm comments:test-db`。SQL 测试使用事务并回滚测试数据。GitHub OAuth 本地登录仍需要你自己的 OAuth App 配置；测试不会注入生产登录后门。

## 运行网站

在本机或服务器将 `.env.example` 复制为 `.env`，填写：

```dotenv
CMS_ENABLED=true
PUBLIC_SITE_URL=https://你的域名
PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的公开publishable-key
PUBLIC_COMMENTS_STATE=preview
```

`.env` 已被 Git 忽略。PUBLIC key 本来就是客户端配置；service-role、OAuth secret、AI key 永远不填入这些 PUBLIC 变量。`PUBLIC_SITE_URL` 在构建时决定 canonical/RSS 域名，换域名后要重新构建。

```powershell
pnpm dev
# 或生产运行
pnpm cms:build
pnpm cms:start
```

开发默认 `http://localhost:3000/admin/`。生产默认 `http://localhost:4321/admin/`，正式访问应由托管平台提供 HTTPS。`HOST`/`PORT` 按平台要求设置。容器部署：

```powershell
docker build --build-arg PUBLIC_SITE_URL=https://你的域名 -t suntburst-blog .
docker run --env-file .env -e HOST=0.0.0.0 -e PORT=4321 -p 4321:4321 suntburst-blog
```

容器只需网站公开连接配置，构建不要求服务端 AI 密钥。正式域名、服务资源和 OAuth 配置未完成时，仅能称为本地可运行系统，不能称为线上登录已经验收。

## 写作与管理

登录 `/admin/` 后新建文章，填写标题、地址、分类、标签和正文；图片可直接在编辑器上传/插入，预览签名地址不会写进正文。点击“保存草稿”写入数据库，再点击“发布”创建公开快照。修改已发布文章只改工作副本，点击“发布更新”后才更新公开正文。

版本恢复会产生新的工作副本，不自动覆盖线上版本。撤回或回收会移除公开快照及索引；回收站可恢复为草稿。首次公开后地址不允许改动，避免破坏已有链接。多人同时修改时版本不一致会拒绝覆盖，当前文本仍可导出。

普通成员只能登录；editor 只管理自己的内容和图片；admin/owner 管理全部内容与设置。成员停用后原有登录令牌也不能继续访问草稿。owner 不能被降权或停用。

设置中的站名、简介、作者、关于正文、公告及默认外观保存后对后续请求生效。访客已经保存的个人外观仍优先于站点默认外观。

## 接管现有文章与备份

```powershell
pnpm cms:export-source
```

该命令只把本地已公开的文章、随记、知识和项目导出为 `.cache/cms-source-import.json`，不包含 `draft: true` 文件。登录后台的“备份”，选择该 JSON 导入，内容先进入数据库草稿；发布后沿用同类型、同地址的页面。相同类型和地址的已有数据库记录会跳过，重复导入不会覆盖网页中的新版本。新数据库在导入和发布前的文章列表为空，切换正式域名前先完成此步骤；旧 Pages 网站继续保留原文件内容。

“导出 JSON”保存当前权限可见的内容、版本、设置和媒体清单；“导出 Markdown”保存正文。导入备份时只恢复内容工作副本，不自动发布，也不提升任何权限。媒体二进制文件需单独从媒体库下载，正式数据库灾备使用 Supabase 的数据库备份及 Storage 对象备份；内容导出不是完整物理数据库备份。

## 评论和 AI

评论沿用 `comments-runbook.md` 中的 Edge Functions 和审核机制。CMS 发布会自动更新评论目标，不再为新文章手工同步目标。只有配置好 Edge Functions 和新的服务端 AI 密钥后才启用评论。聊天中曾暴露的旧密钥不得继续使用。

## 上线验收

用真实 GitHub 账号完成登录和首次注册；站长登录成为 owner，另一个普通账号不能编辑、读草稿或改设置。保存含测试图片的草稿，匿名应看不到；发布后正文、图片、首页、搜索和 RSS 应一致；修改草稿保持旧公开版；撤回后内容和图片的新匿名请求均不可读。浏览器已经加载/第三方下载过的公开内容无法远程收回，短期签名预览链接在有效期内也可继续访问。

执行 `pnpm lint`、CMS 单元测试、pgTAP、静态构建和服务器构建。确认静态站仍可回滚，再将实际域名指向服务器；仅推送 GitHub Pages 不会启用服务器版。
