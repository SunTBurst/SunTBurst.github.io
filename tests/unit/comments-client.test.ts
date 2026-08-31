import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommentsClient, type SupabaseBrowserLike } from '../../src/services/comments/client';

function fakeSupabase(events: string[]): SupabaseBrowserLike {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithOAuth: async (options) => {
        events.push(`oauth:${options.provider}:${options.options.redirectTo}`);
        return { data: {}, error: null };
      },
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    functions: {
      invoke: async (name, options) => {
        events.push(`${name}:${JSON.stringify(options?.body ?? null)}`);
        if (name === 'list-comments') return { data: { comments: [] }, error: null };
        return { data: { comment: { id: 'comment-1', status: 'manual_review' } }, error: null };
      },
    },
  };
}

test('client uses only the four fixed Edge Function names', async () => {
  const events: string[] = [];
  const client = createCommentsClient(
    { endpoint: 'https://example.supabase.co', publishableKey: 'public-key' },
    async () => fakeSupabase(events),
  );
  const target = { kind: 'post', path: '/posts/hello/' } as const;
  await client.list(target);
  await client.submit({ target, body: '这是一条测试评论。', parentId: null, idempotencyKey: 'submission-00000001' });
  await client.delete('comment-1');
  await client.moderate({ commentId: 'comment-1', action: 'approve', reasonCode: 'safe_after_review', reasonNote: null });
  assert.deepEqual(events.map((item) => item.split(':')[0]), [
    'list-comments',
    'submit-comment',
    'delete-comment',
    'moderate-comment',
  ]);
});

test('GitHub is the only exposed OAuth provider', async () => {
  const events: string[] = [];
  const client = createCommentsClient(
    { endpoint: 'https://example.supabase.co', publishableKey: 'public-key' },
    async () => fakeSupabase(events),
  );
  await client.loginWithGitHub('https://suntburst.github.io/posts/hello/');
  assert.deepEqual(events, ['oauth:github:https://suntburst.github.io/posts/hello/']);
});

test('malformed function payloads fail closed', async () => {
  const client = createCommentsClient(
    { endpoint: 'https://example.supabase.co', publishableKey: 'public-key' },
    async () => ({
      ...fakeSupabase([]),
      functions: { invoke: async () => ({ data: { comments: 'private text' }, error: null }) },
    }),
  );
  await assert.rejects(() => client.list({ kind: 'post', path: '/posts/hello/' }), /invalid comment response/);
});

test('moderation queue parser keeps only bounded review fields', async () => {
  const client = createCommentsClient(
    { endpoint: 'https://example.supabase.co', publishableKey: 'public-key' },
    async () => ({
      ...fakeSupabase([]),
      functions: { invoke: async () => ({ data: { comments: [{
        id: 'comment-1', target_kind: 'post', target_path: '/posts/hello/',
        parent_id: null, author_login_snapshot: 'visitor', body: '待人工确认',
        status: 'manual_review', created_at: '2026-08-31T00:00:00Z', comment_reviews: [],
      }] }, error: null }) },
    }),
  );
  const queue = await client.listQueue();
  assert.deepEqual(queue[0], {
    id: 'comment-1', targetKind: 'post', targetPath: '/posts/hello/', parentId: null,
    authorLogin: 'visitor', body: '待人工确认', createdAt: '2026-08-31T00:00:00Z', reviews: [],
  });
});

test('client source contains no model provider endpoint or secret name', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(
    new URL('../../src/services/comments/client.ts', import.meta.url),
    'utf8',
  ));
  assert.doesNotMatch(source, /api\.openai\.com|api\.moonshot\.|api\.deepseek\.com/i);
  assert.doesNotMatch(source, /SERVICE_ROLE|OPENAI_API_KEY|KIMI_API_KEY|DEEPSEEK_API_KEY/i);
});
