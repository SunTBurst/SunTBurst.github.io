# 2026-09-22 网页后台首次上线

## 访问与维护

- 在线博客：https://suntburst-blog.onrender.com/
- 内容后台：https://suntburst-blog.onrender.com/admin/
- 账户中心：https://suntburst-blog.onrender.com/account/
- GitHub Pages：https://suntburst.github.io/，继续作为静态版本；后台和账户页提供在线版入口。
- 站长：GitHub `SunTBurst`，首次真实登录已确认为 `owner`。

Render 使用免费 Docker Web Service，区域 Singapore，服务 ID 为 `srv-dap3612jnfac73acc710`。Supabase 项目 `suntburst-blog`，项目标识 `ajvrdslldlczvqaruowa`，区域 Mumbai。账号、数据库、图片均使用用户自己的云端资源。所有私密凭据只保存在平台或本机登录存储，不在仓库中记录。

本次 Render 服务通过公开 Git 仓库手动创建；仓库的 `render.yaml` 是可复用的 Blueprint 配置，并未作为当前服务的自动同步来源。网页内容发布立即读取数据库，无需构建；后续代码变更推送 `main` 后，在 Render 使用 Manual Deploy → Deploy latest commit，或另行连接 Blueprint / Git provider 自动部署。GitHub Pages 按原 Actions 流程自动更新。

## 已验收的云端操作

安装并核对全部 9 个评论/CMS 迁移，10 张 CMS 表均开启行级访问控制。匿名查询公开快照和公开设置成功，查询草稿表被拒绝。GitHub 登录已启用，邮箱、电话及匿名登录关闭；登录回跳白名单限定在线版 `/admin/`。

原有 10 篇内容已通过网页导入并发布：文章 4、随记 1、知识 4、项目 1。迁移后逐篇核对标题和正文，与源文件一致。图片、首页、详情页、搜索索引、RSS 和 sitemap 均可访问。原始发布日期保存在 metadata，应用优先展示这些日期，避免将迁移日期显示成首次发表日期。

已在真实 GitHub 站长账户下保存站点设置；关于页可见数据库保存的更新。已上传一张原有公开教程配图，验证未引用图片匿名访问为 404；在网页编辑器保存图片引用为草稿时，公开文章保持旧版本；发布更新后，文章和新媒体地址均可读取。该图片保留在媒体库供后续编辑使用，其他源文章未做内容改写。

验证范围包括：真实站长 OAuth、云端读写、匿名边界、内容迁移、发布和媒体引用。角色隔离、并发版本冲突、历史恢复、撤回、回收站等已在本地数据库与 HTTP 烟测中验证；本次未以另一人的真实 GitHub 账户做线上成员验收。

## 尚未启用

评论保持 `preview`，未部署并启用 AI 审核服务，也没有继续使用聊天中暴露的旧模型密钥。多用户私有知识协作、外部模型知识库问答、访客分析和邮件订阅不在本次上线验收范围内。

免费 Render 实例会闲置休眠，Supabase 免费项目也可能因低活跃暂停；需要持续可用时由站长选择付费常驻方案。内容 JSON 导出不含图片二进制，不等于完整数据库及 Storage 灾备。

## 回退

在线服务出现故障时，可在 Render 回滚已成功部署的版本；GitHub Pages 仍可访问。回滚代码不会回滚 Supabase 内容或数据库结构。不要对远端执行 `db reset`，也不要通过旧仓库文件覆盖在线编辑后的数据库内容。
