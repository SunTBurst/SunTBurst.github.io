<script lang="ts">
  import type { PortalIndexEntry } from '../../types/portal';
  import { pickRandomEntry } from '../../utils/portalIndexCore';

  export let entries: PortalIndexEntry[] = [];
  let selected = pickRandomEntry(entries, 0);

  function choose() {
    selected = pickRandomEntry(entries);
  }
</script>

<section id="random-explore" aria-labelledby="random-explore-title" class="mt-8 border-3 border-[#db2777] bg-[#fdf2f8] p-5 shadow-[4px_4px_0_0_#db2777] dark:bg-pink-950/40">
  <p class="text-xs font-black tracking-[0.16em] text-pink-700 dark:text-pink-300">RANDOM EXPLORE</p>
  <h2 id="random-explore-title" class="mt-1 text-2xl font-black text-pink-900 dark:text-pink-100">随机探索</h2>
  {#if selected}
    <p class="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">从已发布的本地内容中随机选了一项：</p>
    <a href={selected.href} data-touch-target="random-entry" class="mt-2 inline-flex min-h-[44px] items-center break-words px-3 py-2 text-lg font-black text-pink-900 underline decoration-2 underline-offset-4 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-500/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:text-pink-100">{selected.title}</a>
    <button type="button" onclick={choose} class="mt-4 min-h-[44px] border-2 border-pink-700 bg-white px-4 py-2 text-sm font-black text-pink-800 shadow-[3px_3px_0_0_#db2777] transition hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-slate-800 dark:text-pink-200">换一项</button>
  {:else}
    <p class="mt-4 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">还没有可随机探索的公开内容。</p>
    <a href="/start" class="mt-3 inline-block min-h-[44px] border-2 border-pink-700 bg-white px-4 py-2 text-sm font-black text-pink-800 shadow-[3px_3px_0_0_#db2777] dark:bg-slate-800 dark:text-pink-200">从这里开始</a>
  {/if}
</section>
