import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { normalizeEntrySlug } from '../src/utils/slugify';

// This is a one-time local content handoff, not a database credential export.
const root = process.cwd();
const collections = { posts: 'post', talks: 'talk', knowledge: 'knowledge', projects: 'project' } as const;
const documents: Record<string, unknown>[] = [];
for (const [folder, kind] of Object.entries(collections)) {
  const directory = path.join(root, 'src/content', folder);
  for (const name of await readdir(directory, { recursive: true })) {
    if (!name.endsWith('.md')) continue;
    const text = await readFile(path.join(directory, name), 'utf8');
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (!match) throw new Error(`Invalid Markdown frontmatter: ${folder}/${name}`);
    const data = parse(match[1]);
    if (data.draft === true) continue;
    documents.push({ kind, slug: normalizeEntrySlug({ id: name.replace(/\.md$/, '').replaceAll('\\', '/'), data }),
      title: data.title || '随手记', summary: data.description || data.summary || '', body: match[2],
      tags: data.tags || data.topics || [], category: data.category || '', image: data.image || '', visibility: 'public',
      metadata: Object.fromEntries(['published', 'updated', 'started', 'status', 'sources', 'links', 'topics', 'location', 'weather', 'mood', 'device'].filter((key) => data[key] !== undefined).map((key) => [key, data[key]])),
    });
  }
}
const destination = path.join(root, '.cache', 'cms-source-import.json');
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify({ format: 'suntburst-cms-source', schemaVersion: 1, documents }, null, 2), 'utf8');
console.log(`已导出 ${documents.length} 篇公开内容：${destination}`);
console.log('登录后台 → 内容备份 → 导入 JSON。内容先进入草稿，相同类型和 slug 的已有数据库内容会跳过。');
