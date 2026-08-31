import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { remarkAdmonitions } from './src/plugins/remark-admonitions.mjs';
import { rehypeShiftHeadings } from './src/plugins/rehype-shift-headings.mjs';

try {
  process.loadEnvFile();
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const commentsEnabled = process.env.PUBLIC_COMMENTS_STATE === 'enabled';
const commentIsland = (enabledPath) => fileURLToPath(new URL(
  commentsEnabled ? enabledPath : './src/components/comments/DisabledClientIsland.astro',
  import.meta.url,
));

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://suntburst.github.io',
  output: 'static',
  outDir: 'dist',
  build: {
    inlineStylesheets: 'never',
    compressHTML: true,
  },
  integrations: [svelte(), react(), mdx()],
  markdown: {
    remarkPlugins: [remarkGfm, remarkMath, remarkAdmonitions],
    rehypePlugins: [rehypeKatex, rehypeShiftHeadings],
    remarkRehype: {
      allowDangerousHtml: false,
    },
  },
  vite: {
    resolve: {
      alias: {
        'virtual:comments-enabled-section': commentIsland('./src/components/comments/CommentsSectionEnabled.astro'),
        'virtual:comments-moderation': commentIsland('./src/components/comments/ModerationEnabled.astro'),
      },
    },
    plugins: [tailwindcss({
      lightningcss: {
        targets: {
          chrome: 49,
          android: 49,
          ios_saf: 10,
          safari: 10,
          firefox: 68,
          edge: 79,
        },
      },
    })]
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
