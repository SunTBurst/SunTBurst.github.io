/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_BUILD_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
