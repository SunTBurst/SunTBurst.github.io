/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_BUILD_SHA?: string;
  readonly PUBLIC_COMMENTS_STATE?: 'preview' | 'enabled';
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
