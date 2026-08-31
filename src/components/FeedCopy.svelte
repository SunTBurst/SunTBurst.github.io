<script lang="ts">
  export let feedUrl: string;

  type CopyState = 'idle' | 'copied' | 'manual';
  let state: CopyState = 'idle';
  let input: HTMLInputElement;

  async function copyFeedUrl() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(feedUrl);
      state = 'copied';
    } catch {
      input.focus();
      input.select();
      state = 'manual';
    }
  }
</script>

<div data-feed-copy data-copy-state={state} class="border-3 border-[#075985] bg-sky-50 p-4 dark:bg-sky-950/30">
  <label for="subscription-feed-url" class="text-sm font-black text-slate-800 dark:text-white">RSS 地址</label>
  <div class="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
    <input bind:this={input} id="subscription-feed-url" value={feedUrl} readonly class="min-h-[48px] min-w-0 border-3 border-[#075985] bg-white px-3 font-mono text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-900 dark:text-white" />
    <button type="button" on:click={copyFeedUrl} class="min-h-[48px] border-3 border-[#075985] bg-[#fde68a] px-5 py-2 font-black text-[#075985] shadow-[4px_4px_0_0_#075985] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">复制 RSS 地址</button>
  </div>
  <p class="mt-3 min-h-[24px] text-sm font-black text-slate-600 dark:text-slate-300" aria-live="polite">
    {state === 'copied' ? '已复制，可以粘贴到 RSS 阅读器。' : state === 'manual' ? '浏览器未允许自动复制，地址已经选中，请手动复制。' : '复制只发生在当前浏览器，不会向本站发送任何内容。'}
  </p>
</div>
