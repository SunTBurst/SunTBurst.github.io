import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { remarkAdmonitions } from './src/plugins/remark-admonitions.mjs';
import { rehypeShiftHeadings } from './src/plugins/rehype-shift-headings.mjs';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  outDir: 'dist',
  build: {
    inlineStylesheets: 'never',
    compressHTML: true,
  },
  integrations: [svelte(), mdx()],
  markdown: {
    remarkPlugins: [remarkGfm, remarkMath, remarkAdmonitions],
    rehypePlugins: [rehypeKatex, rehypeShiftHeadings],
  },
  vite: {
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
