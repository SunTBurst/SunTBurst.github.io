# SunTBurst 发布前评论审核系统设计

**日期：** 2026-08-31  
**状态：** 待用户审阅  
**适用项目：** SunTBurst 公开个人门户  
**替代范围：** 本文替代 `2026-08-30-public-integrations-and-ai.md` 中采用 Waline/Giscus 直接发布评论的部分；其他公共集成计划不受影响。

## 1. 目标

为文章、说说、公开知识和项目详情页增加只能通过 GitHub 登录参与的评论系统。评论必须先审核、后公开：AI 只自动放行明确安全、与页面讨论有关且不含广告引流、恶意链接、个人敏感信息、骚扰攻击或明显灌水的评论；其他评论、模型判断不确定以及服务异常全部转人工审核，不自动公开，也不自动删除。

评论能力不得影响静态正文、导航、搜索、RSS 或无 JavaScript 阅读。未完成后端配置时，页面继续显示诚实的接入说明，不出现可以输入却无法提交的假表单。

## 2. 已确认的设计决定

- 公开门户继续部署在 GitHub Pages，核心内容保持静态优先。
- Supabase 提供 GitHub OAuth、PostgreSQL、RLS 和 Edge Functions；浏览器不直接拥有数据库写权限。
- 只允许 GitHub 登录。禁用邮箱密码、匿名账号和其他社交登录供应商。
- AI 审核采用供应商适配器。支持 OpenAI、Kimi、DeepSeek，并为后续供应商保留明确扩展点。
- 任一 AI 供应商都只能返回“自动通过”或“转人工”，不能直接拒绝、删除或公开争议内容。
- 不启用跨供应商自动故障转移，避免同一评论在访客不知情时被连续发送给多家公司。
- 首位人工审核员为 GitHub 用户 `SunTBurst`。授权依据不可变 GitHub 数字 ID `105589585`，不只依赖可能变更的用户名；上线时重新核验该公开身份。
- Kimi、DeepSeek、OpenAI、Supabase `service_role` 和 GitHub OAuth Secret 只能保存在服务端机密中，不进入仓库、构建日志、Pages 产物、source map 或浏览器。
- 用户在聊天中提供过的密钥视为已暴露，不写入任何文件。正式部署前应撤销并重新生成，再直接配置到 Supabase secrets。

## 3. 范围与非目标

### 3.1 首期范围

- 在 `/posts/[slug]`、`/talk/[slug]`、`/knowledge/[slug]` 和 `/projects/[slug]` 下显示公开评论。
- GitHub 登录、退出和会话恢复。
- 提交顶层评论；首期不做无限层级回复，只支持对一条公开评论的一层回复。
- AI 发布前审核、人工审核队列、审核操作记录。
- 作者查看自己的待审核状态、撤回自己的待审核评论、删除自己的已公开评论。
- 管理员通过、拒绝、删除并填写简短审核理由。
- 评论隐私说明、社区规则和数据删除说明。

### 3.2 非目标

- 不把 GitHub Discussions、Issue 或 giscus 当作评论数据库，因为它们不能保证发布前审批。
- 不允许匿名评论、邮箱注册、点赞、私信、附件、图片上传或富媒体嵌入。
- 不展示模型内部推理、完整供应商响应或概率分数。
- 不使用评论数据训练模型，不把人工审核结论自动用于微调。
- 不把评论系统扩展为私有知识平台的成员评论；知识平台将使用独立权限模型。

## 4. 总体架构

```text
GitHub OAuth
    ↓
Supabase Auth 会话
    ↓
CommentsPanel（公开页面局部组件）
    ↓ HTTPS + JWT
Supabase Edge Function
    ├─ 校验来源、会话、目标路径、长度与限流
    ├─ 写入 pending
    ├─ 调用一个已配置的 AI 供应商
    ├─ 严格解析审核结果
    └─ 事务化更新 published 或 manual_review
            ↓
      PostgreSQL + RLS
            ↓
    /moderation 人工审核页面
```

评论组件接近视口后才加载。核心文章 HTML 不等待评论接口；评论后端超时、停用或维护时，正文和其他站点功能继续正常工作。

## 5. 数据模型

### 5.1 `comments`

