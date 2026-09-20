<script lang="ts">
  import { onMount } from 'svelte';
  import { createCmsClient, type CmsClient } from '../../services/cms/client';
  import type { CmsConnection, CmsProfile } from '../../features/cms/types';
  import CmsAccount from './CmsAccount.svelte';
  export let connection: CmsConnection;
  const client: CmsClient = createCmsClient(connection);
  let profile: CmsProfile | null = null; let loading = true; let error = '';
  async function load() { loading = true; error = ''; try { profile = await client.profile(); } catch (cause) { error = cause instanceof Error ? cause.message : '账户状态读取失败'; } finally { loading = false; } }
  onMount(() => { load(); return client.onAuthChange(load); });
</script>

<section class="account-page" aria-labelledby="account-title"><p class="eyebrow">账户中心</p><h1 id="account-title">GitHub 账户</h1>{#if error}<p class="notice error" role="alert">{error}</p>{/if}{#if loading}<p>正在确认登录状态…</p>{:else if profile}<div class="card"><h2>{profile.display_name || profile.login}</h2><p>@{profile.login}</p><dl><div><dt>后台角色</dt><dd>{profile.role}</dd></div><div><dt>账户状态</dt><dd>{profile.active ? '已启用' : '已停用'}</dd></div></dl><p class="muted">角色与启用状态由站点后台管理。GitHub 只用于验证身份，站点不会取得你的 GitHub 密码。</p><CmsAccount {client} {profile} onProfileChange={(next) => profile = next} /></div>{:else}<div class="card"><h2>登录或注册</h2><p>使用 GitHub 登录后，本站会自动创建一个普通成员账户。写作和后台管理权限需要由站长另行授予。</p><CmsAccount {client} {profile} onProfileChange={(next) => profile = next} /></div>{/if}</section>

<style>
  .account-page { max-width:48rem; margin:1rem auto; padding:clamp(1.25rem,4vw,2.4rem); border:1px solid var(--site-border); border-radius:.75rem; background:var(--site-surface); line-height:1.8; } .eyebrow { margin:0; color:var(--site-link); font-size:.8rem; font-weight:750; } h1 { margin:.15rem 0 1rem; color:var(--site-link); font-size:clamp(1.7rem,4vw,2.35rem); } h2 { margin:0; } .card { padding:1rem; border:1px solid var(--site-border); border-radius:.55rem; background:var(--site-background); } .card > p { margin:.4rem 0 1rem; } dl { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; margin:1rem 0; } dl div { padding:.65rem; border-radius:.35rem; background:var(--site-surface); } dt { color:var(--site-text-muted); font-size:.8rem; } dd { margin:.1rem 0 0; font-weight:700; } .muted { color:var(--site-text-muted); font-size:.9rem; } .notice { padding:.6rem .75rem; border-left:4px solid currentColor; } .error { color:#b91c1c; background:#fef2f2; } @media(max-width:500px){dl{grid-template-columns:1fr;}}
</style>
