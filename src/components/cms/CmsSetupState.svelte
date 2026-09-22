<script lang="ts">
  export let error = '';
  export let pageName = '内容后台';
</script>

<section class="setup" aria-labelledby="cms-setup-title">
  <p class="eyebrow">CMS 未启用</p>
  <h1 id="cms-setup-title">{pageName}暂不可用</h1>
  <p>此站点目前仍以静态内容模式运行，尚未连接内容数据库，因此不能登录、保存草稿或上传图片。</p>
  {#if error}<p class="error" role="alert">配置检查：{error}</p>{/if}
  <p class="muted">部署者需要设置 <code>CMS_ENABLED=true</code>、公开 Supabase 地址和 publishable key；OAuth、AI 和 service-role 密钥只保存在服务端。</p>
  <a href="https://supabase.com/docs/guides/auth/social-login/auth-github" class="button">查看 GitHub 登录配置指南 ↗</a>
</section>

<style>
  .setup { max-width: 48rem; margin: 2rem auto; padding: clamp(1.25rem, 4vw, 2.5rem); border: 2px solid var(--site-border); border-radius: .75rem; background: var(--site-surface); line-height: 1.8; }
  h1 { margin: 0; color: var(--site-link); font-size: clamp(1.65rem, 4vw, 2.35rem); }
  p { margin: .8rem 0; }
  .eyebrow { margin: 0 0 .25rem; color: var(--site-link); font-weight: 750; font-size: .8rem; letter-spacing: .08em; }
  .muted { color: var(--site-text-muted); font-size: .92rem; }
  .error { border-left: 4px solid #b91c1c; padding: .65rem .8rem; background: #fef2f2; color: #991b1b; }
  .button { display: inline-flex; min-height: 44px; align-items: center; padding: .4rem .85rem; border: 1px solid var(--site-border); border-radius: .35rem; color: var(--site-link); font-weight: 700; }
  code { overflow-wrap: anywhere; }
</style>
