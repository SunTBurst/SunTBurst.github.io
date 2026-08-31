import { createCommentReviewProvider } from '../comment-review/providers.ts';
import type { CommentReviewProvider, CommentReviewProviderConfig } from '../comment-review/types.ts';

interface DenoRuntime {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
}

function denoRuntime(): DenoRuntime {
  const runtime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno;
  if (!runtime) throw new Error('Deno runtime is required');
  return runtime;
}

export function env(name: string): string {
  const value = denoRuntime().env.get(name)?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return denoRuntime().env.get(name)?.trim() || undefined;
}

export function serve(handler: (request: Request) => Response | Promise<Response>): void {
  denoRuntime().serve(handler);
}

export const COMMENT_MODERATOR_GITHUB_IDS = new Set([105589585]);
export const COMMENT_POLICY_VERSION = '2026-08-31';

export function reviewTimeoutMs(): number {
  const parsed = Number(optionalEnv('COMMENT_REVIEW_TIMEOUT_MS') ?? '12000');
  return Number.isFinite(parsed) && parsed >= 1000 && parsed <= 30000 ? Math.floor(parsed) : 12000;
}

export function configuredReviewProvider(): CommentReviewProvider {
  const provider = env('COMMENT_REVIEW_PROVIDER');
  let config: CommentReviewProviderConfig;
  if (provider === 'openai') {
    config = {
      provider,
      apiKey: env('OPENAI_API_KEY'),
      moderationModel: optionalEnv('OPENAI_MODERATION_MODEL') ?? 'omni-moderation-latest',
      policyModel: optionalEnv('OPENAI_POLICY_MODEL') ?? 'gpt-4.1-mini',
    };
  } else if (provider === 'kimi') {
    const region = optionalEnv('KIMI_REGION') === 'global' ? 'global' : 'cn';
    config = {
      provider,
      apiKey: env('KIMI_API_KEY'),
      model: optionalEnv('KIMI_REVIEW_MODEL') ?? 'moonshot-v1-8k',
      region,
    };
  } else if (provider === 'deepseek') {
    config = {
      provider,
      apiKey: env('DEEPSEEK_API_KEY'),
      model: optionalEnv('DEEPSEEK_REVIEW_MODEL') ?? 'deepseek-chat',
    };
  } else {
    throw new Error('Unsupported comment review provider');
  }
  return createCommentReviewProvider(config);
}
