import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteOwnComment,
  moderateComment,
  type ModerationDependencies,
} from '../../supabase/functions/_shared/comments/moderate';

function dependencies(events: string[]): ModerationDependencies {
  return {
    moderatorGithubIds: new Set([105589585]),
    moderateAtomically: async (input) => {
      events.push(`${input.action}:${input.nextStatus}`);
      return { id: input.commentId, status: input.nextStatus };
    },
    deleteOwnAtomically: async (commentId, userId) => {
      events.push(`author_delete:${commentId}:${userId}`);
      return { id: commentId, status: 'deleted' };
    },
  };
}

test('only the immutable GitHub ID can moderate', async () => {
  const events: string[] = [];
  const deps = dependencies(events);
  await assert.rejects(
    () => moderateComment(
      { commentId: 'comment-1', action: 'approve', reasonCode: 'safe_after_review', reasonNote: null },
      { userId: 'user-x', githubId: 7 },
      deps,
    ),
    /forbidden/,
  );
  assert.deepEqual(events, []);
});

test('moderator actions map to exact durable states and carry a reason', async () => {
  const events: string[] = [];
  const deps = dependencies(events);
  const actor = { userId: 'owner-auth-id', githubId: 105589585 };

  assert.equal((await moderateComment(
    { commentId: 'comment-1', action: 'approve', reasonCode: 'safe_after_review', reasonNote: '人工确认内容安全' },
    actor,
    deps,
  )).status, 'published');
  assert.equal((await moderateComment(
    { commentId: 'comment-2', action: 'reject', reasonCode: 'promotion', reasonNote: null },
    actor,
    deps,
  )).status, 'rejected');
  assert.equal((await moderateComment(
    { commentId: 'comment-3', action: 'delete', reasonCode: 'privacy_request', reasonNote: null },
    actor,
    deps,
  )).status, 'deleted');
  assert.deepEqual(events, ['approve:published', 'reject:rejected', 'delete:deleted']);
});

test('moderation requires stable identifiers and a bounded reason', async () => {
  const deps = dependencies([]);
  const actor = { userId: 'owner-auth-id', githubId: 105589585 };
  await assert.rejects(
    () => moderateComment({ commentId: '', action: 'approve', reasonCode: 'safe', reasonNote: null }, actor, deps),
    /comment ID/,
  );
  await assert.rejects(
    () => moderateComment({ commentId: 'comment-1', action: 'approve', reasonCode: '', reasonNote: null }, actor, deps),
    /reason code/,
  );
  await assert.rejects(
    () => moderateComment({ commentId: 'comment-1', action: 'approve', reasonCode: 'safe', reasonNote: 'a'.repeat(241) }, actor, deps),
    /reason note/,
  );
});

test('an authenticated author can delete only through the owner-scoped repository operation', async () => {
  const events: string[] = [];
  const result = await deleteOwnComment('comment-1', { userId: 'author-1' }, dependencies(events));
  assert.deepEqual(result, { id: 'comment-1', status: 'deleted' });
  assert.deepEqual(events, ['author_delete:comment-1:author-1']);
});
