# 评论系统部署与运维手册

本手册用于把仓库中已经完成的评论代码接到一个新的 Supabase 项目。默认网页仍为 `preview`，在全部验收完成前不得改成 `enabled`。聊天中曾经出现过的 Kimi、DeepSeek 密钥已经视为泄露值，必须先在对应供应商后台撤销并重新生成；旧值不得写入仓库、GitHub 变量或 Supabase。

## 1. 外部资源与权限

需要由站点所有者亲自完成：

1. 创建 Supabase 项目并记录 project ref、Project URL、publishable key 和数据库密码。
2. 在 GitHub 账号的 Developer settings 中创建 GitHub OAuth App。Homepage URL 使用 `https://suntburst.github.io`；Authorization callback URL 必须复制 Supabase 控制台显示的精确地址，通常为 `https://<project-ref>.supabase.co/auth/v1/callback`，关闭不需要的通配匹配。
3. 在 Supabase Authentication → Providers 中只启用 GitHub；关闭 Email、Phone、Anonymous 和其他社交供应商。Site URL 设为 `https://suntburst.github.io`，Redirect URLs 只加入实际使用的站点地址。
4. 在 GitHub OAuth App 和 Supabase 中分别保存 Client ID/Client Secret。OAuth secret 只进入 Supabase，不进入 Pages 构建。

参考：[Supabase GitHub 登录](https://supabase.com/docs/guides/auth/social-login/auth-github)、[Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)、[GitHub 创建 OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)。

## 2. 本地验证数据库迁移

仓库已经把 Supabase CLI `2.116.0` 固定为开发依赖。Windows 需要先启用 WSL 2，并确认 Docker Desktop 的 Linux 容器引擎能够正常响应；仅安装 `docker.exe` 但后台引擎未启动，不能作为数据库验收依据。然后在仓库根目录执行：

```powershell
pnpm supabase start
pnpm comments:db-reset
pnpm comments:test-db
pnpm test
pnpm build
pnpm comments:scan
```

`comments:test-db` 会执行 `supabase/tests/database` 下的 pgTAP 测试，直接验证迁移后的表、RLS、列级读取授权、服务函数权限、幂等提交、目标校验、审核发布、一层回复和作者删除。确认两个迁移文件与全部数据库测试均成功后，才能继续部署。`supabase db reset --linked` 会清空远程数据库，本项目不使用该命令。官方测试方式见 [Supabase 数据库测试](https://supabase.com/docs/guides/database/testing)。

本地验证 Edge Functions 时，创建一个会被 Git 忽略的 `supabase/functions/.env.local`，只写固定 localhost Origin、选择的供应商名和无效占位密钥，禁止使用真实供应商密钥。然后执行：

```powershell
pnpm supabase functions serve --no-verify-jwt --env-file supabase/functions/.env.local
```

逐一验证四个函数的允许 Origin 预检、错误 Origin `403`、未登录写操作 `401`、公开评论读取和匿名审核队列 `403`，完成后删除本地 env 文件。Supabase 本地 Kong 可能把响应的 `Access-Control-Allow-Origin` 改写为 `*`；安全验收必须以函数对未授权 Origin 返回 `403` 为准，不能只检查响应头。服务端 Origin 白名单仍是访问控制边界。

## 3. 连接并部署数据库

以下命令只使用已经登录的 CLI 会话和交互式数据库密码，不在命令中写密钥：

```powershell
supabase login
supabase projects list
supabase link --project-ref $env:SUPABASE_PROJECT_REF
supabase db push --dry-run
supabase db push
```

先核对 `--dry-run` 只包含本仓库的两项评论迁移，再执行正式 push。官方工作流见 [Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows)。

## 4. 配置 Edge Function secrets

Supabase 自动提供项目 URL 和 service-role 环境值。另需在 Supabase Dashboard 的 Edge Function Secrets 中配置：

- `PUBLIC_PORTAL_ORIGINS=https://suntburst.github.io`
- `COMMENT_REVIEW_PROVIDER`：只选 `openai`、`kimi` 或 `deepseek` 之一
- 选中供应商对应的全新 API Key
- 可选的模型名、Kimi 区域和 `COMMENT_REVIEW_TIMEOUT_MS`

只设置当前供应商的全新密钥，不做自动供应商回退。推荐使用 Dashboard；如使用 CLI，应把生产 secrets 放在仓库外的临时 env 文件，再执行 `supabase secrets set --env-file <仓库外路径>`，完成后安全删除该文件。不要把 secret 直接放在可留存的命令行中。参考 [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)。

## 5. 部署函数与同步公开目标

```powershell
supabase functions deploy
pnpm build
pnpm comments:sync-targets
```

运行同步脚本前，只在当前终端会话设置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`；脚本读取 `dist/portal-index.json`，新增或更新四类公开详情页，并把已经下线的目标标为 inactive。不要把 service-role key 配置成 GitHub Pages 变量。函数部署说明见 [Supabase Edge Functions 部署](https://supabase.com/docs/guides/functions/deploy)。

## 6. 上线前验收

保持 `PUBLIC_COMMENTS_STATE=preview`，逐项证明：

1. 匿名访客只能读取 `published` 评论；直接查询表也看不到内部作者 ID、幂等键和审核记录。
2. 只能使用 GitHub 登录，其他注册方式全部关闭。
3. 安全且相关的评论可以由 AI 公开；隐私、推广、跑题、垃圾、提示注入和不确定内容保持私有并进入人工审核。
4. 供应商超时、错误响应和无效 JSON 均进入人工审核，不出现自动拒绝或跨供应商回退。
5. 非管理员无法读取审核队列；GitHub 数字 ID `105589585` 可以审核通过、拒绝公开和删除。
6. 作者删除和管理员删除都会清空正文；限流、幂等重试和一层回复约束有效。
7. 桌面 1440×900 与手机 390×844 无横向溢出，键盘焦点、44px 控件和 `aria-live` 信息可用。
8. `pnpm comments:scan`、类型检查、全部测试和生产构建通过。

## 7. 正式启用

验收完成后，才在 GitHub 仓库 Variables 中加入公开值：

- `PUBLIC_COMMENTS_STATE=enabled`
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_COMMENT_REVIEW_PROVIDER`，必须与服务端选择一致

这些值是公开构建配置，不是 AI secrets。修改 Pages workflow 读取这些变量后部署，并再次完成真实登录、提交、人工审核和删除验证。正式启用前，不创建“comments-live”更新记录。

## 8. 轮换、停用与回滚

- AI 密钥或 OAuth secret 疑似泄露：先在供应商/GitHub 轮换并撤销旧值，再更新 Supabase secret；无需把值写入代码。
- AI 供应商故障：不要切换到未经验证的备用供应商；提交失败或不确定内容继续进入人工队列。
- 出现隐私、授权或队列异常：立刻将 Pages 构建变量改为 `PUBLIC_COMMENTS_STATE=preview` 并重新部署，确认网页不再生成评论 SDK、端点或请求入口。
- 必要时在 Supabase 暂停相关函数或关闭 GitHub provider；保留数据库以便审计，不执行破坏性远程 reset。
- 回滚后正文和其他静态功能必须继续可读，修复并重复第 6 节验收后才能重新启用。
