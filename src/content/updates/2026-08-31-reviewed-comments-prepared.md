---
title: 发布前审核评论系统完成代码准备
summary: 四类公开详情页已加入评论预览；本地 Supabase 迁移、RLS、可替换 AI 审核、人工复核、删除和 Edge Functions 已完成验收，线上后端仍待外部配置。
published: 2026-08-31
kind: site
href: /comments-policy
status: in-progress
draft: false
---

当前上线版本仍不接收评论，也不发送评论请求。本地空库重置、31 项 pgTAP 数据库测试和 Edge Functions 安全边界已经通过；只有线上 Supabase、GitHub OAuth、轮换后的新模型密钥和真实账号验收全部完成后，才会把状态改为已启用。