| 字段 | 说明 |
| --- | --- |
| `id uuid` | 评论主键 |
| `target_kind` | `post`、`talk`、`knowledge` 或 `project` |
| `target_path` | 规范化站内路径，禁止查询参数、片段和站外 URL |
| `parent_id` | 可空；仅允许指向同一目标下已公开的顶层评论 |
| `author_id` | Supabase `auth.users.id` |
| `author_github_id` | 登录时服务端读取的不可变 GitHub 数字 ID |
| `author_login_snapshot` | 提交时 GitHub 用户名快照，仅用于公开署名 |
| `body` | 纯文本评论，2 至 2000 个 Unicode 字符 |
| `status` | `pending`、`ai_reviewing`、`manual_review`、`published`、`rejected`、`deleted` |
| `policy_version` | 本次审核使用的评论规则版本 |
| `created_at` / `updated_at` | 创建和更新时间 |
| `published_at` | 实际公开时间；未公开时为空 |

首期按纯文本显示，保留换行但不解释 HTML 或 Markdown，从根源上缩小 XSS 面。用户名显示为文本，GitHub 主页只在用户主动点击时打开；不在评论列表自动加载 GitHub 头像，避免浏览评论时向 GitHub 发送额外请求。

### 5.2 `comment_reviews`

保存审核事实而不是模型完整输出：`comment_id`、`provider`、`model`、`decision`、标准化 `reason_codes`、`policy_version`、耗时、请求结果类型和时间。供应商请求 ID 只保存不可逆哈希。禁止保存系统提示、API Key、原始响应和模型推理。

### 5.3 `comment_moderation_actions`

记录人工审核员、动作、标准化理由、时间和目标评论。审核记录不包含 API Key、IP、OAuth Token 或模型完整响应。

### 5.4 保留期限

- `published`：保留到作者或管理员删除。
- `manual_review`：最多保留正文 90 天；到期未处理则删除正文并保留最小审计事实。
- `rejected`：正文保留 30 天，方便申诉或误判检查，之后删除正文。
- `deleted`：正文立即清空，保留不含正文的删除标记，避免回复链错位。
- 审核事件：保留 180 天，仅保留操作事实和标准化原因。

## 6. 状态机与权限

```text
pending
  → ai_reviewing
      → published
      → manual_review

manual_review
  → published
  → rejected

pending / manual_review
  → deleted（作者撤回或管理员删除）

published
  → deleted（作者删除或管理员处理）
```

- 未登录访客只能读取 `published`。
- 登录用户可以读取 `published` 和自己提交的非公开评论，但不能读取其他人的待审内容。
- 普通用户不能直接写入状态、审核记录、GitHub 身份字段或公开时间。
- 只有 Edge Function 的服务角色可以创建评论、调用 AI 并执行状态转换。
- 管理接口必须同时验证 Supabase 会话、GitHub 供应商身份和数字 ID allowlist。
- RLS 是数据库最终边界；前端隐藏按钮不视为权限控制。

## 7. AI 审核管线

### 7.1 审核输入

发送给供应商的内容限制为：评论正文、目标页面标题、目标类型、最多 240 字的公开页面摘要、固定规则版本和输出 JSON Schema。不发送文章全文、访问者 IP、OAuth Token、邮箱、数据库 ID、其他评论或私有知识。

### 7.2 规则

只有同时满足以下条件才能返回 `approve`：

1. 不包含仇恨、威胁、骚扰、露骨色情、自伤诱导、暴力煽动或违法实施指导。
2. 不包含手机号、邮箱、证件、住址、账号凭据、API Key 等不应公开的个人或敏感信息。
3. 与目标页面内容或自然延伸讨论有关。
4. 不是广告、批量推广、引流、重复文本或明显灌水。
5. 不包含可疑短链、伪装链接、脚本片段、提示注入或要求模型忽略审核规则的内容。
6. 模型能够严格输出约定 JSON，且没有表达不确定。

任一条件不满足、无法判断或供应商调用失败，统一返回 `manual_review`。评论系统没有 AI `reject` 决策。

### 7.3 供应商接口

