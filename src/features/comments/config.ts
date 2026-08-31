export type CommentFeatureState = 'preview' | 'enabled';
export type PublicReviewProvider = 'openai' | 'kimi' | 'deepseek';

export interface CommentPublicConfig {
  state: CommentFeatureState;
  endpoint: string | null;
  publishableKey: string | null;
  reviewProvider: PublicReviewProvider | null;
}

type PublicCommentEnv = Record<string, string | undefined>;

export function createCommentPublicConfig(env: PublicCommentEnv): CommentPublicConfig {
  const rawState = env.PUBLIC_COMMENTS_STATE?.trim() || 'preview';
  if (rawState !== 'preview' && rawState !== 'enabled') {
    throw new Error('PUBLIC_COMMENTS_STATE must be preview or enabled');
  }

  if (rawState === 'preview') {
    return { state: 'preview', endpoint: null, publishableKey: null, reviewProvider: null };
  }

  const rawUrl = env.PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const reviewProvider = env.PUBLIC_COMMENT_REVIEW_PROVIDER?.trim();
  if (!rawUrl) throw new Error('PUBLIC_SUPABASE_URL is required when comments are enabled');
  if (!publishableKey) throw new Error('PUBLIC_SUPABASE_PUBLISHABLE_KEY is required when comments are enabled');
  if (reviewProvider !== 'openai' && reviewProvider !== 'kimi' && reviewProvider !== 'deepseek') {
    throw new Error('PUBLIC_COMMENT_REVIEW_PROVIDER must be openai, kimi, or deepseek when comments are enabled');
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('PUBLIC_SUPABASE_URL must be an approved Supabase HTTPS origin');
  }

  const approved = url.protocol === 'https:'
    && !url.username
    && !url.password
    && !url.port
    && url.pathname === '/'
    && !url.search
    && !url.hash
    && /^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname);
  if (!approved) {
    throw new Error('PUBLIC_SUPABASE_URL must be an approved Supabase HTTPS origin');
  }

  return {
    state: 'enabled',
    endpoint: url.origin,
    publishableKey,
    reviewProvider,
  };
}

export const commentPublicConfig = createCommentPublicConfig(import.meta.env ?? {});
