/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_BUILD_SHA?: string;
  readonly PUBLIC_COMMENTS_STATE?: 'preview' | 'enabled';
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly PUBLIC_COMMENT_REVIEW_PROVIDER?: 'openai' | 'kimi' | 'deepseek';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'virtual:comments-enabled-section' {
  const Component: any;
  export default Component;
}

declare module 'virtual:comments-moderation' {
  const Component: any;
  export default Component;
}
