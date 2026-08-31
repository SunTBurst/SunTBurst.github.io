import type { CommentReviewResult } from '../_shared/comment-review/types';
import type { CommentSubmissionInput } from '../_shared/comments/contracts';
import { normalizeSubmission } from '../_shared/comments/contracts';
import { HttpError, json, readJsonObject, requireActor, serveHttp, serviceClient } from '../_shared/comments/http';
import { configuredReviewProvider, COMMENT_POLICY_VERSION, reviewTimeoutMs } from '../_shared/comments/runtime';
import { submitComment, type SubmissionResultStatus, type SubmitCommentDependencies } from '../_shared/comments/submit';

serveHttp(['POST'], async (request, origin) => {
  const client = serviceClient();
  const actor = await requireActor(request, client);
  const body = await readJsonObject(request);
  const targetValue = body.target && typeof body.target === 'object' && !Array.isArray(body.target)
    ? body.target as Record<string, unknown>
    : {};
  const preliminary = normalizeSubmission({
    target: {
      kind: typeof targetValue.kind === 'string' ? targetValue.kind : '',
      path: typeof targetValue.path === 'string' ? targetValue.path : '',
    },
    targetTitle: 'server-verified-target',
    targetSummary: 'server-verified-target',
    body: typeof body.body === 'string' ? body.body : '',
    parentId: body.parentId === null ? null : typeof body.parentId === 'string' ? body.parentId : '',
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '',
  });

  const { data: target, error: targetError } = await client
    .from('comment_targets')
    .select('title,summary')
    .eq('target_kind', preliminary.target.kind)
    .eq('target_path', preliminary.target.path)
    .eq('active', true)
    .maybeSingle();
  if (targetError) throw new Error('target_lookup_failed');
  if (!target) throw new HttpError(404, 'target_not_found');

  const input: CommentSubmissionInput = {
    ...preliminary,
    targetTitle: target.title,
    targetSummary: target.summary,
  };
  let recordedReview: CommentReviewResult | null = null;
  let reviewStartedAt = Date.now();

  const dependencies: SubmitCommentDependencies = {
    policyVersion: COMMENT_POLICY_VERSION,
    reviewTimeoutMs: reviewTimeoutMs(),
    now: () => new Date(),
    targetExists: async () => true,
    findPublishedParent: async (parentId) => {
      const { data, error } = await client
        .from('comments')
        .select('id,parent_id,target_kind,target_path')
        .eq('id', parentId)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw new Error('parent_lookup_failed');
      return data ? {
        id: data.id,
        parentId: data.parent_id,
        target: { kind: data.target_kind, path: data.target_path },
      } : null;
    },
    findExistingByIdempotency: async (userId, key) => {
      const { data, error } = await client
        .from('comments')
        .select('id,status')
        .eq('author_id', userId)
        .eq('idempotency_key', key)
        .maybeSingle();
      if (error) throw new Error('idempotency_lookup_failed');
      return data ? { id: data.id, status: data.status as SubmissionResultStatus } : null;
    },
    insertPending: async (submission) => {
      const { data, error } = await client.rpc('create_pending_comment', {
        p_target_kind: submission.target.kind,
        p_target_path: submission.target.path,
        p_parent_id: submission.parentId,
        p_author_id: submission.authorId,
        p_author_github_id: submission.authorGithubId,
        p_author_login: submission.authorLogin,
        p_body: submission.body,
        p_policy_version: COMMENT_POLICY_VERSION,
        p_idempotency_key: submission.idempotencyKey,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id || !row?.status) throw new Error('comment_insert_failed');
      return {
        id: row.id,
        status: row.status as SubmissionResultStatus,
        reused: Boolean(row.reused),
      };
    },
    transition: async (id, from, to) => {
      if (from === 'pending' && to === 'ai_reviewing') {
        const { data, error } = await client
          .from('comments')
          .update({ status: 'ai_reviewing' })
          .eq('id', id)
          .eq('status', 'pending')
          .select('id')
          .single();
        if (error || !data) throw new Error('comment_review_start_failed');
        reviewStartedAt = Date.now();
        return;
      }
      if (from !== 'ai_reviewing' || !recordedReview) throw new Error('comment_review_finalize_failed');
      const { error } = await client.rpc('finalize_comment_review', {
        p_comment_id: id,
        p_provider: recordedReview.provider,
        p_model: recordedReview.model,
        p_decision: recordedReview.decision,
        p_reason_codes: recordedReview.reasonCodes,
        p_policy_version: COMMENT_POLICY_VERSION,
        p_request_id_hash: recordedReview.requestIdHash ?? null,
        p_duration_ms: Math.min(120000, Math.max(0, Date.now() - reviewStartedAt)),
        p_result_type: recordedReview.resultType,
      });
      if (error) throw new Error('comment_review_finalize_failed');
    },
    recordReview: async (_id, result) => {
      recordedReview = result;
    },
    provider: configuredReviewProvider(),
  };

  const result = await submitComment(input, actor, dependencies);
  return json(origin, { comment: result }, result.status === 'published' ? 201 : 202);
});
