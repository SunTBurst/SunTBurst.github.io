import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const TEXT_ARTIFACT_PATTERN = /\.(?:css|html|js|json|svg|txt|xml)$/i;
const URL_PATTERN = /(?:https?:)?\/\/[^\s"'<>`)\\\]]+/g;
const CONTENT_LINK_PATTERN = /(?:<|&lt;)a\b[^>]*?\bhref=(?:"|&quot;)((?:https?:)?\/\/[^\s"'<>`)\\\]]+)/gi;
const XML_NAMESPACE_PATTERN = /\bxmlns(?::[\w.-]+)?=(?:"|&quot;)(https?:\/\/[^\s"'<>`)\\\]]+)/gi;

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

const JS_DIAGNOSTIC_PREFIXES = [
  'https://react.dev/errors/',
  'https://svelte.dev/e/',
];

function trimUrl(url) {
  return url.replace(/[.,;:]+$/, '');
}

function urlOffset(match) {
  return match.index + match[0].lastIndexOf(match[1]);
}

function isJavaScriptDiagnostic(pathname, url, text, index) {
  if (!/\.js$/i.test(pathname)) return false;
  if (!JS_DIAGNOSTIC_PREFIXES.some((prefix) => url.startsWith(prefix))) return false;

  const before = text.slice(Math.max(0, index - 80), index);
  const after = text.slice(index + url.length, index + url.length + 240);
  if (url.startsWith('https://react.dev/errors/')) {
    return /^(["'`])\+/.test(after) && /Minified React error #/.test(after);
  }
  return /(?:new Error|console\.(?:warn|error)|\.startsWith)\(\s*["'`]$/i.test(before);
}

function isJavaScriptNamespace(pathname, url, text, index) {
  if (!/\.js$/i.test(pathname) || !XML_NAMESPACES.has(url)) return false;

  const before = text.slice(Math.max(0, index - 100), index);
  const after = text.slice(index + url.length, index + url.length + 40);
  if (/(?:createElementNS|setAttributeNS)\(\s*["'`]$/i.test(before)) return true;
  if (/(?:namespaceURI(?:===|!==)|case)["'`]$/i.test(before)) return true;
  if (/[\w$]+\([^,]{0,60},\s*["'`]$/.test(before) && /^["'`],\s*["'`](?:xlink:|xml:)/.test(after)) return true;
  return /(?:^|[,;])\s*[\w$]{1,3}=["'`]$/.test(before);
}

export function collectTextArtifacts(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTextArtifacts(target, root);
    if (!TEXT_ARTIFACT_PATTERN.test(entry.name)) return [];
    return [{ path: path.relative(root, target).replaceAll('\\', '/'), text: readFileSync(target, 'utf8') }];
  });
}

export function findUnexpectedExternalUrls(artifacts, siteUrl) {
  const siteOrigin = new URL(siteUrl).origin;
  const findings = [];

  for (const artifact of artifacts) {
    const { path: artifactPath, text } = artifact;
    const contentLinkPositions = new Set(Array.from(text.matchAll(CONTENT_LINK_PATTERN), urlOffset));
    const namespacePositions = new Set(
      Array.from(text.matchAll(XML_NAMESPACE_PATTERN))
        .filter((match) => XML_NAMESPACES.has(trimUrl(match[1])))
        .map(urlOffset),
    );

    for (const match of text.matchAll(URL_PATTERN)) {
      const url = trimUrl(match[0]);
      if (new URL(url, siteOrigin).origin === siteOrigin) continue;
      if (contentLinkPositions.has(match.index)) continue;
      if (namespacePositions.has(match.index)) continue;
      if (isJavaScriptNamespace(artifactPath, url, text, match.index)) continue;
      if (isJavaScriptDiagnostic(artifactPath, url, text, match.index)) continue;
      findings.push({ path: artifactPath, url });
    }
  }

  return findings;
}
