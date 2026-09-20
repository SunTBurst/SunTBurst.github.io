import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

export interface CmsHeading { depth: number; text: string; slug: string }
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';
const safeImage = (src: string) => src.startsWith('/media/') || (src.startsWith('/') && !src.startsWith('//')) || /^https?:\/\//i.test(src);

export function renderCmsMarkdown(source: string): { html: string; headings: CmsHeading[]; plainText: string } {
  const headings: CmsHeading[] = [];
  const used = new Map<string, number>();
  const markdown = new MarkdownIt({ html: false, breaks: true, linkify: false }).enable('table');
  const defaultHeading = markdown.renderer.rules.heading_open;
  markdown.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const text = tokens[index + 1]?.content ?? '';
    let slug = slugify(text);
    const count = used.get(slug) ?? 0;
    used.set(slug, count + 1);
    if (count) slug = `${slug}-${count + 1}`;
    const depth = Number(token.tag.slice(1));
    headings.push({ depth, text, slug });
    token.attrSet('id', slug);
    return defaultHeading ? defaultHeading(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
  };
  const rendered = markdown.render(source || '');
  const html = sanitizeHtml(rendered, {
    allowedTags: ['h1','h2','h3','h4','h5','h6','p','br','strong','em','s','a','img','code','pre','blockquote','ul','ol','li','hr','table','thead','tbody','tr','th','td'],
    allowedAttributes: { a: ['href','title','rel'], img: ['src','alt','title','loading'], code: ['class'], h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'], th: ['align'], td: ['align'] },
    allowedSchemes: ['http', 'https', 'mailto'], allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({ tagName: 'a', attribs: { ...attrs, rel: 'noopener noreferrer' } }),
      img: (_tag, attrs) => safeImage(attrs.src || '') ? { tagName: 'img', attribs: { src: attrs.src, alt: attrs.alt || '', ...(attrs.title ? { title: attrs.title } : {}), loading: 'lazy' } } : { tagName: 'span', attribs: {} },
    },
  });
  const plainText = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
  return { html, headings, plainText };
}
