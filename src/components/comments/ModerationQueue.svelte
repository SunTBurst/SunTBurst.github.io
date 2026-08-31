<script lang="ts">
  import { onMount } from 'svelte';
  import { createCommentsClient, type BrowserSession, type ModerationQueueItem } from '../../services/comments/client';

  export let endpoint: string;
  export let publishableKey: string;

  const client = createCommentsClient({ endpoint, publishableKey });
  let session: BrowserSession | null = null;
  let queue: ModerationQueueItem[] = [];
  let loading = true;
  let message = '';
  let reasonNotes: Record<string, string> = {};

  async function loadQueue() {
    queue = await client.listQueue();
  }

  async function login() {
    message = '';
    try {
      await client.loginWithGitHub(window.location.href);
    } catch {
      message = 'GitHub 登录暂时不可用。';
    }
  }

  async function act(item: ModerationQueueItem, action: 'approve' | 'reject' | 'delete') {
    const reasonCode = action === 'approve'
      ? 'safe_after_review'
      : action === 'reject' ? 'policy_not_met' : 'privacy_or_admin_delete';
    message = '';
    try {
      await client.moderate({
        commentId: item.id,
        action,
        reasonCode,
        reasonNote: reasonNotes[item.id]?.trim().slice(0, 240) || null,
      });
      message = action === 'approve' ? '评论已公开。' : action === 'reject' ? '评论已标记为不公开。' : '评论正文已删除。';
      await loadQueue();
    } catch {
      message = '操作未完成；权限、评论状态或服务配置需要检查。';
    }
  }

  onMount(() => {
    let active = true;
    void (async () => {
      try {
        session = await client.getSession();
        if (session && active) await loadQueue();
      } catch {
        if (active) message = '当前账号无权读取审核队列，或服务暂时不可用。';
      } finally {
        if (active) loading = false;
      }
    })();
    return () => { active = false; };
  });
</script>

<section data-moderation-queue class="mx-auto max-w-5xl border-4 border-[#7c3aed] bg-white p-5 shadow-[7px_7px_0_0_#7c3aed] dark:bg-slate-800 sm:p-8">
  <p class="text-xs font-black tracking-[0.16em] text-violet-800 dark:text-violet-200">PRIVATE MODERATION</p>
  <h1 class="mt-1 text-3xl font-black text-violet-950 dark:text-violet-100">人工审核队列</h1>
  <p class="mt-3 font-bold leading-7 text-slate-700 dark:text-slate-200">只有固定 GitHub 数字 ID 对应的管理员可以读取和操作。AI 未明确通过的评论会保留在这里。</p>

  {#if !session}
    <button type="button" on:click={login} class="mt-5 min-h-[48px] border-3 border-violet-900 bg-violet-100 px-5 py-2 font-black text-violet-950 shadow-[4px_4px_0_0_#581c87] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/50">使用 GitHub 登录</button>
  {/if}

  <p aria-live="polite" class="mt-4 min-h-6 font-black text-violet-900 dark:text-violet-100">{message}</p>

  {#if loading}
    <p class="mt-4 font-bold">正在确认登录状态…</p>
  {:else if session && queue.length === 0}
    <p class="mt-4 border-2 border-dashed border-slate-500 p-4 font-bold">当前没有等待人工审核的评论。</p>
  {:else if session}
    <ol class="mt-5 grid gap-5">
      {#each queue as item}
        <li class="border-3 border-violet-700 bg-violet-50 p-4 dark:bg-violet-950/20">
          <div class="flex flex-wrap justify-between gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
            <span>@{item.authorLogin} · {item.targetKind} · {item.targetPath}</span>
            <time datetime={item.createdAt}>{new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false })}</time>
          </div>
          <p class="mt-3 whitespace-pre-wrap break-words border-2 border-violet-300 bg-white p-3 font-bold leading-7 text-slate-900 dark:bg-slate-900 dark:text-white">{item.body}</p>
          {#if item.reviews.length > 0}
            <p class="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">AI：{item.reviews[0].provider} / {item.reviews[0].resultType} / {item.reviews[0].reasonCodes.join('、') || '无原因码'}</p>
          {/if}
          <label for={`moderation-note-${item.id}`} class="mt-3 block text-sm font-black text-slate-800 dark:text-slate-100">审核备注（可选，最多 240 字）</label>
          <input id={`moderation-note-${item.id}`} bind:value={reasonNotes[item.id]} maxlength="240" class="mt-2 min-h-[44px] w-full border-2 border-violet-700 bg-white px-3 font-bold dark:bg-slate-900" />
          <div class="mt-3 flex flex-wrap gap-3">
            <button type="button" on:click={() => act(item, 'approve')} class="min-h-[44px] border-2 border-emerald-800 bg-emerald-100 px-4 font-black text-emerald-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/50">审核通过并公开</button>
            <button type="button" on:click={() => act(item, 'reject')} class="min-h-[44px] border-2 border-amber-800 bg-amber-100 px-4 font-black text-amber-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/50">拒绝公开</button>
            <button type="button" on:click={() => act(item, 'delete')} class="min-h-[44px] border-2 border-red-800 bg-red-100 px-4 font-black text-red-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400/50">删除正文</button>
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</section>
