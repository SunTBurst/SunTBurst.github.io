import assert from 'node:assert/strict';
import test from 'node:test';
import { findUnexpectedExternalUrls } from './helpers/external-url-audit.mjs';

test('URL audit catches unsafe external URLs in every emitted text format and allows only contextual standards', () => {
  const findings = findUnexpectedExternalUrls([
    {
      path: 'synthetic.html',
      text: [
        '<a href="https://articles.example/entry">ordinary content link</a>',
        '&lt;a href=&quot;https://articles.example/encoded&quot;&gt;hydration-safe content link&lt;/a&gt;',
        '<script src="https://tracker.example/collect.js"></script>',
        '<script src="//evil.example/a.js"></script>',
        '<img src="https://images.example/pixel.gif">',
        '<script>fetch("https://api.example/data")</script>',
        '<script>fetch("//evil.example/api")</script>',
        '<script src="http://www.w3.org/2000/svg/evil.js"></script>',
        '<script src="https://react.dev/errors/418"></script>',
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        '<link rel="canonical" href="https://tsun.test/about/">',
      ].join('\n'),
    },
    {
      path: 'assets/synthetic.js',
      text: [
        'document.createElementNS("http://www.w3.org/2000/svg", "svg");',
        'console.warn("https://svelte.dev/e/hydration_mismatch");',
        'fetch("http://www.w3.org/2000/svg");',
        'fetch("https://react.dev/errors/collect");',
      ].join('\n'),
    },
    {
      path: 'assets/synthetic.css',
      text: [
        '@import url("https://styles.example/base.css");',
        '@font-face { src: url("//fonts.example/font.woff2"); }',
        '.hero { background-image: url("https://images.example/hero.webp"); }',
      ].join('\n'),
    },
    {
      path: 'assets/synthetic.svg',
      text: '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://svg-assets.example/pixel.svg" /></svg>',
    },
    {
      path: 'assets/synthetic.json',
      text: '{"endpoint":"https://json-api.example/data"}',
    },
    {
      path: 'assets/synthetic.txt',
      text: 'runtime endpoint: https://text-api.example/data',
    },
  ], 'https://tsun.test');

  assert.deepEqual(findings, [
    { path: 'synthetic.html', url: 'https://tracker.example/collect.js' },
    { path: 'synthetic.html', url: '//evil.example/a.js' },
    { path: 'synthetic.html', url: 'https://images.example/pixel.gif' },
    { path: 'synthetic.html', url: 'https://api.example/data' },
    { path: 'synthetic.html', url: '//evil.example/api' },
    { path: 'synthetic.html', url: 'http://www.w3.org/2000/svg/evil.js' },
    { path: 'synthetic.html', url: 'https://react.dev/errors/418' },
    { path: 'assets/synthetic.js', url: 'http://www.w3.org/2000/svg' },
    { path: 'assets/synthetic.js', url: 'https://react.dev/errors/collect' },
    { path: 'assets/synthetic.css', url: 'https://styles.example/base.css' },
    { path: 'assets/synthetic.css', url: '//fonts.example/font.woff2' },
    { path: 'assets/synthetic.css', url: 'https://images.example/hero.webp' },
    { path: 'assets/synthetic.svg', url: 'https://svg-assets.example/pixel.svg' },
    { path: 'assets/synthetic.json', url: 'https://json-api.example/data' },
    { path: 'assets/synthetic.txt', url: 'https://text-api.example/data' },
  ]);
});

test('URL audit rejects a request that imitates the React diagnostic bundle text', () => {
  const findings = findUnexpectedExternalUrls([
    {
      path: 'assets/react-lookalike.js',
      text: 'fetch("https://react.dev/errors/"+code); throw new Error("Minified React error #"+code);',
    },
  ], 'https://tsun.test');

  assert.deepEqual(findings, [
    { path: 'assets/react-lookalike.js', url: 'https://react.dev/errors/' },
  ]);
});

test('URL audit rejects a W3C namespace assigned to a short variable and then requested', () => {
  const findings = findUnexpectedExternalUrls([
    {
      path: 'assets/namespace-lookalike.js',
      text: 'u="http://www.w3.org/2000/svg"; fetch(u);',
    },
  ], 'https://tsun.test');

  assert.deepEqual(findings, [
    { path: 'assets/namespace-lookalike.js', url: 'http://www.w3.org/2000/svg' },
  ]);
});

test('URL audit keeps encoded anchor boundaries from swallowing a later link tag', () => {
  const findings = findUnexpectedExternalUrls([
    {
      path: 'encoded-boundary.html',
      text: '&lt;a&gt;empty&lt;/a&gt;&lt;link href=&quot;https://evil.example/style.css&quot;&gt;',
    },
  ], 'https://tsun.test');

  assert.deepEqual(findings, [
    { path: 'encoded-boundary.html', url: 'https://evil.example/style.css' },
  ]);
});
