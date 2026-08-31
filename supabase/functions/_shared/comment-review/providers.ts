import { buildCommentReviewMessages } from './policy.ts';
import {
  REVIEW_REASON_CODES,
  type CommentReviewInput,
  type CommentReviewProvider,
  type CommentReviewProviderConfig,
  type CommentReviewProviderName,
  type CommentReviewResult,
  type CommentReviewResultType,
  type ReviewReasonCode,
} from './types.ts';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const PROVIDER_ORIGINS = {
  openai: 'https://api.openai.com',
  kimiCn: 'https://api.moonshot.cn',
  kimiGlobal: 'https://api.moonshot.ai',
  deepseek: 'https://api.deepseek.com',
} as const;

class ReviewProviderError extends Error {
  constructor(readonly resultType: Exclude<CommentReviewResultType, 'success'>) {
    super(resultType);
  }
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReasonCode(value: unknown): value is ReviewReasonCode {
  return typeof value === 'string' && REVIEW_REASON_CODES.includes(value as ReviewReasonCode);
}

export function parsePolicyReview(
  value: unknown,
  provider: CommentReviewProviderName,
  model: string,
): CommentReviewResult {
  if (!plainObject(value)) throw new ReviewProviderError('invalid_response');
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== 'decision' || keys[1] !== 'reason_codes') {
    throw new ReviewProviderError('invalid_response');
  }
  if (value.decision !== 'approve' && value.decision !== 'manual_review') {
    throw new ReviewProviderError('invalid_response');
  }
  if (!Array.isArray(value.reason_codes) || !value.reason_codes.every(isReasonCode)) {
    throw new ReviewProviderError('invalid_response');
  }
  const reasonCodes = [...new Set(value.reason_codes)];
  if ((value.decision === 'approve' && reasonCodes.length !== 0)
    || (value.decision === 'manual_review' && reasonCodes.length === 0)) {
    throw new ReviewProviderError('invalid_response');
  }
  return {
    decision: value.decision,
    reasonCodes,
    provider,
    model,
    resultType: 'success',
  };
}

function validateConfig(config: CommentReviewProviderConfig) {
  if (!config.apiKey.trim()) throw new Error(`${config.provider} API key is required`);
  const model = config.provider === 'openai' ? config.policyModel : config.model;
  if (!model.trim()) throw new Error(`${config.provider} review model is required`);
  if (config.provider === 'openai' && !config.moderationModel.trim()) {
    throw new Error('OpenAI moderation model is required');
  }
}

function failureResult(
  provider: CommentReviewProviderName,
  model: string,
  resultType: Exclude<CommentReviewResultType, 'success'>,
): CommentReviewResult {
  return {
    decision: 'manual_review',
    reasonCodes: [resultType === 'invalid_response' ? 'invalid_response' : 'provider_error'],
    provider,
    model,
    resultType,
  };
}

async function sha256(value: string | null): Promise<string | undefined> {
  if (!value) return undefined;
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function requestJson(
  fetchImpl: FetchLike,
  url: string,
  apiKey: string,
  body: unknown,
  signal: AbortSignal,
): Promise<{ value: unknown; requestIdHash?: string }> {
  let response: Response;
  try {
    response = await fetchImpl(new Request(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    }));
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new ReviewProviderError('timeout');
    }
    throw new ReviewProviderError('provider_error');
  }
  if (!response.ok) throw new ReviewProviderError('provider_error');
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new ReviewProviderError('invalid_response');
  }
  const requestId = response.headers.get('x-request-id')
    ?? (plainObject(value) && typeof value.id === 'string' ? value.id : null);
  return { value, requestIdHash: await sha256(requestId) };
}

function extractChatPolicy(value: unknown): unknown {
  if (!plainObject(value) || !Array.isArray(value.choices)) throw new ReviewProviderError('invalid_response');
  const first = value.choices[0];
  if (!plainObject(first) || !plainObject(first.message) || typeof first.message.content !== 'string') {
    throw new ReviewProviderError('invalid_response');
  }
  try {
    return JSON.parse(first.message.content);
  } catch {
    throw new ReviewProviderError('invalid_response');
  }
}

async function chatReview(
  fetchImpl: FetchLike,
  url: string,
  apiKey: string,
  provider: CommentReviewProviderName,
  model: string,
  input: CommentReviewInput,
  signal: AbortSignal,
  openAi = false,
): Promise<CommentReviewResult> {
  const tokenLimit = openAi ? { max_completion_tokens: 1200 } : { max_tokens: 1200 };
  const response = await requestJson(fetchImpl, url, apiKey, {
    model,
    messages: buildCommentReviewMessages(input),
    temperature: 0,
    response_format: { type: 'json_object' },
    ...tokenLimit,
  }, signal);
  return {
    ...parsePolicyReview(extractChatPolicy(response.value), provider, model),
    ...(response.requestIdHash ? { requestIdHash: response.requestIdHash } : {}),
  };
}

export function createCommentReviewProvider(
  config: CommentReviewProviderConfig,
  fetchImpl: FetchLike = fetch,
): CommentReviewProvider {
  validateConfig(config);
  const model = config.provider === 'openai' ? config.policyModel : config.model;

  return {
    async review(input, signal) {
      try {
        if (config.provider === 'openai') {
          const moderation = await requestJson(
            fetchImpl,
            `${PROVIDER_ORIGINS.openai}/v1/moderations`,
            config.apiKey,
            { model: config.moderationModel, input: input.body },
            signal,
          );
          const result = plainObject(moderation.value)
            && Array.isArray(moderation.value.results)
            ? moderation.value.results[0]
            : null;
          if (!plainObject(result) || typeof result.flagged !== 'boolean') {
            throw new ReviewProviderError('invalid_response');
          }
          if (result.flagged) {
            return {
              decision: 'manual_review',
              reasonCodes: ['unsafe_content'],
              provider: 'openai',
              model: config.moderationModel,
              resultType: 'success',
              ...(moderation.requestIdHash ? { requestIdHash: moderation.requestIdHash } : {}),
            };
          }
          return await chatReview(
            fetchImpl,
            `${PROVIDER_ORIGINS.openai}/v1/chat/completions`,
            config.apiKey,
            'openai',
            config.policyModel,
            input,
            signal,
            true,
          );
        }

        if (config.provider === 'kimi') {
          const origin = config.region === 'cn' ? PROVIDER_ORIGINS.kimiCn : PROVIDER_ORIGINS.kimiGlobal;
          return await chatReview(
            fetchImpl,
            `${origin}/v1/chat/completions`,
            config.apiKey,
            'kimi',
            config.model,
            input,
            signal,
          );
        }

        return await chatReview(
          fetchImpl,
          `${PROVIDER_ORIGINS.deepseek}/v1/chat/completions`,
          config.apiKey,
          'deepseek',
          config.model,
          input,
          signal,
        );
      } catch (error) {
        const resultType = error instanceof ReviewProviderError ? error.resultType : 'provider_error';
        return failureResult(config.provider, model, resultType);
      }
    },
  };
}
