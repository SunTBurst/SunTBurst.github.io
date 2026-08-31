export const COMMENT_TARGET_KINDS = ['post', 'talk', 'knowledge', 'project'] as const;
export type CommentTargetKind = typeof COMMENT_TARGET_KINDS[number];

export const COMMENT_STATUSES = [
  'pending',
  'ai_reviewing',
  'manual_review',
  'published',
  'rejected',
  'deleted',
] as const;
export type CommentStatus = typeof COMMENT_STATUSES[number];

export interface CommentTarget {
  kind: CommentTargetKind;
  path: `/${string}/`;
}

const targetPrefixes: Record<CommentTargetKind, string> = {
  post: '/posts/',
  talk: '/talk/',
  knowledge: '/knowledge/',
  project: '/projects/',
};

const transitionMap: Record<CommentStatus, readonly CommentStatus[]> = {
  pending: ['ai_reviewing', 'manual_review', 'deleted'],
  ai_reviewing: ['published', 'manual_review'],
  manual_review: ['published', 'rejected', 'deleted'],
  published: ['deleted'],
  rejected: ['deleted'],
  deleted: [],
};

function isTargetKind(value: unknown): value is CommentTargetKind {
  return typeof value === 'string' && COMMENT_TARGET_KINDS.includes(value as CommentTargetKind);
}

function isCommentStatus(value: unknown): value is CommentStatus {
  return typeof value === 'string' && COMMENT_STATUSES.includes(value as CommentStatus);
}

export function canonicalCommentTarget(input: { kind?: unknown; path?: unknown }): CommentTarget {
  if (!isTargetKind(input.kind)) throw new Error('unsupported comment target kind');
  if (typeof input.path !== 'string' || !input.path.startsWith('/') || input.path.startsWith('//')) {
    throw new Error('comment target must be a local path');
  }

  const url = new URL(input.path, 'https://portal.invalid');
  if (url.origin !== 'https://portal.invalid') throw new Error('comment target must be a local path');

  const prefix = targetPrefixes[input.kind];
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  const remainder = path.slice(prefix.length, -1);
  if (!path.startsWith(prefix) || !remainder || remainder.includes('/')) {
    throw new Error('comment target does not match its public detail route');
  }

  return { kind: input.kind, path: path as `/${string}/` };
}

export function validateCommentBody(value: unknown): string {
  if (typeof value !== 'string') throw new Error('comment body must be text');
  const normalized = value.replace(/\r\n?/g, '\n').normalize('NFC').trim();
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(normalized)) {
    throw new Error('comment body contains a control character');
  }
  const length = Array.from(normalized).length;
  if (length < 2 || length > 2000) throw new Error('comment body must contain 2 to 2000 characters');
  return normalized;
}

export function canTransitionComment(from: unknown, to: unknown): boolean {
  return isCommentStatus(from) && isCommentStatus(to) && transitionMap[from].includes(to);
}
