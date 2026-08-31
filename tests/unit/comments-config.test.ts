import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommentPublicConfig } from '../../src/features/comments/config';

test('comment preview needs no endpoint and emits no client configuration', () => {
  assert.deepEqual(createCommentPublicConfig({ PUBLIC_COMMENTS_STATE: 'preview' }), {
    state: 'preview',
    endpoint: null,
    publishableKey: null,
    reviewProvider: null,
  });
  assert.deepEqual(createCommentPublicConfig({}), {
    state: 'preview',
    endpoint: null,
    publishableKey: null,
    reviewProvider: null,
  });
});

test('enabled comments reject incomplete public configuration', () => {
  assert.throws(
    () => createCommentPublicConfig({ PUBLIC_COMMENTS_STATE: 'enabled' }),
    /PUBLIC_SUPABASE_URL/,
  );
  assert.throws(
    () => createCommentPublicConfig({
      PUBLIC_COMMENTS_STATE: 'enabled',
      PUBLIC_SUPABASE_URL: 'https://portal.supabase.co',
    }),
    /PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
  );
  assert.throws(
    () => createCommentPublicConfig({
      PUBLIC_COMMENTS_STATE: 'enabled',
      PUBLIC_SUPABASE_URL: 'https://portal.supabase.co',
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_value',
    }),
    /PUBLIC_COMMENT_REVIEW_PROVIDER/,
  );
});

test('enabled comments accept only a bare Supabase HTTPS origin', () => {
  const valid = createCommentPublicConfig({
    PUBLIC_COMMENTS_STATE: 'enabled',
    PUBLIC_SUPABASE_URL: 'https://portal-ref.supabase.co/',
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_value',
    PUBLIC_COMMENT_REVIEW_PROVIDER: 'deepseek',
  });
  assert.deepEqual(valid, {
    state: 'enabled',
    endpoint: 'https://portal-ref.supabase.co',
    publishableKey: 'sb_publishable_test_value',
    reviewProvider: 'deepseek',
  });

  for (const endpoint of [
    'http://portal-ref.supabase.co',
    'https://example.test',
    'https://portal-ref.supabase.co/rest/v1',
    'https://user:pass@portal-ref.supabase.co',
    'https://127.0.0.1',
  ]) {
    assert.throws(
      () => createCommentPublicConfig({
        PUBLIC_COMMENTS_STATE: 'enabled',
        PUBLIC_SUPABASE_URL: endpoint,
        PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_value',
        PUBLIC_COMMENT_REVIEW_PROVIDER: 'deepseek',
      }),
      /approved Supabase HTTPS origin/,
      endpoint,
    );
  }
});

test('unknown comment state fails instead of silently enabling or disabling behavior', () => {
  assert.throws(
    () => createCommentPublicConfig({ PUBLIC_COMMENTS_STATE: 'ready' }),
    /PUBLIC_COMMENTS_STATE/,
  );
});
