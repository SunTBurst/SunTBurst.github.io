export type CmsRole = 'owner' | 'admin' | 'editor' | 'member';
export type CmsKind = 'post' | 'talk' | 'knowledge' | 'project';
export type CmsAction = 'publish' | 'unpublish' | 'trash' | 'restore' | 'restore_revision';
export interface CmsProfile {
  user_id: string;
  github_id: string;
  login: string;
  display_name: string;
  role: CmsRole;
  active: boolean;
}
export interface CmsDocument {
  id: string;
  kind: CmsKind;
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  category: string;
  image: string;
  metadata: Record<string, unknown>;
  visibility: 'public' | 'private';
  status: 'draft' | 'published' | 'trash';
  version: number;
  author_id: string;
  created_at: string;
  updated_at: string;
}
export type CmsDraft = Pick<CmsDocument, 'kind' | 'slug' | 'title' | 'summary' | 'body' | 'tags' | 'category' | 'image' | 'metadata' | 'visibility'> & { id?: string };
export type CmsPublication = Omit<CmsDocument, 'visibility' | 'status' | 'author_id' | 'version' | 'created_at'> & { published_at: string; author_name: string };
export interface CmsRevision { id: string; document_id: string; version: number; snapshot: CmsDocument; created_at: string }
export interface CmsSettings {
  title: string;
  subtitle: string;
  author: string;
  avatar: string;
  about: string;
  announcement: string;
  defaultPalette: string;
  defaultLayout: string;
}
export interface CmsSettingsRow { id: boolean; value: Partial<CmsSettings>; version: number; updated_at: string }
export interface CmsMedia { id: string; owner_id: string; object_path: string; name: string; mime: string; size: number; created_at: string; previewUrl?: string }
export interface CmsConnection { endpoint: string; publishableKey: string }
export const canEdit = (profile: CmsProfile | null) => !!profile?.active && ['owner', 'admin', 'editor'].includes(profile.role);
export const canAdmin = (profile: CmsProfile | null) => !!profile?.active && ['owner', 'admin'].includes(profile.role);
export const cmsKindLabels: Record<CmsKind, string> = { post: '文章', talk: '随记', knowledge: '知识', project: '项目' };
export function cmsDocumentPath(document: Pick<CmsDocument, 'kind' | 'slug'>): string {
  const prefixes = { post: 'posts', talk: 'talk', knowledge: 'knowledge', project: 'projects' };
  return `/${prefixes[document.kind]}/${encodeURIComponent(document.slug)}/`;
}
export function newCmsDraft(kind: CmsKind = 'post'): CmsDraft {
  return { kind, slug: '', title: '', summary: '', body: '', tags: [], category: '', image: '', metadata: {}, visibility: 'public' };
}
