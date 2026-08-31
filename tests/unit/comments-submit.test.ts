import assert from 'node:assert/strict';
import test from 'node:test';
import { submitComment, type SubmitCommentDependencies } from '../../supabase/functions/_shared/comments/submit';
import type { CommentReviewResult } from '../../supabase/functions/_shared/comment-review/types';

const actor = { userId: 'user-1', githubId: 105589585, login: 'SunTBurst' };
const input = {
  target: { kind: 'post', path: '/posts/hello-world/' },
  targetTitle: '欢迎来到个人门户',
  targetSummary: '站点入口和建设说明。',
  body: '写得很清楚，谢谢分享。',
  parentId: null,
  idempotencyKey: 'submission-00000001',
};

function review(decision: 'approve' | 'manual_review'): CommentReviewResult {
  return {
    decision,
    reasonCodes: decision === 'approve' ? [] : ['uncertain'],
    provider: 'kimi',
    model: 'test-model',
    resultType: 'success',
  };
}

function dependencies(
  events: string[],
  providerResult: CommentReviewResult | Error,
  existing: { id: string; status: 'published' | 'manual_review' } | null = null,
): SubmitCommentDependencies {
  return {
    policyVersion: '2026-08-31',
    reviewTimeoutMs: 1000,
    now: () => new Date('2026-08-31T12:00:00.000Z'),
    targetExists: async () => true,
    findPublishedParent: async () => null,
    findExistingByIdempotency: async () => existing,
    insertPending: async () => {
      events.push('insert:pending');
      return { id: 'comment-1', status: 'pending' };
    },
    transition: async (_id, _from, to) => {
      events.push(`update:${to}`);
    },
    recordReview: async (_id, result) => {
      events.push(`review:${result.decision}`);
    },
    provider: {
      review: async () => {
        events.push('provider:review');
        if (providerResult instanceof Error) throw providerResult;
        return providerResult;
      },
    },
  };
}

test('safe AI result publishes only after pending and reviewing states', async () => {
  const events: string[] = [];
  const result = await submitComment(input, actor, dependencies(events, review('approve')));
  assert.deepEqual(events, [
    'insert:pending',
    'update:ai_reviewing',
    'provider:review',
    'review:approve',
    'update:published',
  ]);
  assert.deepEqual(result, { id: 'comment-1', status: 'published', reused: false });
});

test('uncertain or throwing provider leaves a durable manual review item', async () => {
  const uncertainEvents: string[] = [];
  const uncertain = await submitComment(input, actor, dependencies(uncertainEvents, review('manual_review')));
  assert.equal(uncertain.status, 'manual_review');
  assert.deepEqual(uncertainEvents.slice(-2), ['review:manual_review', 'update:manual_review']);

  const failureEvents: string[] = [];
  const failed = await submitComment(input, actor, dependencies(failureEvents, new Error('provider body must not escape')));
  assert.equal(failed.status, 'manual_review');
  assert.deepEqual(failureEvents.slice(-2), ['review:manual_review', 'update:manual_review']);
});

test('idempotent retry reuses the existing comment without another AI request', async () => {
  const events: string[] = [];
  const result = await submitComment(
    input,
    actor,
    dependencies(events, review('approve'), { id: 'existing-comment', status: 'manual_review' }),
  );
  assert.deepEqual(result, { id: 'existing-comment', status: 'manual_review', reused: true });
  assert.deepEqual(events, []);
});

test('invalid or missing public targets fail before database insertion', async () => {
  const events: string[] = [];
  const deps = dependencies(events, review('approve'));
  deps.targetExists = async () => false;
  await assert.rejects(() => submitComment(input, actor, deps), /public comment target/);
  assert.deepEqual(events, []);
});

test('a reply must point to a published top-level comment on the same target', async () => {
  const events: string[] = [];
  const deps = dependencies(events, review('approve'));
  deps.findPublishedParent = async () => ({
    id: 'parent-1',
    parentId: 'grandparent',
    target: input.target,
  });
  await assert.rejects(
    () => submitComment({ ...input, parentId: 'parent-1' }, actor, deps),
    /published top-level comment/,
  );
  assert.deepEqual(events, []);
});