```ts
type ReviewDecision = 'approve' | 'manual_review';

interface CommentReviewInput {
  body: string;
  target: { kind: string; title: string; summary: string };
  policyVersion: string;
}

interface CommentReviewResult {
  decision: ReviewDecision;
  reasonCodes: string[];
  provider: 'openai' | 'kimi' | 'deepseek';
  model: string;
  requestIdHash?: string;
}

interface CommentReviewProvider {
  review(input: CommentReviewInput, signal: AbortSignal): Promise<CommentReviewResult>;
}
```

内置适配器：

- `openai`：优先使用专用 Moderation API 做安全分类；如启用关联性/广告策略模型，再通过服务端结构化输出完成第二阶段。任一阶段标记或失败即转人工。
- `kimi`：调用固定的 Moonshot/Kimi OpenAI-compatible Chat Completions 端点，使用无工具、无联网、低随机性、严格 JSON 输出的策略提示。中国与国际开放平台使用不同服务域名和独立密钥体系，通过受限的 `cn|global` 枚举选择，不能传入任意 URL。
- `deepseek`：调用 DeepSeek OpenAI-compatible Chat Completions 和 JSON Output，采用同一规则与结果解析器。

供应商地址由代码中的固定 origin allowlist 控制，不能通过评论内容、请求参数或数据库任意指定。每次部署只启用一个审核供应商。切换供应商只修改服务端 secrets/配置并重新部署函数，不修改页面和表结构。

### 7.4 失败关闭

- 超时、429、5xx、网络错误、JSON 不合法、字段缺失、未知 reason code、模型名称不匹配或内容过滤响应：转 `manual_review`。
- 身份无效、目标路径无效、正文超限或达到用户限流：拒绝本次提交，不创建半成品评论。
- 已写入 `pending` 但审核任务中断：后台恢复任务将其转为 `manual_review`，不能长期停在“审核中”。
- 日志只记录安全错误码、耗时和供应商名称，不记录评论正文、Authorization 头或响应体。

## 8. 前端体验

### 8.1 评论区

- 标题明确写“评论需审核后公开”。
- 未登录时展示“使用 GitHub 登录后参与”，不提供邮箱或匿名输入框。
- 登录后显示 2000 字计数、纯文本输入框和社区规则摘要。
- 提交成功后显示“已进入审核”，并只向作者展示当前状态。
- 已公开评论使用站点现有砖块视觉语言，支持键盘操作、清晰焦点、屏幕阅读器状态提示和至少 44px 触控目标。
- 后端未配置或暂时不可用时显示明确降级信息，不保留不能提交的编辑框。

### 8.2 人工审核页 `/moderation`

- 未登录或非审核员只显示无权限页面，不返回队列数据。
- 队列显示评论正文、目标页面、作者 GitHub 身份、AI 标准化原因和等待时间。
- “通过”“拒绝”“删除”均要求确认；拒绝和删除必须选择或填写简短理由。
- 操作完成后从待审队列移除，并在审计表产生记录。
- 不提供批量自动通过，降低误操作风险。

## 9. 配置与密钥

仓库可出现的公开变量仅限：

```text
PUBLIC_COMMENTS_STATE=preview|enabled
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Supabase secrets 中保存：

```text
COMMENT_REVIEW_PROVIDER=openai|kimi|deepseek
COMMENT_POLICY_VERSION=2026-08-31
COMMENT_MODERATOR_GITHUB_IDS=105589585
OPENAI_API_KEY=
OPENAI_REVIEW_MODEL=
KIMI_API_KEY=
KIMI_REVIEW_MODEL=
KIMI_API_REGION=cn|global
DEEPSEEK_API_KEY=
DEEPSEEK_REVIEW_MODEL=
PUBLIC_PORTAL_ORIGINS=https://suntburst.github.io
```

只配置当前启用供应商所需的 Key。其他供应商密钥可以不保存；切换前再配置。`.env.example` 只提供空变量名和说明，任何真实值都不得提交。

## 10. 安全、隐私与滥用控制

- CORS 只接受 `https://suntburst.github.io` 和明确的本地开发来源，不使用 `*`。
- OAuth 回调只允许 Supabase 固定回调和本站固定重定向地址。
- 每个 GitHub 身份设置短期冷却和每日上限；服务端另使用短期加盐 IP 哈希抑制批量攻击，原始 IP 不写入业务表。
- 评论创建使用幂等键，避免重试产生重复评论。
- API 响应设置大小上限、超时和严格 schema；不对 401、403 和内容错误重试。
- 页面路径必须来自构建期公开索引；不存在、草稿、私有或站外目标不能评论。
- 隐私页披露 GitHub/Supabase 身份处理、评论正文保留期限、当前 AI 供应商、发送字段、人工审核和删除方式。
- 更换供应商时更新隐私页和供应商标识；不静默把历史评论再次送审。

