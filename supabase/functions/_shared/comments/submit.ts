import type {
  CommentReviewInput,
  CommentReviewProvider,
  CommentReviewResult,
} from '../comment-review/types';
import {
  normalizeSubmission,
  sameTarget,
  validateActor,
  type CommentActor,
  type CommentSubmissionInput,
  type CommentTarget,
  type NormalizedCommentSubmission,
} from './contracts';

export type SubmissionResultStatus =
  | 'pending'
  | 'ai_reviewing'
  | 'published'
  | 'manual_review'
  | 'rejected'
  | 'deleted';

export interface SubmitCommentDependencies {
  policyVersion: string;
  reviewTimeoutMs: number;
  now(): Date;
  targetExists(target: CommentTarget): Promise<boolean>;
  findPublishedParent(parentId: string, target: CommentTarget): Promise<null | {
    id: string;
    parentId: string | null;
    target: { kind: string; path: string };
  }>;
  findExistingByIdempotency(userId: string, key: string): Promise<null | {
    id: string;
    status: SubmissionResultStatus;
  }>;
  insertPending(input: NormalizedCommentSubmission & {
    authorId: string;
    authorGithubId: number;
    authorLogin?: string;
    createdAt: Date;
  }): Promise<{ id: string; status: SubmissionResultStatus; reused?: boolean }>;
  transition(
    id: string,
    from: 'pending' | 'ai_reviewing',
    to: 'ai_reviewing' | SubmissionResultStatus,
    options?: { decidedAt?: Date },
  ): Promise<void>;
  recordReview(id: string, result: CommentReviewResult): Promise<void>;
  provider: CommentReviewProvider;
}

export interface SubmitCommentResult {
  id: string;
  status: SubmissionResultStatus;
  reused: boolean;
}

function providerFailureResult(resultType: 'provider_error' | 'timeout' = 'provider_error'): CommentReviewResult {
  return {
    decision: 'manual_review',
    reasonCodes: ['provider_error'],
    provider: 'openai',
    model: 'unavailable',
    resultType,
  };
}

async function reviewWithTimeout(
  provider: CommentReviewProvider,
  input: CommentReviewInput,
  timeoutMs: number,
): Promise<CommentReviewResult> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<CommentReviewResult>((resolve) => {
      timeoutHandle = setTimeout(() => {
        controller.abort();
        resolve(providerFailureResult('timeout'));
      }, Math.max(1, timeoutMs));
    });
    const reviewed = Promise.resolve(provider.review(input, controller.signal))
      .catch(() => providerFailureResult());
    return await Promise.race([reviewed, timeout]);
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}

export async function submitComment(
  rawInput: CommentSubmissionInput,
  rawActor: CommentActor,
  dependencies: SubmitCommentDependencies,
): Promise<SubmitCommentResult> {
  const input = normalizeSubmission(rawInput);
  const actor = validateActor(rawActor);
  const existing = await dependencies.findExistingByIdempotency(actor.userId, input.idempotencyKey);
  if (existing) return { ...existing, reused: true };

  if (!await dependencies.targetExists(input.target)) {
    throw new Error('public comment target does not exist');
  }

  if (input.parentId) {
    const parent = await dependencies.findPublishedParent(input.parentId, input.target);
    if (!parent || parent.parentId !== null || !sameTarget(parent.target, input.target)) {
      throw new Error('reply requires a published top-level comment on the same target');
    }
  }

  const inserted = await dependencies.insertPending({
    ...input,
    authorId: actor.userId,
    authorGithubId: actor.githubId,
    ...(actor.login ? { authorLogin: actor.login } : {}),
    createdAt: dependencies.now(),
  });
  if (inserted.status !== 'pending' || inserted.reused) {
    return { id: inserted.id, status: inserted.status, reused: true };
  }
  await dependencies.transition(inserted.id, 'pending', 'ai_reviewing');

  const result = await reviewWithTimeout(dependencies.provider, {
    body: input.body,
    target: {
      kind: input.target.kind,
      title: input.targetTitle,
      summary: input.targetSummary,
    },
    policyVersion: dependencies.policyVersion,
  }, dependencies.reviewTimeoutMs);

  await dependencies.recordReview(inserted.id, result);
  const status = result.decision === 'approve' ? 'published' : 'manual_review';
  await dependencies.transition(inserted.id, 'ai_reviewing', status, { decidedAt: dependencies.now() });
  return { id: inserted.id, status, reused: false };
}
