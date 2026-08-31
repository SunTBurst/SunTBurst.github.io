<script lang="ts">
  import { onMount } from 'svelte';
  import { commentErrorCopy, commentStatusLabels } from '../../features/comments/copy';
  import { validateCommentBody, type CommentTarget } from '../../features/comments/domain';
  import {
    createCommentsClient,
    type BrowserComment,
    type BrowserSession,
  } from '../../services/comments/client';

  export let endpoint: string;
  export let publishableKey: string;
  export let target: CommentTarget;

  const client = createCommentsClient({ endpoint, publishableKey });
  let comments: BrowserComment[] = [];
  let session: BrowserSession | null = null;
  let body = '';
  let replyTo: BrowserComment | null = null;
  let loading = true;
  let submitting = false;
  let message = '';

  $: remaining = 2000 - Array.from(body).length;
  $: topLevel = comments.filter((comment) => comment.parentId === null);

  function repliesFor(commentId: string) {
    return comments.filter((comment) => comment.parentId === commentId);
  }

  function friendlyError(error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (/session|login|authentication/i.test(code)) return commentErrorCopy.unauthorized;
    if (/rate/i.test(code)) return commentErrorCopy.rateLimited;
    if (/invalid|target|body/i.test(code)) return commentErrorCopy.invalid;
    return commentErrorCopy.unknown;
  }

  function formatDate(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '时间待确认' : parsed.toLocaleString('zh-CN', { hour12: false });
  }

  async function refresh() {
    comments = await client.list(target);
  }

  async function login() {
    message = '';
    try {
      await client.loginWithGitHub(window.location.href);
    } catch (error) {
      message = friendlyError(error);
    }
  }

  async function logout() {
    try {
      await client.logout();
      session = null;
      await refresh();
    } catch (error) {
      message = friendlyError(error);
    }
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    message = '';
    if (!session) {
      message = commentErrorCopy.unauthorized;
      return;
    }
    let normalized: string;
    try {
      normalized = validateCommentBody(body);
    } catch {
      message = commentErrorCopy.invalid;
      return;
    }
    submitting = true;
    try {
      const result = await client.submit({
        target,
        body: normalized,
        parentId: replyTo?.id ?? null,
        idempotencyKey: crypto.randomUUID(),
      });
      body = '';
      replyTo = null;
      message = result.status === 'published'
        ? '评论已通过审核并公开。'
        : '评论已提交，目前仅你本人和管理员可见。';
      await refresh();
    } catch (error) {
      message = friendlyError(error);
    } finally {
      submitting = false;
    }
  }

  async function remove(commentId: string) {
    message = '';
    try {
      await client.delete(commentId);
      message = '评论已删除，正文内容已清除。';
      await refresh();
    } catch (error) {
      message = friendlyError(error);
    }
  }

  onMount(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        session = await client.getSession();
        if (!active) return;
        await refresh();
        unsubscribe = await client.onAuthStateChange(async (nextSession) => {
          session = nextSession;
          try { await refresh(); } catch { message = commentErrorCopy.unavailable; }
        });
      } catch {
        if (active) message = commentErrorCopy.unavailable;
      } finally {
        if (active) loading = false;
      }
    })();
    return () => {
      active = false;
      unsubscribe?.();
    };
  });
</script>

