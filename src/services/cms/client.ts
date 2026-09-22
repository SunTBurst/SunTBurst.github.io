import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CmsAction, CmsConnection, CmsDocument, CmsDraft, CmsMedia, CmsProfile, CmsRevision, CmsRole, CmsSettings, CmsSettingsRow } from '../../features/cms/types';

export class CmsError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}
function checked<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error) {
    const conflict = result.error.message.includes('version_conflict');
    throw new CmsError(conflict ? '内容已在其他页面更新。请先导出当前文本，再重新载入最新版本。' : result.error.message, conflict ? 'version_conflict' : result.error.code);
  }
  return result.data;
}
const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
export async function validateImage(file: File) {
  if (!allowedTypes.has(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) throw new CmsError('仅支持 10 MB 以内的 PNG、JPEG、WebP 或 GIF 图片');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signature = String.fromCharCode(...bytes);
  const valid = file.type === 'image/png' ? bytes[0] === 137 && signature.slice(1, 4) === 'PNG'
    : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : file.type === 'image/gif' ? signature.startsWith('GIF87a') || signature.startsWith('GIF89a')
    : signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP';
  if (!valid) throw new CmsError('图片内容与文件类型不一致');
}

export function createCmsClient(config: CmsConnection, injected?: SupabaseClient) {
  const db = injected ?? createClient(config.endpoint, config.publishableKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const rpc = async <T>(name: string, args?: Record<string, unknown>): Promise<T> => checked(await db.rpc(name, args)) as T;
  return {
    async profile(): Promise<CmsProfile | null> {
      const session = checked(await db.auth.getSession()).session;
      if (!session) return null;
      return rpc<CmsProfile>('cms_bootstrap_profile');
    },
    async login() { checked(await db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: new URL('/admin/', window.location.origin).href } })); },
    async logout() { const { error } = await db.auth.signOut(); if (error) throw new CmsError(error.message); },
    onAuthChange(callback: () => void) { const { data } = db.auth.onAuthStateChange(() => { setTimeout(callback, 0); }); return () => data.subscription.unsubscribe(); },
    async documents(): Promise<CmsDocument[]> {
      // Explicit paging avoids PostgREST's default 1000-row limit silently dropping content.
      const rows: CmsDocument[] = [];
      for (let offset = 0; ; offset += 500) {
        const batch = checked(await db.from('cms_documents').select('*').order('updated_at', { ascending: false }).order('id').range(offset, offset + 499)) as CmsDocument[];
        rows.push(...batch);
        if (batch.length < 500) return rows;
      }
    },
    async save(document: CmsDraft, expectedVersion: number | null): Promise<CmsDocument> {
      return rpc('cms_save_document', { p_document: document, p_expected_version: expectedVersion });
    },
    async action(document: CmsDocument, action: CmsAction, revisionId: string | null = null): Promise<CmsDocument> {
      return rpc('cms_document_action', { p_id: document.id, p_action: action, p_expected_version: document.version, p_revision_id: revisionId });
    },
    async revisions(id: string): Promise<CmsRevision[]> {
      return checked(await db.from('cms_revisions').select('*').eq('document_id', id).order('version', { ascending: false }).limit(100)) as CmsRevision[];
    },
    async settings(): Promise<CmsSettingsRow> {
      const row = checked(await db.from('cms_settings').select('*').eq('id', true).single());
      return row as CmsSettingsRow;
    },
    async saveSettings(settings: Partial<CmsSettings>, version: number): Promise<CmsSettingsRow> {
      return rpc('cms_save_settings', { p_settings: settings, p_expected_version: version });
    },
    async members(): Promise<CmsProfile[]> {
      return checked(await db.from('cms_profiles').select('*').order('login').limit(1000)) as CmsProfile[];
    },
    async setMember(userId: string, role: CmsRole, active: boolean): Promise<CmsProfile> {
      return rpc('cms_set_member_role', { p_user_id: userId, p_role: role, p_active: active });
    },
    async media(): Promise<CmsMedia[]> {
      const items = checked(await db.from('cms_media').select('*').order('created_at', { ascending: false }).limit(500)) as CmsMedia[];
      if (!items.length) return [];
      const urls = checked(await db.storage.from('cms-media').createSignedUrls(items.map((item) => item.object_path), 600));
      return items.map((item, index) => ({ ...item, previewUrl: urls[index]?.signedUrl }));
    },
    async upload(file: File): Promise<CmsMedia> {
      await validateImage(file);
      const user = checked(await db.auth.getUser()).user;
      if (!user) throw new CmsError('请先登录');
      const id = crypto.randomUUID();
      const path = `${user.id}/${id}`;
      checked(await db.storage.from('cms-media').upload(path, file, { contentType: file.type, upsert: false }));
      try {
        const media = await rpc<CmsMedia>('cms_register_media', { p_id: id, p_name: file.name.slice(0, 200), p_mime: file.type, p_size: file.size });
        const preview = checked(await db.storage.from('cms-media').createSignedUrl(path, 600));
        return { ...media, previewUrl: preview.signedUrl };
      } catch (error) {
        await db.storage.from('cms-media').remove([path]);
        throw error;
      }
    },
    async deleteMedia(media: CmsMedia) {
      await rpc('cms_prepare_media_delete', { p_id: media.id });
      try {
        checked(await db.storage.from('cms-media').remove([media.object_path]));
        await rpc('cms_delete_media', { p_id: media.id });
      } catch (error) {
        await db.rpc('cms_cancel_media_delete', { p_id: media.id }).then(() => {}, () => {});
        throw error;
      }
    },
    async audit() { return checked(await db.from('cms_audit_log').select('*').order('created_at', { ascending: false }).limit(100)); },
    async importContent(input: unknown): Promise<{ imported: number; skipped: number }> {
      if (!input || typeof input !== 'object' || !Array.isArray((input as { documents?: unknown }).documents)) throw new CmsError('文件不含有效的 documents 内容列表');
      const items = (input as { documents: unknown[] }).documents;
      if (items.length > 5000) throw new CmsError('每次最多导入 5000 篇内容');
      const seen = new Set<string>();
      for (let offset = 0; ; offset += 500) {
        const rows = checked(await db.from('cms_documents').select('kind,slug').order('id').range(offset, offset + 499));
        for (const row of rows) seen.add(`${row.kind}:${row.slug}`);
        if (rows.length < 500) break;
      }
      let imported = 0; let skipped = 0;
      for (const raw of items) {
        if (!raw || typeof raw !== 'object') throw new CmsError(`导入格式错误；此前已导入 ${imported} 篇，跳过 ${skipped} 篇`);
        const row = raw as CmsDraft;
        if (!['post', 'talk', 'knowledge', 'project'].includes(row.kind) || typeof row.slug !== 'string' || typeof row.title !== 'string' || typeof row.body !== 'string') throw new CmsError(`内容字段不完整；此前已导入 ${imported} 篇`);
        if (seen.has(`${row.kind}:${row.slug}`)) { skipped++; continue; }
        const document: CmsDraft = { kind: row.kind, slug: row.slug, title: row.title, body: row.body, summary: row.summary ?? '', tags: row.tags ?? [], category: row.category ?? '', image: row.image ?? '', metadata: row.metadata ?? {}, visibility: row.visibility === 'private' ? 'private' : 'public' };
        try { await rpc('cms_save_document', { p_document: document, p_expected_version: null }); }
        catch (error) { throw new CmsError(`已导入 ${imported} 篇，跳过 ${skipped} 篇；在“${document.title}”处停止：${error instanceof Error ? error.message : '保存失败'}`); }
        seen.add(`${row.kind}:${row.slug}`); imported++;
      }
      return { imported, skipped };
    },
    async backup(format: 'json' | 'markdown'): Promise<{ filename: string; content: string; mime: string }> {
      const profile = await rpc<CmsProfile>('cms_bootstrap_profile');
      if (!profile.active || profile.role === 'member') throw new CmsError('当前账号没有导出内容权限');
      const readAll = async (table: string) => {
        const rows: Record<string, unknown>[] = [];
        for (let offset = 0; ; offset += 500) {
          const batch = checked(await db.from(table).select('*').order('id').range(offset, offset + 499));
          rows.push(...batch);
          if (batch.length < 500) return rows;
        }
      };
      const documents = await readAll('cms_documents');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      if (format === 'markdown') return {
        filename: `blog-content-${stamp}.md`, mime: 'text/markdown;charset=utf-8',
        content: documents.map((doc) => `# ${doc.title}\n\n<!-- ${doc.kind}/${doc.slug}; ${doc.status}; ${doc.visibility} -->\n\n${doc.body}`).join('\n\n---\n\n'),
      };
      const [revisions, media, settings] = await Promise.all([readAll('cms_revisions'), readAll('cms_media'), readAll('cms_settings')]);
      return { filename: `blog-content-${stamp}.json`, mime: 'application/json;charset=utf-8', content: JSON.stringify({ format: 'suntburst-cms', schemaVersion: 1, exportedAt: new Date().toISOString(), documents, revisions, settings, media, mediaNote: '图片二进制文件需从媒体库另行下载。本文件不包含账户密钥。' }, null, 2) };
    },
  };
}
export type CmsClient = ReturnType<typeof createCmsClient>;
