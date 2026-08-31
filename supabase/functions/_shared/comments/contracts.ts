export const COMMENT_TARGET_KINDS = ['post', 'talk', 'knowledge', 'project'] as const;

export type CommentTargetKind = typeof COMMENT_TARGET_KINDS[number];

export interface CommentTarget {
  kind: CommentTargetKind;
  path: string;
}

export interface CommentActor {
  userId: string;
  githubId: number;
  login?: string;
}

export interface CommentSubmissionInput {
  target: {
    kind: string;
    path: string;
  };
  targetTitle: string;
  targetSummary: string;
  body: string;
  parentId: string | null;
  idempotencyKey: string;
}

export interface NormalizedCommentSubmission extends Omit<CommentSubmissionInput, 'target'> {
  target: CommentTarget;
  body: string;
  targetTitle: string;
  targetSummary: string;
}

const TARGET_PREFIXES: Record<CommentTargetKind, string> = {
  post: '/posts/',
  talk: '/talk/',
  knowledge: '/knowledge/',
  project: '/projects/',
};

function requireBoundedText(value: unknown, label: string, maximum: number): string {
  if (typeof value !== 'string') throw new Error(`${label} is required`);
  const normalized = value.replace(/\r\n?/g, '\n').normalize('NFC').trim();
  if (!normalized || [...normalized].length > maximum) throw new Error(`${label} is invalid`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(normalized)) {
    throw new Error(`${label} contains control characters`);
  }
  return normalized;
}

export function validateStableId(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || !/^[A-Za-z0-9._:-]+$/u.test(normalized)) {
    throw new Error(`${label} is invalid`);
  }
  return normalized;
}

export function validateActor(actor: CommentActor): CommentActor {
  const userId = validateStableId(actor.userId, 'user ID');
  if (!Number.isSafeInteger(actor.githubId) || actor.githubId <= 0) {
    throw new Error('GitHub ID is invalid');
  }
  return { ...actor, userId };
}

export function normalizeTarget(input: { kind: string; path: string }): CommentTarget {
  if (!input || typeof input !== 'object') throw new Error('comment target is required');
  if (!COMMENT_TARGET_KINDS.includes(input.kind as CommentTargetKind)) {
    throw new Error('comment target kind is invalid');
  }
  const kind = input.kind as CommentTargetKind;
  const path = input.path;
  const prefix = TARGET_PREFIXES[kind];
  if (typeof path !== 'string'
    || !path.startsWith(prefix)
    || !path.endsWith('/')
    || path.includes('?')
    || path.includes('#')
    || path.includes('..')
    || path.length > 240) {
    throw new Error('comment target path is invalid');
  }
  return { kind, path };
}

export function normalizeSubmission(input: CommentSubmissionInput): NormalizedCommentSubmission {
  if (!input || typeof input !== 'object') throw new Error('comment submission is required');
  const target = normalizeTarget(input.target);

  const body = requireBoundedText(input.body, 'comment body', 2000);
  if ([...body].length < 2) throw new Error('comment body is too short');
  const idempotencyKey = validateStableId(input.idempotencyKey, 'idempotency key');
  if (idempotencyKey.length < 16) throw new Error('idempotency key is invalid');

  return {
    target,
    targetTitle: requireBoundedText(input.targetTitle, 'target title', 160),
    targetSummary: requireBoundedText(input.targetSummary, 'target summary', 500),
    body,
    parentId: input.parentId === null ? null : validateStableId(input.parentId, 'parent comment ID'),
    idempotencyKey,
  };
}

export function sameTarget(
  left: { kind: string; path: string },
  right: { kind: string; path: string },
): boolean {
  return left.kind === right.kind && left.path === right.path;
}