<section data-comments-panel aria-labelledby="comments-heading" class="border-4 border-[#0284c7] bg-white p-5 shadow-[7px_7px_0_0_#0284c7] dark:bg-slate-800 sm:p-7">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p class="text-xs font-black tracking-[0.16em] text-[#0369a1]">GITHUB · PREPUBLICATION REVIEW</p>
      <h2 id="comments-heading" class="mt-1 text-2xl font-black text-[#075985] dark:text-[#bae6fd]">评论与讨论</h2>
      <p class="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">评论先经 AI 审核；不能明确通过时转人工审核，不会自动公开。仅支持 GitHub 登录和纯文本。</p>
    </div>
    {#if session}
      <button type="button" on:click={logout} class="min-h-[44px] border-2 border-slate-600 bg-white px-4 py-2 text-sm font-black text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 dark:bg-slate-900 dark:text-white">退出登录</button>
    {:else}
      <button type="button" on:click={login} class="min-h-[44px] border-3 border-[#075985] bg-[#fde68a] px-4 py-2 text-sm font-black text-[#075985] shadow-[3px_3px_0_0_#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">使用 GitHub 登录</button>
    {/if}
  </div>

  <p class="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300"><a href="/comments-policy" class="inline-flex min-h-[44px] items-center text-[#075985] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:text-[#bae6fd]">查看评论规则、数据使用和保留期限</a></p>

  {#if session}
    <form on:submit={submit} class="mt-5 border-3 border-[#0284c7] bg-sky-50 p-4 dark:bg-slate-900">
      {#if replyTo}
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <span>回复 @{replyTo.authorLogin}</span>
          <button type="button" on:click={() => replyTo = null} class="min-h-[44px] px-3 font-black text-[#075985] underline">取消回复</button>
        </div>
      {/if}
      <label for="comment-body" class="text-sm font-black text-slate-800 dark:text-slate-100">写下公开评论</label>
      <textarea
        id="comment-body"
        bind:value={body}
        maxlength="2000"
        rows="5"
        required
        aria-describedby="comment-limit comment-policy-note"
        class="mt-2 w-full resize-y border-3 border-[#075985] bg-white p-3 font-bold leading-7 text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-950 dark:text-white"
      ></textarea>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
        <span id="comment-policy-note">请勿提交隐私信息、广告、攻击性内容或提示注入文本。</span>
        <span id="comment-limit" class:text-red-700={remaining < 0}>{remaining} 字可用</span>
      </div>
      <button type="submit" disabled={submitting || remaining < 0} class="mt-3 min-h-[48px] border-3 border-[#075985] bg-[#fde68a] px-5 py-2 font-black text-[#075985] shadow-[4px_4px_0_0_#075985] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">{submitting ? '正在审核…' : '提交审核'}</button>
    </form>
  {/if}

  <div aria-live="polite" class="mt-3 min-h-6 text-sm font-black text-[#075985] dark:text-[#bae6fd]">{message}</div>

  {#if loading}
    <p class="mt-4 font-bold text-slate-600 dark:text-slate-300">正在读取评论…</p>
  {:else if topLevel.length === 0}
    <div class="mt-4 border-2 border-dashed border-slate-400 p-4 font-bold leading-7 text-slate-600 dark:text-slate-300">这里还没有已公开的讨论。文章内容可照常阅读。</div>
  {:else}
    <ol class="mt-4 grid gap-4">
      {#each topLevel as comment}
        <li class="border-3 border-[#0284c7] bg-white p-4 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>@{comment.authorLogin} · {formatDate(comment.publishedAt ?? comment.createdAt)}</span>
            {#if comment.own}<span class="border border-[#0284c7] px-2 py-1 text-[#075985] dark:text-[#bae6fd]">{commentStatusLabels[comment.status]}</span>{/if}
          </div>
          <p class="mt-2 whitespace-pre-wrap break-words font-bold leading-7 text-slate-800 dark:text-slate-100">{comment.body}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            {#if comment.status === 'published' && session}<button type="button" on:click={() => replyTo = comment} class="min-h-[44px] px-3 text-sm font-black text-[#075985] underline">回复</button>{/if}
            {#if comment.own}<button type="button" on:click={() => remove(comment.id)} class="min-h-[44px] px-3 text-sm font-black text-red-700 underline">删除</button>{/if}
          </div>
          {#if repliesFor(comment.id).length > 0}
            <ol class="ml-3 mt-3 grid gap-3 border-l-4 border-sky-200 pl-3 sm:ml-6 sm:pl-5">
              {#each repliesFor(comment.id) as reply}
                <li>
                  <div class="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><span>@{reply.authorLogin}</span>{#if reply.own}<span>{commentStatusLabels[reply.status]}</span>{/if}</div>
                  <p class="mt-1 whitespace-pre-wrap break-words font-bold leading-7 text-slate-800 dark:text-slate-100">{reply.body}</p>
                  {#if reply.own}<button type="button" on:click={() => remove(reply.id)} class="min-h-[44px] text-sm font-black text-red-700 underline">删除</button>{/if}
                </li>
              {/each}
            </ol>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</section>
