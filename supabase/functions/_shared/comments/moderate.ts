import { validateStableId } from './contracts';

export type ModerationAction = 'approve' | 'reject' | 'delete';
export type ModeratedStatus = 'published' | 'rejected' | 'deleted';

export interface ModerationInput {
  commentId: string;
  action: ModerationAction;
  reasonCode: string;
  reasonNote: string | null;
}

export interface ModerationDependencies {
  moderatorGithubIds: Set<number>;
  moderateAtomically(input: {
    commentId: string;
    action: ModerationAction;
    nextStatus: ModeratedStatus;
    moderatorUserId: string;
    moderatorGithubId: number;
    reasonCode: string;
    reasonNote: string | null;
  }): Promise<{ id: string; status: ModeratedStatus }>;
  deleteOwnAtomically(commentId: string, userId: string): Promise<{ id: string; status: 'deleted' }>;
}

const ACTION_STATUS: Record<ModerationAction, ModeratedStatus> = {
  approve: 'published',
  reject: 'rejected',
  delete: 'deleted',
};

function normalizeReasonCode(value: unknown): string {
  if (typeof value !== 'string') throw new Error('reason code is required');
  const normalized = value.trim();
  if (!normalized || normalized.length > 64 || !/^[a-z0-9_:-]+$/u.test(normalized)) {
    throw new Error('reason code is invalid');
  }
  return normalized;
}

function normalizeReasonNote(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error('reason note is invalid');
  const normalized = value.normalize('NFC').trim();
  if ([...normalized].length > 240) throw new Error('reason note is too long');
  return normalized || null;
}

export async function moderateComment(
  input: ModerationInput,
  actor: { userId: string; githubId: number },
  dependencies: ModerationDependencies,
) {
  if (!Number.isSafeInteger(actor.githubId) || !dependencies.moderatorGithubIds.has(actor.githubId)) {
    throw new Error('forbidden');
  }
  const moderatorUserId = validateStableId(actor.userId, 'user ID');
  const commentId = validateStableId(input.commentId, 'comment ID');
  if (!(input.action in ACTION_STATUS)) throw new Error('moderation action is invalid');
  const reasonCode = normalizeReasonCode(input.reasonCode);
  const reasonNote = normalizeReasonNote(input.reasonNote);
  return dependencies.moderateAtomically({
    commentId,
    action: input.action,
    nextStatus: ACTION_STATUS[input.action],
    moderatorUserId,
    moderatorGithubId: actor.githubId,
    reasonCode,
    reasonNote,
  });
}

export async function deleteOwnComment(
  rawCommentId: string,
  actor: { userId: string },
  dependencies: ModerationDependencies,
) {
  const commentId = validateStableId(rawCommentId, 'comment ID');
  const userId = validateStableId(actor.userId, 'user ID');
  return dependencies.deleteOwnAtomically(commentId, userId);
}
