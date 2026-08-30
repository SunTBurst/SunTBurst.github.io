import assert from 'node:assert/strict';
import test from 'node:test';
import { findUnexpectedExternalUrls } from './helpers/external-url-audit.mjs';

test('URL audit catches unknown script, image, and API endpoints but allows content links', () => {
  const findings = findUnexpectedExternalUrls([
    {
      path: 'synthetic.html',
      text: [
        '<a href="https://articles.example/entry">ordinary content link</a>',
        '&lt;a href=&quot;https://articles.example/encoded&quot;&gt;hydration-safe content link&lt;/a&gt;',
        '<script src="https://tracker.example/collect.js"></script>',
        '<img src="https://images.example/pixel.gif">',
        '<script>fetch("https://api.example/data")</script>',
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        '<link rel="canonical" href="https://tsun.test/about/">',
      ].join('\n'),
    },
  ], 'https://tsun.test');

  assert.deepEqual(findings, [
    { path: 'synthetic.html', url: 'https://tracker.example/collect.js' },
    { path: 'synthetic.html', url: 'https://images.example/pixel.gif' },
    { path: 'synthetic.html', url: 'https://api.example/data' },
  ]);
});
