import { seoConfig } from '../config/seo';
import { getPublishedPosts, getPublishedTalks } from './contentCollections';
import { siteDateTime } from './dateFormat';
import { normalizeEntrySlug } from './slugify';
import { renderTalkContent, type TalkImage } from './talkContent';

export interface PostItem {
  id: string;
  slug: string;
  title: string;
  date: string;
  dateISO: string;
  content: string;
  description: string;
  img: string;
  tags: string[];
  keywords: string[];
  category: string;
}

export interface TalkItem {
  id: string;
  slug: string;
  title: string;
  date: string;
  sanitizedHtml: string;
  plainText: string;
  images: TalkImage[];
  tags: string[];
  location: string;
  weather: string;
  mood: string;
  device: string;
}

export async function getProcessedPosts(): Promise<PostItem[]> {
  const rawPosts = await getPublishedPosts();
  
  const processed = rawPosts.map((post: any) => {
    const data = post.data;
    let category = data.category || '';
    if (!category && Array.isArray(data.categories) && data.categories.length > 0) {
      category = data.categories[0];
    }

    let tags = [];
    if (Array.isArray(data.tags)) {
      tags = data.tags;
    } else if (typeof data.tags === 'string') {
      tags = data.tags.split(',').map((t: string) => t.trim());
    }

    let keywords: string[] = [];
    if (Array.isArray(data.keywords)) {
      keywords = data.keywords.map((k: string) => String(k).trim()).filter(Boolean);
    } else if (typeof data.keywords === 'string') {
      keywords = data.keywords.split(/[,，]/).map((k: string) => k.trim()).filter(Boolean);
    } else if (typeof data.keyword === 'string') {
      keywords = data.keyword.split(/[,，]/).map((k: string) => k.trim()).filter(Boolean);
    }

    const parsedDate = siteDateTime(data.published);

    const customSlug = normalizeEntrySlug(post);

    // 1) frontmatter 里显式声明的封面图
    // 2) 正文里第一张 Markdown/HTML 图片（![](...)、<img src=...>）
    // 3) 默认兜底（通常是站长头像）
    const firstBodyImg = (() => {
      const body = post.body || '';
      // 优先匹配 Markdown 图片 ![alt](url) —— 取括号里的 URL
      const md = body.match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
      if (md) return md[1];
      // 其次匹配 HTML <img src="..."> / <img src=...>
      const html = body.match(/<img\b[^>]*\bsrc=["']?([^"'\s>]+)/i);
      if (html) return html[1];
      return '';
    })();

    return {
      id: post.id || customSlug,
      slug: customSlug,
      title: data.title || '无标题文章',
      date: parsedDate,
      dateISO: parsedDate.replace(' ', 'T'),
      content: post.body || '',
      description: (() => {
        let desc = data.description || data.summary || '';
        if (!desc && post.body) {
          const lines = post.body.split('\n').filter(l => {
            const t = l.trim();
            return t && !t.startsWith('#') && !t.startsWith('![') && !t.startsWith('<') && !t.startsWith('---');
          });
          desc = lines[0] ? lines[0].replace(/[\[\]]/g, '').slice(0, 200) : '';
        }
        return desc;
      })(),
      img: data.img || data.image || data.cover || firstBodyImg || seoConfig.defaultImage,
      tags,
      keywords,
      category
    };
  });

  // Sort descending by date
  return processed.sort((a, b) => {
    if (a.date === '未知时间') return 1;
    if (b.date === '未知时间') return -1;
    return b.date.localeCompare(a.date);
  });
}

export async function getProcessedTalks(): Promise<TalkItem[]> {
  const rawTalks = await getPublishedTalks();

  const processed = rawTalks.map((talk: any) => {
    const data = talk.data;
    let tags = [];
    if (Array.isArray(data.tags)) {
      tags = data.tags;
    } else if (typeof data.tags === 'string') {
      tags = data.tags.split(',').map((t: string) => t.trim());
    }
    
    const parsedDate = siteDateTime(data.published);

    const customSlug = normalizeEntrySlug(talk);

    const renderedContent = renderTalkContent(talk.body || '');

    return {
      id: talk.id || customSlug,
      slug: customSlug,
      title: data.title?.trim() || '随手记',
      date: parsedDate,
      sanitizedHtml: renderedContent.sanitizedHtml,
      plainText: renderedContent.plainText,
      images: renderedContent.images,
      tags,
      location: data.location || '',
      weather: data.weather || '',
      mood: data.mood || '',
      device: data.device || ''
    };
  });

  // Sort descending by date
  return processed.sort((a, b) => {
    if (a.date === '未知时间') return 1;
    if (b.date === '未知时间') return -1;
    return b.date.localeCompare(a.date);
  });
}
