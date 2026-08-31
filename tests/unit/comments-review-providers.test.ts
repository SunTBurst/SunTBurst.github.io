import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCommentReviewProvider,
  parsePolicyReview,
} from '../../supabase/functions/_shared/comment-review/providers';
import type { CommentReviewInput } from '../../supabase/functions/_shared/comment-review/types';

const input: CommentReviewInput = {
  body: '这篇文章的知识地图很清楚，谢谢分享。',
  target: {
    kind: 'post',
    title: '个人门户地图',
    summary: '介绍网站的公开内容与探索路线。',
  },
  policyVersion: '2026-08-31',
};

function chatResponse(content: unknown, requestId = 'request-test') {
  return new Response(JSON.stringify({
    choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  });
}

test('strict policy parser accepts only two exact fields and two decisions', () => {
  assert.deepEqual(
    parsePolicyReview({ decision: 'approve', reason_codes: [] }, 'kimi', 'kimi-review'),
    {
      decision: 'approve',
      reasonCodes: [],
      provider: 'kimi',
      model: 'kimi-review',
      resultType: 'success',
    },
  );
  assert.equal(
    parsePolicyReview({ decision: 'manual_review', reason_codes: ['uncertain', 'uncertain'] }, 'deepseek', 'deepseek-review').reasonCodes.length,
    1,
  );
  assert.throws(() => parsePolicyReview({ decision: 'reject', reason_codes: [] }, 'kimi', 'model'));
  assert.throws(() => parsePolicyReview({ decision: 'approve', reason_codes: [], analysis: 'hidden' }, 'kimi', 'model'));
  assert.throws(() => parsePolicyReview({ decision: 'manual_review', reason_codes: ['unknown_reason'] }, 'kimi', 'model'));
  assert.throws(() => parsePolicyReview({ decision: 'manual_review', reason_codes: [] }, 'kimi', 'model'));
});

test('Kimi uses only the selected fixed regional origin and structured chat request', async () => {
  const requests: Request[] = [];
  const provider = createCommentReviewProvider({
    provider: 'kimi',
    apiKey: 'test-kimi-key',
    model: 'kimi-review',
    region: 'cn',
  }, async (request) => {
    requests.push(request instanceof Request ? request : new Request(request));
    return chatResponse({ decision: 'approve', reason_codes: [] });
  });

  const result = await provider.review(input, AbortSignal.timeout(1000));
  assert.equal(result.decision, 'approve');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.moonshot.cn/v1/chat/completions');
  const requestBody = await requests[0].clone().json();
  assert.equal(requestBody.temperature, 0);
  assert.equal(requestBody.tools, undefined);
  assert.deepEqual(requestBody.response_format, { type: 'json_object' });
  assert.doesNotMatch(JSON.stringify(result), /test-kimi-key|request-test/);
  assert.match(result.requestIdHash ?? '', /^[a-f0-9]{64}$/);
});

test('DeepSeek uses its fixed origin and returns a normalized manual review decision', async () => {
  const urls: string[] = [];
  const provider = createCommentReviewProvider({
    provider: 'deepseek',
    apiKey: 'test-deepseek-key',
    model: 'deepseek-chat',
  }, async (request) => {
    urls.push(request instanceof Request ? request.url : String(request));
    return chatResponse({ decision: 'manual_review', reason_codes: ['off_topic'] });
  });
  const result = await provider.review(input, AbortSignal.timeout(1000));
  assert.equal(urls[0], 'https://api.deepseek.com/v1/chat/completions');
  assert.deepEqual(result.reasonCodes, ['off_topic']);
  assert.equal(result.provider, 'deepseek');
});

test('OpenAI moderation flags content without calling the policy model', async () => {
  const urls: string[] = [];
  const provider = createCommentReviewProvider({
    provider: 'openai',
    apiKey: 'test-openai-key',
    moderationModel: 'omni-moderation-latest',
    policyModel: 'test-policy-model',
  }, async (request) => {
    urls.push(request instanceof Request ? request.url : String(request));
    return new Response(JSON.stringify({
      id: 'moderation-request',
      results: [{ flagged: true }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const result = await provider.review(input, AbortSignal.timeout(1000));
  assert.deepEqual(urls, ['https://api.openai.com/v1/moderations']);
  assert.equal(result.decision, 'manual_review');
  assert.deepEqual(result.reasonCodes, ['unsafe_content']);
});

test('OpenAI unflagged content receives the same strict policy review', async () => {
  const urls: string[] = [];
  const provider = createCommentReviewProvider({
    provider: 'openai',
    apiKey: 'test-openai-key',
    moderationModel: 'omni-moderation-latest',
    policyModel: 'test-policy-model',
  }, async (request) => {
    const url = request instanceof Request ? request.url : String(request);
    urls.push(url);
    if (url.endsWith('/moderations')) {
      return new Response(JSON.stringify({ results: [{ flagged: false }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return chatResponse({ decision: 'approve', reason_codes: [] });
  });
  const result = await provider.review(input, AbortSignal.timeout(1000));
  assert.deepEqual(urls, [
    'https://api.openai.com/v1/moderations',
    'https://api.openai.com/v1/chat/completions',
  ]);
  assert.equal(result.decision, 'approve');
});

test('provider errors and malformed responses fail closed without a second provider call', async () => {
  let calls = 0;
  const failing = createCommentReviewProvider({
    provider: 'kimi',
    apiKey: 'test-kimi-key',
    model: 'kimi-review',
    region: 'global',
  }, async () => {
    calls += 1;
    return new Response('upstream failed', { status: 500 });
  });
  const failed = await failing.review(input, AbortSignal.timeout(1000));
  assert.equal(calls, 1);
  assert.equal(failed.decision, 'manual_review');
  assert.deepEqual(failed.reasonCodes, ['provider_error']);
  assert.equal(failed.resultType, 'provider_error');

  const malformed = createCommentReviewProvider({
    provider: 'deepseek',
    apiKey: 'test-deepseek-key',
    model: 'deepseek-chat',
  }, async () => chatResponse('not json'));
  const invalid = await malformed.review(input, AbortSignal.timeout(1000));
  assert.equal(invalid.decision, 'manual_review');
  assert.deepEqual(invalid.reasonCodes, ['invalid_response']);
  assert.equal(invalid.resultType, 'invalid_response');
});
