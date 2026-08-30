import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const TEXT_ARTIFACT_PATTERN = /\.(?:astro|css|html|js|json|mjs|svg|svelte|ts|tsx|txt|xml)$/i;
const RUNTIME_SCRIPT_PATTERN = /\.(?:astro|js|mjs|svelte|ts|tsx)$/i;
const RUNTIME_MARKUP_PATTERN = /\.(?:html|svg|xml)$/i;
const URL_PATTERN = /(?:https?:)?\/\/[^\s"'<>`)\\\]]+/g;
const CONTENT_LINK_PATTERN = /<a\b(?:(?!>)[\s\S])*?\bhref\s*=\s*(["'])\s*((?:https?:)?\/\/[^\s"'<>`)\\\]]+)\s*\1/gi;
const XML_NAMESPACE_PATTERN = /\bxmlns(?::[\w.-]+)?\s*=\s*(["'])\s*(https?:\/\/[^\s"'<>`)\\\]]+)\s*\1/gi;

const XML_NAMESPACES = new Set([
  'http://purl.org/dc/elements/1.1/',
  'http://purl.org/rss/1.0/modules/content/',
  'http://www.sitemaps.org/schemas/sitemap/0.9',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/2005/Atom',
  'http://www.w3.org/XML/1998/namespace',
]);

const JS_VENDOR_URLS = new Set([
  'https://react.dev/errors/',
  'https://svelte.dev/e/',
  'https://svelte.dev/e/async_derived_orphan',
  'https://svelte.dev/e/derived_inert',
  'https://svelte.dev/e/each_key_duplicate',
  'https://svelte.dev/e/effect_in_teardown',
  'https://svelte.dev/e/effect_in_unowned_derived',
  'https://svelte.dev/e/effect_orphan',
  'https://svelte.dev/e/effect_update_depth_exceeded',
  'https://svelte.dev/e/hydration_failed',
  'https://svelte.dev/e/hydration_mismatch',
  'https://svelte.dev/e/lifecycle_legacy_only',
  'https://svelte.dev/e/lifecycle_outside_component',
  'https://svelte.dev/e/props_invalid_value',
  'https://svelte.dev/e/state_descriptors_fixed',
  'https://svelte.dev/e/state_prototype_fixed',
  'https://svelte.dev/e/state_unsafe_mutation',
  'https://svelte.dev/e/svelte_boundary_reset_noop',
  'https://svelte.dev/e/svelte_boundary_reset_onerror',
]);

const RUNTIME_SINK_PATTERNS = [
  { sink: 'fetch', pattern: /(?<![\w$])fetch(?![\w$])/ },
  { sink: 'XMLHttpRequest', pattern: /(?<![\w$])XMLHttpRequest(?![\w$])/ },
  { sink: 'WebSocket', pattern: /(?<![\w$])WebSocket(?![\w$])/ },
  { sink: 'EventSource', pattern: /(?<![\w$])EventSource(?![\w$])/ },
  { sink: 'sendBeacon', pattern: /(?<![\w$])sendBeacon(?![\w$])/ },
  { sink: 'importScripts', pattern: /(?<![\w$])importScripts(?![\w$])/ },
  { sink: 'Worker', pattern: /(?<![\w$])Worker(?![\w$])/ },
  { sink: 'SharedWorker', pattern: /(?<![\w$])SharedWorker(?![\w$])/ },
  { sink: 'serviceWorker.register', pattern: /(?<![\w$])serviceWorker\s*(?:\.|\?\.)\s*register(?![\w$])/ },
];

function extractExecutableMarkupText(text) {
  const executableParts = [];

  for (const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    executableParts.push(match[1]);
  }

  let position = 0;
  while (position < text.length) {
    const tagStart = text.indexOf('<', position);
    if (tagStart === -1) break;
    if (!/[a-z]/i.test(text[tagStart + 1] ?? '')) {
      position = tagStart + 1;
      continue;
    }

    let quote = '';
    let tagEnd = tagStart + 1;
    for (; tagEnd < text.length; tagEnd += 1) {
      const character = text[tagEnd];
      if (quote) {
        if (character === quote) quote = '';
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '>') {
        break;
      }
    }
    if (tagEnd >= text.length) break;

    const tag = text.slice(tagStart + 1, tagEnd);
    let cursor = tag.search(/\s/);
    if (cursor === -1) {
      position = tagEnd + 1;
      continue;
    }

    while (cursor < tag.length) {
      while (/\s/.test(tag[cursor] ?? '')) cursor += 1;
      const nameStart = cursor;
      while (cursor < tag.length && !/[\s=]/.test(tag[cursor])) cursor += 1;
      const name = tag.slice(nameStart, cursor);
      while (/\s/.test(tag[cursor] ?? '')) cursor += 1;

      let value = '';
      if (tag[cursor] === '=') {
        cursor += 1;
        while (/\s/.test(tag[cursor] ?? '')) cursor += 1;
        const valueQuote = tag[cursor] === '"' || tag[cursor] === "'" ? tag[cursor] : '';
        if (valueQuote) {
          cursor += 1;
          const valueStart = cursor;
          while (cursor < tag.length && tag[cursor] !== valueQuote) cursor += 1;
          value = tag.slice(valueStart, cursor);
          if (cursor < tag.length) cursor += 1;
        } else {
          const valueStart = cursor;
          while (cursor < tag.length && !/\s/.test(tag[cursor])) cursor += 1;
          value = tag.slice(valueStart, cursor);
        }
      }

      if (/^on[a-z][\w:.-]*$/i.test(name)) executableParts.push(value);
    }

    position = tagEnd + 1;
  }

  return executableParts.join('\n');
}

function trimUrl(url) {
  return url.replace(/[.,;:]+$/, '');
}

function captureOffset(match, captureIndex) {
  return match.index + match[0].lastIndexOf(match[captureIndex]);
}

function normalizeMarkupEntities(text) {
  return text.replace(/&(?:lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (entity) => {
    const name = entity.slice(1, -1).toLowerCase();
    let character;

    if (name === 'lt') character = '<';
    else if (name === 'gt') character = '>';
    else if (name === 'quot') character = '"';
    else if (name === 'apos') character = "'";
    else {
      const radix = name.startsWith('#x') ? 16 : 10;
      const digits = name.slice(radix === 16 ? 2 : 1);
      const codePoint = Number.parseInt(digits, radix);
      if (!Number.isInteger(codePoint) || codePoint > 0x10ffff) return entity;
      character = String.fromCodePoint(codePoint);
    }

    if (!['<', '>', '"', "'"].includes(character)) return entity;
    return `${' '.repeat(entity.length - character.length)}${character}`;
  });
}

function isJavaScriptVendorUrl(pathname, url) {
  if (!/\.js$/i.test(pathname)) return false;
  return XML_NAMESPACES.has(url) || JS_VENDOR_URLS.has(url);
}

export function collectTextArtifacts(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTextArtifacts(target, root);
    if (!TEXT_ARTIFACT_PATTERN.test(entry.name)) return [];
    return [{ path: path.relative(root, target).replaceAll('\\', '/'), text: readFileSync(target, 'utf8') }];
  });
}

export function findUnexpectedRuntimeSinks(artifacts) {
  const findings = [];

  for (const artifact of artifacts) {
    let executableText;
    if (RUNTIME_SCRIPT_PATTERN.test(artifact.path)) executableText = artifact.text;
    else if (RUNTIME_MARKUP_PATTERN.test(artifact.path)) executableText = extractExecutableMarkupText(artifact.text);
    else continue;

    for (const { sink, pattern } of RUNTIME_SINK_PATTERNS) {
      if (pattern.test(executableText)) findings.push({ path: artifact.path, sink });
    }
  }

  return findings;
}

export function findUnexpectedExternalUrls(artifacts, siteUrl) {
  const siteOrigin = new URL(siteUrl).origin;
  const findings = [];

  for (const artifact of artifacts) {
    const { path: artifactPath, text } = artifact;
    const normalizedText = normalizeMarkupEntities(text);
    const hasRuntimeSink = findUnexpectedRuntimeSinks([artifact]).length > 0;
    const contentLinkPositions = new Set(
      Array.from(normalizedText.matchAll(CONTENT_LINK_PATTERN), (match) => captureOffset(match, 2)),
    );
    const namespacePositions = new Set(
      Array.from(normalizedText.matchAll(XML_NAMESPACE_PATTERN))
        .filter((match) => XML_NAMESPACES.has(trimUrl(match[2])))
        .map((match) => captureOffset(match, 2)),
    );

    for (const match of normalizedText.matchAll(URL_PATTERN)) {
      const url = trimUrl(match[0]);
      if (new URL(url, siteOrigin).origin === siteOrigin) continue;
      if (contentLinkPositions.has(match.index)) continue;
      if (namespacePositions.has(match.index)) continue;
      if (!hasRuntimeSink && isJavaScriptVendorUrl(artifactPath, url)) continue;
      findings.push({ path: artifactPath, url });
    }
  }

  return findings;
}
