import assert from 'node:assert/strict';
import test from 'node:test';
import * as externalUrlAudit from './helpers/external-url-audit.mjs';

const { findUnexpectedExternalUrls } = externalUrlAudit;

function findRuntimeSinks(artifacts) {
  assert.equal(
    typeof externalUrlAudit.findUnexpectedRuntimeSinks,
    'function',
    'expected the artifact audit to expose the zero-network-sink check',
  );
  return externalUrlAudit.findUnexpectedRuntimeSinks(artifacts);
}

test('URL audit catches unsafe runtime-loading URLs and allows contextual standards or prose', () => {
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
      path: 'assets/vendor-strings.js',
      text: [
        'document.createElementNS("http://www.w3.org/2000/svg", "svg");',
        'console.warn("https://svelte.dev/e/hydration_mismatch");',
      ].join('\n'),
    },
    {
      path: 'assets/synthetic.js',
      text: [
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

test('URL audit leaves encoded markup as documentation text', () => {
  const findings = findUnexpectedExternalUrls([
    {
      path: 'encoded-boundary.html',
      text: '&lt;a&gt;empty&lt;/a&gt;&lt;link href=&quot;https://evil.example/style.css&quot;&gt;',
    },
  ], 'https://tsun.test');

  assert.deepEqual(findings, []);
});

test('URL audit rejects a full React diagnostic builder when its artifact can fetch', () => {
  const artifacts = [
    {
      path: 'assets/react-builder-lookalike.js',
      text: 'function E(e){var T="https://react.dev/errors/"+e;if(1<arguments.length){T+="?args[]="+encodeURIComponent(arguments[1])}fetch(T);return"Minified React error #"+e+"; visit "+T+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}',
    },
  ];

  assert.deepEqual(findUnexpectedExternalUrls(artifacts, 'https://tsun.test'), [
    { path: 'assets/react-builder-lookalike.js', url: 'https://react.dev/errors/' },
  ]);
  assert.deepEqual(findRuntimeSinks(artifacts), [
    { path: 'assets/react-builder-lookalike.js', sink: 'fetch' },
  ]);
});

test('URL audit rejects namespace constants when a DOM-looking relay is backed by fetch', () => {
  const artifacts = [
    {
      path: 'assets/namespace-relay-lookalike.js',
      text: 'const X="http://www.w3.org/1999/xhtml",S="http://www.w3.org/2000/svg",M="http://www.w3.org/1998/Math/MathML";const relay={createElementNS:fetch};relay.createElementNS(X,"html");relay.createElementNS(S,"svg");relay.createElementNS(M,"math");',
    },
  ];

  assert.deepEqual(findUnexpectedExternalUrls(artifacts, 'https://tsun.test'), [
    { path: 'assets/namespace-relay-lookalike.js', url: 'http://www.w3.org/1999/xhtml' },
    { path: 'assets/namespace-relay-lookalike.js', url: 'http://www.w3.org/2000/svg' },
    { path: 'assets/namespace-relay-lookalike.js', url: 'http://www.w3.org/1998/Math/MathML' },
  ]);
  assert.deepEqual(findRuntimeSinks(artifacts), [
    { path: 'assets/namespace-relay-lookalike.js', sink: 'fetch' },
  ]);
});

test('URL audit leaves numeric-entity markup as documentation text', () => {
  const findings = findUnexpectedExternalUrls([
    {
      path: 'numeric-encoded-boundary.html',
      text: '&lt;a&#62;empty&lt;/a&#x3e;&lt;link href=&quot;https://evil.example/numeric.css&quot;&#62;',
    },
  ], 'https://tsun.test');

  assert.deepEqual(findings, []);
});

test('runtime sink audit detects browser network capabilities without URL literals', () => {
  const findings = findRuntimeSinks([
    {
      path: 'assets/network-capabilities.js',
      text: [
        'fetch(endpoint);',
        'const request = fetch; request(endpoint);',
        'new XMLHttpRequest();',
        'new WebSocket(socketUrl);',
        'new EventSource(eventsUrl);',
        'navigator.sendBeacon(beaconUrl, payload);',
        'importScripts(workerUrl);',
        'new Worker(workerUrl);',
        'new SharedWorker(sharedWorkerUrl);',
        'navigator.serviceWorker.register(serviceWorkerUrl);',
      ].join('\n'),
    },
  ]);

  assert.deepEqual(findings, [
    { path: 'assets/network-capabilities.js', sink: 'fetch' },
    { path: 'assets/network-capabilities.js', sink: 'XMLHttpRequest' },
    { path: 'assets/network-capabilities.js', sink: 'WebSocket' },
    { path: 'assets/network-capabilities.js', sink: 'EventSource' },
    { path: 'assets/network-capabilities.js', sink: 'sendBeacon' },
    { path: 'assets/network-capabilities.js', sink: 'importScripts' },
    { path: 'assets/network-capabilities.js', sink: 'Worker' },
    { path: 'assets/network-capabilities.js', sink: 'SharedWorker' },
    { path: 'assets/network-capabilities.js', sink: 'serviceWorker.register' },
  ]);
});

test('runtime sink audit inspects executable HTML without flagging code examples', () => {
  const findings = findRuntimeSinks([
    {
      path: 'synthetic.html',
      text: [
        '<script>fetch(endpoint)</script>',
        '<button onclick="fetch(endpoint)">unsafe handler</button>',
        '<pre><code>fetch(endpoint)</code></pre>',
      ].join('\n'),
    },
    {
      path: 'code-example-only.html',
      text: '<pre><code>fetch(endpoint)</code></pre>',
    },
  ]);

  assert.deepEqual(findings, [
    { path: 'synthetic.html', sink: 'fetch' },
  ]);
});

test('runtime sink audit detects ordinary and optional-chained service worker registration', () => {
  const findings = findRuntimeSinks([
    {
      path: 'assets/service-worker-ordinary.js',
      text: 'navigator.serviceWorker.register(endpoint);',
    },
    {
      path: 'assets/service-worker-optional.js',
      text: 'navigator.serviceWorker?.register(endpoint);',
    },
  ]);

  assert.deepEqual(findings, [
    { path: 'assets/service-worker-ordinary.js', sink: 'serviceWorker.register' },
    { path: 'assets/service-worker-optional.js', sink: 'serviceWorker.register' },
  ]);
});

test('URL audit ignores prose endpoints while retaining executable markup, script, and stylesheet loads', () => {
  const findings = findUnexpectedExternalUrls([
    {
      path: 'article.html',
      text: [
        '<p>本机 Gateway 地址通常为 <code>http://127.0.0.1:18789/v1</code>。</p>',
        '<pre><code>fetch("http://127.0.0.1:18789/v1")</code></pre>',
        '&lt;img src=&quot;https://documentation.example/not-a-request.png&quot;&gt;',
        '<script src="https://tracker.example/collect.js"></script>',
        '<img src="https://images.example/pixel.gif">',
        '<img src=https://images.example/no-quotes.gif>',
        '<img srcset="https://images.example/one.webp 1x, https://images.example/two.webp 2x">',
        '<svg><use href="https://icons.example/sprite.svg#symbol" /></svg>',
        '<style>.hero { background-image: url(https://inline-styles.example/block.webp); }</style>',
        '<div style="background-image:url(https://inline-styles.example/hero.webp)"></div>',
      ].join('\n'),
    },
    {
      path: 'assets/runtime.js',
      text: 'const endpoint = "https://api.example/data";',
    },
    {
      path: 'assets/site.css',
      text: '.hero { background-image: url("https://images.example/hero.webp"); }',
    },
    {
      path: 'portal-index.json',
      text: '{"documentationExample":"http://127.0.0.1:18789/v1"}',
    },
  ], 'https://tsun.test');

  assert.deepEqual(findings, [
    { path: 'article.html', url: 'https://tracker.example/collect.js' },
    { path: 'article.html', url: 'https://images.example/pixel.gif' },
    { path: 'article.html', url: 'https://images.example/no-quotes.gif' },
    { path: 'article.html', url: 'https://images.example/one.webp' },
    { path: 'article.html', url: 'https://images.example/two.webp' },
    { path: 'article.html', url: 'https://icons.example/sprite.svg#symbol' },
    { path: 'article.html', url: 'https://inline-styles.example/block.webp' },
    { path: 'article.html', url: 'https://inline-styles.example/hero.webp' },
    { path: 'assets/runtime.js', url: 'https://api.example/data' },
    { path: 'assets/site.css', url: 'https://images.example/hero.webp' },
  ]);
});
