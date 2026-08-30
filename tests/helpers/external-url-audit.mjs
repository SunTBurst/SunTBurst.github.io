const URL_PATTERN = /https?:\/\/[^\s"'<>`)\\\]]+/g;
const CONTENT_LINK_PATTERN = /(?:<|&lt;)a\b[^>]*?\bhref=(?:"|&quot;)(https?:\/\/[^\s"'<>`)\\\]]+)/gi;

const NAMED_ALLOWED_PREFIXES = [
  'http://purl.org/dc/elements/1.1/',
  'http://purl.org/rss/1.0/modules/content/',
  'http://www.sitemaps.org/schemas/sitemap/0.9',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/2005/Atom',
  'http://www.w3.org/XML/1998/namespace',
  'https://react.dev/errors/',
  'https://svelte.dev/e/',
];

function trimUrl(url) {
  return url.replace(/[.,;:]+$/, '');
}

export function findUnexpectedExternalUrls(artifacts, siteUrl) {
  const siteOrigin = new URL(siteUrl).origin;
  const findings = [];

  for (const { path, text } of artifacts) {
    const contentLinkPositions = new Set();
    for (const match of text.matchAll(CONTENT_LINK_PATTERN)) {
      const relativeOffset = match[0].lastIndexOf(match[1]);
      contentLinkPositions.add(match.index + relativeOffset);
    }

    for (const match of text.matchAll(URL_PATTERN)) {
      const url = trimUrl(match[0]);
      if (new URL(url).origin === siteOrigin) continue;
      if (NAMED_ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) continue;
      if (contentLinkPositions.has(match.index)) continue;
      findings.push({ path, url });
    }
  }

  return findings;
}
