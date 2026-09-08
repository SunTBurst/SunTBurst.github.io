import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const markdown = new MarkdownIt({ html: true, linkify: false });
const plainHtmlOptions: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {} };

interface SearchToken {
  type: string;
  content: string;
  children?: SearchToken[] | null;
}

export function extractSearchText(source: string): string {
  const parts: string[] = [];

  function collect(tokens: SearchToken[]) {
    for (const token of tokens) {
      if (token.type === 'image') continue;
      if (['text', 'code_inline', 'code_block', 'fence'].includes(token.type)) parts.push(token.content);
      else if (token.type === 'html_inline' || token.type === 'html_block') {
        parts.push(sanitizeHtml(token.content, plainHtmlOptions));
      }
      else if (token.children) collect(token.children);
    }
  }

  collect(markdown.parse(source, {}) as SearchToken[]);
  return parts.join(' ').replace(/\s+/gu, ' ').trim();
}
