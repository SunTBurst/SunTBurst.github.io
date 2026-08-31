import type { CommentStatus } from './domain';

export const commentStatusLabels: Record<CommentStatus, string> = {
  pending: '等待提交审核',
  ai_reviewing: 'AI 审核中',
  manual_review: '等待人工审核',
  published: '已公开',
  rejected: '未公开',
  deleted: '已删除',
};

export const commentErrorCopy = {
  unavailable: '评论服务暂时不可用，正文阅读不受影响。',
  unauthorized: '请先使用 GitHub 登录。',
  rateLimited: '提交较为频繁，请稍后再试。',
  invalid: '评论内容或目标页面不符合要求。',
  unknown: '评论暂时无法处理，请稍后再试。',
} as const;
