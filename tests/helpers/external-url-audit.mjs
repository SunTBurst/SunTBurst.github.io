import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const TEXT_ARTIFACT_PATTERN = /\.(?:css|html|js|json|svg|txt|xml)$/i;
const URL_PATTERN = /(?:https?:)?\/\/(?:(?!&quot;)[^\s"'<>`)\\\]])+/g;
const CONTENT_LINK_PATTERNS = [
  /<a\b[^>]*?\bhref=(?:"|')((?:https?:)?\/\/[^\s"'<>`)\\\]]+)/gi,
  /&lt;a\b(?:(?!&gt;)[\s\S])*?\bhref=&quot;((?:https?:)?\/\/(?:(?!&quot;)[^\s"'<>`)\\\]])+)/gi,
];
const XML_NAMESPACE_PATTERNS = [
  /\bxmlns(?::[\w.-]+)?=(?:"|')(https?:\/\/[^\s"'<>`)\\\]]+)/gi,
  /\bxmlns(?::[\w.-]+)?=&quot;(https?:\/\/(?:(?!&quot;)[^\s"'<>`)\\\]])+)/gi,
];

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

  const before = text.slice(Math.max(0, index - 180), index);
  const after = text.slice(index + url.length, index + url.length + 720);
  if (url.startsWith('https://react.dev/errors/')) {
    if (url !== 'https://react.dev/errors/') return false;

    const builder = /(?:^|[;}])function\s+[\w$]+\(([\w$]+)\)\{var\s+([\w$]+)=["'`]$/.exec(before);
    const start = /^["'`]\+([\w$]+);if\(1<arguments\.length\)\{/.exec(after);
    const result = /return["'`]Minified React error #["'`]\+([\w$]+)\+["'`]; visit ["'`]\+([\w$]+)\+["'`] for the full message or use the non-minified dev environment for full errors and additional helpful warnings\.["'`]\}/.exec(after);
    return Boolean(builder && start && result
      && start[1] === builder[1]
      && result[1] === builder[1]
      && result[2] === builder[2]);
  }
  return /(?:new Error|console\.(?:warn|error)|\.startsWith)\(\s*["'`]$/i.test(before)
    && /^["'`]\s*\)/.test(after);
}

function isIdentifierCharacter(character) {
  return typeof character === 'string' && /[A-Za-z0-9_$]/.test(character);
}

function isJavaScriptNamespaceConstant(pathname, url, text, index) {
  if (!/\.js$/i.test(pathname) || !XML_NAMESPACES.has(url)) return false;

  const statementStart = text.lastIndexOf(';', index - 1) + 1;
  const declarationPrefix = text.slice(statementStart, index);
  if (!/^\s*const\b/.test(declarationPrefix)) return false;

  const assignment = /([A-Za-z_$][\w$]*)=["'`]$/.exec(declarationPrefix);
  if (!assignment) return false;

  const declarationEnd = text.indexOf(';', index + url.length);
  if (declarationEnd === -1) return false;
  const declaration = text.slice(statementStart, declarationEnd + 1);
  const svelteNamespaces = [
    'http://www.w3.org/1999/xhtml',
    'http://www.w3.org/2000/svg',
    'http://www.w3.org/1998/Math/MathML',
  ];
  if (!svelteNamespaces.every((namespace) => declaration.includes('="' + namespace + '"')
    || declaration.includes("='" + namespace + "'"))) return false;

  const identifier = assignment[1];
  let hasSafeUse = false;
  let occurrence = text.indexOf(identifier);
  while (occurrence !== -1) {
    const nextIndex = occurrence + identifier.length;
    if (!isIdentifierCharacter(text[occurrence - 1]) && !isIdentifierCharacter(text[nextIndex])) {
      const before = text.slice(Math.max(0, occurrence - 32), occurrence);
      const after = text.slice(nextIndex, nextIndex + 64);
      const isAssignment = occurrence >= statementStart && occurrence < declarationEnd
        && (after.startsWith('="' + url + '"') || after.startsWith("='" + url + "'"));
      const isComparison = /(?:===|!==)\s*$/.test(before) || /^\s*(?:===|!==)/.test(after);
      const isDomNamespaceCall = /(?:createElementNS|setAttributeNS)\(\s*$/.test(before);
      const isExportAlias = /^\s+as\s+[A-Za-z_$][\w$]*/.test(after);

      if (!isAssignment && !isComparison && !isDomNamespaceCall && !isExportAlias) return false;
      if (!isAssignment) hasSafeUse = true;
    }
    occurrence = text.indexOf(identifier, nextIndex);
  }

  return hasSafeUse;
}

function isJavaScriptNamespace(pathname, url, text, index) {
  if (!/\.js$/i.test(pathname) || !XML_NAMESPACES.has(url)) return false;

  const before = text.slice(Math.max(0, index - 100), index);
  const after = text.slice(index + url.length, index + url.length + 40);
  if (/(?:createElementNS|setAttributeNS)\(\s*["'`]$/i.test(before)) return true;
  if (/(?:namespaceURI(?:===|!==)|case)["'`]$/i.test(before)) return true;
  if (/[\w$]+\([^,]{0,60},\s*["'`]$/.test(before) && /^["'`],\s*["'`](?:xlink:|xml:)/.test(after)) return true;
  return isJavaScriptNamespaceConstant(pathname, url, text, index);
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
    const contentLinkPositions = new Set(
      CONTENT_LINK_PATTERNS.flatMap((pattern) => Array.from(text.matchAll(pattern), urlOffset)),
    );
    const namespacePositions = new Set(
      XML_NAMESPACE_PATTERNS.flatMap((pattern) => Array.from(text.matchAll(pattern)))
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
