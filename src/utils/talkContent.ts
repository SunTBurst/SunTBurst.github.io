import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

export interface TalkImage {
  src: string;
  alt: string;
}

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: false,
});

markdown.renderer.rules.image = () => '';

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 's', 'a', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li'],
  allowedAttributes: {
    a: ['href', 'title', 'rel'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    a: (_tagName, attributes) => ({
      tagName: 'a',
      attribs: {
        ...attributes,
        rel: 'noopener noreferrer',
      },
    }),
  },
};

function isSafeImageSource(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function renderTalkContent(source: string) {
  const sanitizedHtml = sanitizeHtml(markdown.render(source || ''), sanitizeOptions);
  const images: TalkImage[] = Array.from((source || '').matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g))
    .map((match) => ({ alt: match[1].trim(), src: match[2].trim() }))
    .filter((image) => isSafeImageSource(image.src));
  const plainText = sanitizeHtml(sanitizedHtml, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();

  return { sanitizedHtml, plainText, images };
}
