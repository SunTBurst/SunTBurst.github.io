<script lang="ts">
  import MarkdownIt from 'markdown-it';
  import type { CmsClient } from '../../services/cms/client';
  import type { CmsDocument, CmsDraft, CmsKind, CmsRevision } from '../../features/cms/types';
  import { cmsKindLabels, newCmsDraft } from '../../features/cms/types';
  import CmsMediaLibrary from './CmsMediaLibrary.svelte';

  export let client: CmsClient;
  export let document: CmsDocument | null = null;
  export let requestedKind: CmsKind = 'post';
  export let onSaved: (document: CmsDocument) => void;
  export let onClose: () => void;
  export let onDirtyChange: (dirty: boolean) => void = () => {};
  export let authStale = false;

  const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });
  markdown.validateLink = (url) => {
    const value = url.trim().replace(/[\u0000-\u001f\u007f\s]/g, '');
    return /^(?:https?:\/\/|\/(?!\/)|\.\/|\.\.\/|#)/i.test(value);
  };
  const defaultLinkOpen = markdown.renderer.rules.link_open;
  markdown.renderer.rules.link_open = (tokens, index, options, environment, self) => {
    tokens[index].attrSet('rel', 'noopener noreferrer');
    tokens[index].attrSet('target', '_blank');
    return defaultLinkOpen ? defaultLinkOpen(tokens, index, options, environment, self) : self.renderToken(tokens, index, options);
  };
  let baseId = ''; let baseVersion: number | null = null; let draft: CmsDraft = newCmsDraft(); let initial = '';
  let saving = false; let status = ''; let error = ''; let showPreview = false; let revisions: CmsRevision[] = []; let revisionsLoading = false;
  let textarea: HTMLTextAreaElement;
  $: sourceDocument = document;
  $: if (sourceDocument?.id !== baseId) loadDocument(sourceDocument, requestedKind);
  $: snapshot = JSON.stringify(draft);
  $: dirty = snapshot !== initial;
  $: onDirtyChange(dirty);
  $: previewHtml = markdown.render(draft.body || '*还没有正文。*');
  $: hasLivePublication = document?.status === 'published';

  function loadDocument(value: CmsDocument | null, kind: CmsKind) {
    baseId = value?.id ?? '__new__'; baseVersion = value?.version ?? null;
    draft = value ? { id: value.id, kind: value.kind, slug: value.slug, title: value.title, summary: value.summary, body: value.body, tags: [...value.tags], category: value.category, image: value.image, metadata: value.metadata ?? {}, visibility: value.visibility } : newCmsDraft(kind);
    initial = JSON.stringify(draft); status = value ? `正在编辑 v${value.version}` : '新建草稿尚未保存'; error = ''; revisions = [];
    if (value) loadRevisions(value.id);
  }
  function readableSlug(value: string) {
    const readable = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56);
    if (readable) return readable;
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
    return `entry-${stamp}-${Math.random().toString(36).slice(2, 6)}`;
  }
  function ensureSlug() { if (!draft.slug.trim()) draft = { ...draft, slug: readableSlug(draft.title) }; }
  function setTags(value: string) { draft = { ...draft, tags: value.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 20) }; }
  function insert(text: string, selection = '') {
    const start = textarea?.selectionStart ?? draft.body.length; const end = textarea?.selectionEnd ?? start; const selected = selection || draft.body.slice(start, end) || '文字';
    const replacement = text.replace('$TEXT', selected); draft = { ...draft, body: `${draft.body.slice(0, start)}${replacement}${draft.body.slice(end)}` };
    requestAnimationFrame(() => { textarea?.focus(); const cursor = start + replacement.length; textarea?.setSelectionRange(cursor, cursor); });
  }
  function insertMedia(markdownText: string, media: { id: string }) {
    draft = { ...draft, body: `${draft.body}${draft.body ? '\n\n' : ''}${markdownText}`, image: draft.image || `/media/${media.id}` };
    status = '图片已插入工作副本，保存后才会写入数据库。';
  }
  async function save() {
    ensureSlug(); error = ''; status = ''; saving = true;
    try { const saved = await client.save(draft, baseVersion); baseId = saved.id; baseVersion = saved.version; draft = { id: saved.id, kind: saved.kind, slug: saved.slug, title: saved.title, summary: saved.summary, body: saved.body, tags: saved.tags, category: saved.category, image: saved.image, metadata: saved.metadata, visibility: saved.visibility }; initial = JSON.stringify(draft); status = `已保存于 ${new Intl.DateTimeFormat('zh-CN', { timeStyle: 'short' }).format(new Date())}`; onSaved(saved); await loadRevisions(saved.id); }
    catch (cause) { error = cause instanceof Error ? cause.message : '保存失败，请重试'; }
    finally { saving = false; }
  }
  async function action(action: 'publish' | 'unpublish' | 'trash' | 'restore') {
    if (!document || dirty && action !== 'unpublish') { error = document ? '请先保存当前修改，再执行发布或回收。' : '请先保存新内容，再执行此操作。'; return; }
    saving = true; error = '';
    try { const changed = await client.action(document, action); onSaved(changed); if (action === 'unpublish' && dirty) { baseVersion = changed.version; status = '已撤回公开版本；当前未保存修改仍保留在编辑器中。'; } else { loadDocument(changed, changed.kind); status = action === 'publish' ? '已发布当前保存版本。' : action === 'unpublish' ? '已撤回公开版本。' : action === 'trash' ? '已移入回收站。' : '已恢复为草稿。'; } }
    catch (cause) { error = cause instanceof Error ? cause.message : '操作失败，请重试'; } finally { saving = false; }
  }
  async function loadRevisions(id: string) { revisionsLoading = true; try { revisions = await client.revisions(id); } catch { revisions = []; } finally { revisionsLoading = false; } }
  async function restoreRevision(revision: CmsRevision) {
    if (!document || dirty || !confirm(`恢复 v${revision.version} 会恢复工作副本，不会自动替换当前公开版本。继续吗？`)) return;
    saving = true; error = ''; try { const restored = await client.action(document, 'restore_revision', revision.id); onSaved(restored); loadDocument(restored, restored.kind); status = `已从 v${revision.version} 恢复工作副本；公开版本保持不变。`; } catch (cause) { error = cause instanceof Error ? cause.message : '恢复失败，请重试'; } finally { saving = false; }
  }
  function downloadCurrentText() { const blob = new Blob([draft.body], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `${draft.slug || 'unsaved-draft'}.md`; anchor.click(); URL.revokeObjectURL(url); }
  function leave() { if (!dirty || confirm('尚有未保存修改，确定离开编辑器吗？')) onClose(); }
</script>

<section class="editor" data-cms-dirty={dirty ? 'true' : 'false'} aria-labelledby="cms-editor-title">
  <header><div><p class="eyebrow">{document ? `文档 v${document.version}` : '新建内容'}</p><h2 id="cms-editor-title">{document ? document.title || '未命名内容' : `新建${cmsKindLabels[draft.kind]}`}</h2></div><div class="header-actions"><span class:unsaved={dirty} class="save-state">{dirty ? '有未保存修改' : status || '未修改'}</span>{#if hasLivePublication && dirty}<span class="publication-state">当前公开版本不受未保存修改影响；修改后需再次发布</span>{/if}<button type="button" on:click={leave}>返回内容库</button></div></header>
  {#if error}<p class="notice error" role="alert">{error}{#if error.includes('其他页面')} <button type="button" on:click={downloadCurrentText}>导出当前文本</button>{/if}</p>{/if}
  {#if authStale}<p class="notice error" role="alert">登录状态已改变。为保护当前未保存正文，编辑器已停止提交；请先导出当前文本，再刷新或重新登录。<button type="button" on:click={downloadCurrentText}>导出当前文本</button></p>{/if}
  {#if status}<p class="notice success" role="status">{status}</p>{/if}
  <div class="fields"><label>内容类型<select bind:value={draft.kind} disabled={!!document}>{#each Object.entries(cmsKindLabels) as [value, label]}<option value={value}>{label}</option>{/each}</select></label><label class="wide">标题<input bind:value={draft.title} on:blur={ensureSlug} placeholder="清楚、具体的标题" /></label><label>Slug<input bind:value={draft.slug} on:blur={ensureSlug} placeholder="自动生成" /></label><label>可见性<select bind:value={draft.visibility}><option value="public">公开（发布后可见）</option><option value="private">私有（仅后台可见）</option></select></label><label>分类<input bind:value={draft.category} placeholder="例如：随笔" /></label><label class="wide">标签（逗号分隔）<input value={draft.tags.join(', ')} on:input={(event) => setTags((event.currentTarget as HTMLInputElement).value)} placeholder="学习, 工程, 记录" /></label><label class="wide">摘要<textarea bind:value={draft.summary} rows="3" placeholder="用于列表和搜索结果的简短说明。"></textarea></label><label class="wide">封面图片 ID<input bind:value={draft.image} placeholder="从图片库插入后会写入 /media/图片ID" /></label></div>
  <div class="body-head"><strong>Markdown 正文</strong><div class="toolbar" aria-label="Markdown 工具栏"><button type="button" title="粗体" on:click={() => insert('**$TEXT**')}>粗体</button><button type="button" title="斜体" on:click={() => insert('*$TEXT*')}>斜体</button><button type="button" title="标题" on:click={() => insert('## $TEXT')}>标题</button><button type="button" title="链接" on:click={() => insert('[$TEXT](https://)')}>链接</button><button type="button" title="代码" on:click={() => insert('`$TEXT`')}>代码</button><button type="button" title="图片" on:click={() => insert('![$TEXT](/media/图片ID)')}>图片</button><button type="button" title="引用" on:click={() => insert('> $TEXT')}>引用</button></div></div>
  <div class:preview-open={showPreview} class="editor-grid"><textarea bind:this={textarea} bind:value={draft.body} aria-label="Markdown 正文" spellcheck="true" placeholder="从这里开始写作…"></textarea>{#if showPreview}<article class="preview prose" aria-label="安全预览">{@html previewHtml}</article>{/if}</div>
  <details class="media-picker"><summary>上传或插入图片</summary><CmsMediaLibrary {client} insertMode onInsert={insertMedia} /></details>
  <div class="bottom-actions"><button type="button" on:click={() => showPreview = !showPreview}>{showPreview ? '关闭预览' : '打开预览'}</button><button type="button" class="primary" disabled={saving || authStale} on:click={save}>{saving ? '正在保存…' : '保存草稿'}</button>{#if document && document.status !== 'trash'}<button type="button" class="primary" disabled={saving || authStale} on:click={() => action('publish')}>{hasLivePublication ? '发布更新' : '发布'}</button>{/if}{#if hasLivePublication}<button type="button" disabled={saving || authStale} on:click={() => action('unpublish')}>撤回发布</button>{/if}{#if document && document.status !== 'trash'}<button type="button" class="danger" disabled={saving || authStale} on:click={() => action('trash')}>移入回收站</button>{:else if document?.status === 'trash'}<button type="button" disabled={saving || authStale} on:click={() => action('restore')}>恢复为草稿</button>{/if}</div>
  {#if document}<details class="revisions"><summary>版本历史{revisionsLoading ? '（载入中）' : `（${revisions.length}）`}</summary>{#if revisions.length === 0}<p>暂无可恢复的历史版本。</p>{:else}<ul>{#each revisions as revision}<li><span>v{revision.version} · {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(revision.created_at))}</span><button type="button" disabled={saving || dirty} on:click={() => restoreRevision(revision)}>恢复为新草稿</button></li>{/each}</ul>{/if}</details>{/if}
</section>

<style>
  .editor { padding:clamp(1rem,3vw,1.5rem); border:1px solid var(--site-border); border-radius:.7rem; background:var(--site-surface); } header,.body-head,.bottom-actions,.header-actions { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.7rem; } .eyebrow { margin:0; color:var(--site-link); font-weight:750; font-size:.8rem; } h2 { margin:.15rem 0 0; font-size:1.45rem; } button,input,select,textarea { border:1px solid var(--site-border); border-radius:.35rem; background:var(--site-background); color:var(--site-text); font:inherit; } button { min-height:44px; padding:.4rem .7rem; cursor:pointer; font-weight:650; } button:disabled { opacity:.55; cursor:wait; } .primary { background:var(--site-tint); color:var(--site-link); } .danger { color:#b91c1c; } :global(.dark) .danger { color:#fda4af; } .save-state { color:var(--site-text-muted); font-size:.85rem; } .save-state.unsaved { color:#b45309; font-weight:700; } .publication-state { max-width:20rem; color:#166534; font-size:.8rem; line-height:1.35; } .notice { margin:1rem 0 0; padding:.65rem .8rem; border-left:4px solid currentColor; } .notice button { min-height:auto; margin-left:.5rem; color:inherit; } .error { color:#b91c1c; background:#fef2f2; } .success { color:#166534; background:#f0fdf4; } .fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.8rem; margin:1rem 0; } label { display:grid; gap:.3rem; color:var(--site-text-muted); font-size:.83rem; font-weight:700; } label.wide { grid-column:span 2; } input,select { min-height:44px; padding:.4rem .65rem; } .fields textarea { min-height:5.5rem; padding:.55rem .65rem; resize:vertical; } .body-head { margin-top:1.2rem; } .toolbar { display:flex; flex-wrap:wrap; gap:.35rem; } .toolbar button { min-height:44px; padding:.2rem .5rem; font-size:.82rem; } .editor-grid { display:grid; grid-template-columns:1fr; gap:1rem; margin-top:.6rem; } .editor-grid.preview-open { grid-template-columns:minmax(0,1fr) minmax(0,1fr); } .editor-grid > textarea { width:100%; min-height:29rem; padding:.85rem; resize:vertical; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; line-height:1.7; } .preview { min-width:0; min-height:29rem; padding:1rem; border:1px solid var(--site-border); border-radius:.35rem; overflow-wrap:anywhere; line-height:1.75; } .preview :global(img) { max-width:100%; height:auto; } .preview :global(a) { color:var(--site-link); } .media-picker { margin-top:1rem; padding-top:1rem; border-top:1px solid var(--site-border); } .media-picker > summary { cursor:pointer; font-weight:700; } .media-picker :global(.panel) { margin-top:.75rem; } .bottom-actions { justify-content:flex-start; margin-top:1rem; } .revisions { margin-top:1.4rem; padding-top:1rem; border-top:1px solid color-mix(in srgb,var(--site-border) 50%,transparent); } summary { cursor:pointer; font-weight:700; } ul { display:grid; gap:.5rem; padding:0; list-style:none; } li { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:.6rem; padding:.55rem 0; border-bottom:1px solid color-mix(in srgb,var(--site-border) 50%,transparent); font-size:.9rem; } button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible { outline:3px solid var(--site-accent); outline-offset:2px; } @media(max-width:760px){.fields{grid-template-columns:1fr}.fields label.wide{grid-column:span 1}.editor-grid.preview-open{grid-template-columns:1fr}.editor-grid > textarea,.preview{min-height:20rem;}}
</style>