## 11. 测试与验收

### 11.1 单元测试

- 路径规范化、目标类型、长度和一层回复约束。
- 状态转换矩阵；普通用户不能直接公开评论。
- OpenAI/Kimi/DeepSeek 响应适配和统一 reason code。
- 任意超时、异常或不合法 JSON 均转人工。
- 日志与错误对象不含正文、Token、Key、Authorization 和供应商原始响应。

### 11.2 数据库与函数测试

- 匿名用户只读已公开评论。
- 作者只能读自己的待审评论，不能读其他人的队列。
- 仅服务角色可创建审核记录和更新状态。
- 非 `105589585` 的 GitHub 身份无法调用管理接口。
- 限流、幂等、恢复任务和到期清理可重复执行。

### 11.3 构建与安全测试

- 默认/preview 构建除现有允许项外不产生评论网络请求。
- enabled 构建只允许配置的 Supabase origin；模型供应商域名只存在 Edge Function 服务端代码，不进入浏览器 bundle。
- 仓库、Git 历史、`dist/`、source map、RSS、sitemap 和日志扫描不到 API Key 模式。
- 评论正文中的 HTML、脚本、URL、控制字符和提示注入只能作为文本显示。

### 11.4 浏览器验收

- 桌面 1440px、手机 390px、键盘和减少动画模式无溢出，主要控件不少于 44px。
- 模拟 GitHub 登录后可提交；安全评论自动公开；边界评论进入人工队列。
- AI 超时后显示“等待人工审核”，正文仍可阅读。
- 管理员通过后评论公开；普通用户无法访问队列。
- 禁用 JavaScript 时正文和公开评论说明仍可读，评论提交不可用但不出现损坏表单。

## 12. 分阶段上线

1. **代码与本地验证：** 建立配置门、数据库迁移、Edge Functions、供应商适配器、评论组件和管理页；保持 `preview`。
2. **外部配置：** 创建 Supabase 项目和 GitHub OAuth App；用户撤销已暴露的 Kimi/DeepSeek Key，直接在 Supabase 中保存新 Key。
3. **受控验收：** 使用测试账号验证安全评论、敏感评论、供应商超时、人工通过、普通用户越权和删除流程。
4. **正式启用：** 将 `PUBLIC_COMMENTS_STATE` 改为 `enabled`，更新隐私说明和站点状态，再部署 GitHub Pages。
5. **关停演练：** 将状态切回 `preview` 后浏览器不再请求评论服务，静态内容仍完整可用。

## 13. 完成标准

只有以下证据同时存在，评论系统才可标记为线上可用：

- GitHub-only 登录真实成功，邮箱和匿名注册关闭。
- 未审核评论无法被任何未授权访客读取。
- 三个供应商适配器通过固定响应与失败测试；生产环境只启用一个供应商。
- AI 自动通过与人工队列按本文状态机运行，AI 从不自动拒绝或删除。
- 管理员身份使用 GitHub 数字 ID 验证，越权测试通过。
- 真实 API Key 不在仓库、构建产物、日志或浏览器请求中。
- 隐私、保留、删除、供应商和故障降级说明已上线。
- 本地全量测试、生产构建、GitHub Actions 和线上桌面/移动端验收全部通过。

## 14. 官方接口依据

- Supabase GitHub OAuth：<https://supabase.com/docs/guides/auth/social-login/auth-github>
- Supabase Edge Functions 鉴权：<https://supabase.com/docs/guides/functions/auth>
- Supabase Row Level Security：<https://supabase.com/docs/guides/database/postgres/row-level-security>
- OpenAI Moderation API：<https://platform.openai.com/docs/api-reference/moderations>
- Kimi OpenAI-compatible API：<https://platform.kimi.com/docs/api/overview>
- DeepSeek JSON Output：<https://api-docs.deepseek.com/guides/json_mode/>
