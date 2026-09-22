<script lang="ts">
  export let error = '';
  export let pageName = '内容后台';
  export let cmsSiteUrl = '';
  export let onlinePath = '/admin/';
  export let onlineLabel = '进入内容后台';
</script>

<section class="setup" aria-labelledby="cms-setup-title">
  <p class="eyebrow">{cmsSiteUrl ? '在线写作与管理' : 'CMS 未启用'}</p>
  <h1 id="cms-setup-title">{pageName}{cmsSiteUrl ? '已上线' : '暂不可用'}</h1>
  {#if !cmsSiteUrl}<p>此站点目前仍以静态内容模式运行，尚未连接内容数据库，因此不能登录、保存草稿或上传图片。</p>{/if}
  {#if error}<p class="error" role="alert">配置检查：{error}</p>{/if}
  {#if cmsSiteUrl}
    <p>在线版已经启用内容后台。保存和发布会实时生效；本静态站的现有内容不会自动同步。</p>
    <a href={`${cmsSiteUrl}${onlinePath}`} class="button">{onlineLabel} ↗</a>
    <a href={cmsSiteUrl} class="browse-link">浏览在线博客 ↗</a>
  {/if}
</section>

<style>
  .setup { max-width: 48rem; margin: 2rem auto; padding: clamp(1.25rem, 4vw, 2.5rem); border: 2px solid var(--site-border); border-radius: .75rem; background: var(--site-surface); line-height: 1.8; }
  h1 { margin: 0; color: var(--site-link); font-size: clamp(1.65rem, 4vw, 2.35rem); }
  p { margin: .8rem 0; }
  .eyebrow { margin: 0 0 .25rem; color: var(--site-link); font-weight: 750; font-size: .8rem; letter-spacing: .08em; }
  .muted { color: var(--site-text-muted); font-size: .92rem; }
  .error { border-left: 4px solid #b91c1c; padding: .65rem .8rem; background: #fef2f2; color: #991b1b; }
  .button { display: inline-flex; min-height: 44px; align-items: center; padding: .4rem .85rem; border: 1px solid var(--site-border); border-radius: .35rem; color: var(--site-link); font-weight: 700; }
  .browse-link { display: inline-flex; min-height: 44px; align-items: center; margin-left: .8rem; color: var(--site-link); font-weight: 700; }
  code { overflow-wrap: anywhere; }
</style>
