<script lang="ts">
  import type { CmsClient } from '../../services/cms/client';
  import type { CmsProfile } from '../../features/cms/types';

  export let client: CmsClient;
  export let profile: CmsProfile | null = null;
  export let compact = false;
  export let onProfileChange: (profile: CmsProfile | null) => void = () => {};

  let pending = false;
  let message = '';

  async function login() {
    pending = true; message = '';
    try { await client.login(); }
    catch (error) { message = error instanceof Error ? error.message : '无法发起 GitHub 登录'; pending = false; }
  }
  async function logout() {
    pending = true; message = '';
    try { await client.logout(); onProfileChange(null); }
    catch (error) { message = error instanceof Error ? error.message : '退出失败，请重试'; }
    finally { pending = false; }
  }
</script>

<section class:compact class="account" aria-label="账户">
  {#if profile}
    <div class="identity"><span class="avatar" aria-hidden="true">{profile.display_name.slice(0, 1) || profile.login.slice(0, 1)}</span><span><strong>{profile.display_name || profile.login}</strong><small>@{profile.login} · {profile.role}</small></span></div>
    <button type="button" on:click={logout} disabled={pending}>{pending ? '正在退出…' : '退出登录'}</button>
  {:else}
    <div><strong>使用 GitHub 登录</strong><small>首次登录会创建普通成员账户；编辑权限由站长分配。</small></div>
    <button type="button" class="primary" on:click={login} disabled={pending}>{pending ? '正在跳转…' : 'GitHub 登录 / 注册'}</button>
  {/if}
  {#if message}<p role="alert" class="error">{message}</p>{/if}
</section>

<style>
  .account { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; padding: .85rem; border: 1px solid color-mix(in srgb, var(--site-border) 65%, transparent); border-radius: .6rem; background: var(--site-surface); }
  .compact { padding: .55rem .7rem; }
  .identity { display: flex; align-items: center; gap: .65rem; min-width: 0; }
  .avatar { display: grid; flex: 0 0 2.25rem; width: 2.25rem; height: 2.25rem; place-items: center; border-radius: 50%; background: var(--site-tint); color: var(--site-link); font-weight: 800; text-transform: uppercase; }
  strong, small { display: block; } small { margin-top: .15rem; color: var(--site-text-muted); font-size: .8rem; }
  button { min-height: 44px; padding: .45rem .75rem; border: 1px solid var(--site-border); border-radius: .35rem; background: var(--site-surface); color: var(--site-text); font: inherit; font-weight: 700; cursor: pointer; }
  .primary { background: var(--site-tint); color: var(--site-link); } button:disabled { opacity: .65; cursor: wait; }
  .error { width: 100%; margin: 0; color: #b91c1c; font-size: .88rem; } button:focus-visible { outline: 3px solid var(--site-accent); outline-offset: 3px; }
</style>
