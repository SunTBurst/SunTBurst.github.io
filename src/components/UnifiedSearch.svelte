<script lang="ts">
  import { onMount } from 'svelte';
  import type { PortalIndexEntry } from '../types/portal';
  import { normalizeSearchText } from '../utils/portalIndexCore';
  import { decideUnifiedSearchKey } from '../utils/unifiedSearchCore';

  export let entries: PortalIndexEntry[] = [];
  let input: HTMLInputElement;
  let resultLinks: HTMLAnchorElement[] = [];
  let query = '';
  let activeIndex = -1;
  let initialized = false;

  $: normalized = normalizeSearchText(query);
  $: results = normalized
    ? entries.filter((item) => normalizeSearchText([item.title, item.description, item.kind, ...item.topics].join(' ')).includes(normalized))
    : entries;
  $: if (activeIndex >= results.length) activeIndex = -1;
  $: if (initialized && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function focusSearch() {
    input?.focus();
  }

  function focusResult(index: number) {
    activeIndex = index;
    const link = resultLinks[index];
    link?.focus();
    link?.scrollIntoView({ block: 'nearest' });
  }

  function handleKeydown(event: KeyboardEvent) {
    const decision = decideUnifiedSearchKey(event, activeIndex, results.length);
    if (decision.action === 'focus') {
      event.preventDefault();
      focusResult(decision.index);
    } else if (decision.action === 'navigate') {
      event.preventDefault();
      window.location.assign(results[decision.index].href);
    }
  }

  function handleResultKeydown(event: KeyboardEvent, index: number) {
    const decision = decideUnifiedSearchKey(event, index, results.length);
    if (decision.action !== 'focus') return;
    event.preventDefault();
    focusResult(decision.index);
  }

  onMount(() => {
    query = new URL(window.location.href).searchParams.get('q') ?? '';
    initialized = true;
    window.addEventListener('portal:open-search', focusSearch);
    return () => window.removeEventListener('portal:open-search', focusSearch);
  });
</script>

<section aria-labelledby="unified-search-title" class="mx-auto max-w-4xl border-4 border-[#0284c7] bg-white p-4 shadow-[7px_7px_0_0_#0284c7] dark:bg-slate-800 sm:p-8">
  <h1 id="unified-search-title" class="text-3xl font-black text-[#075985] dark:text-[#bae6fd]">搜索公开内容</h1>
  <label for="portal-search" class="mt-5 block text-sm font-black text-[#075985] dark:text-[#bae6fd]">标题、简介、类型或主题</label>
  <input bind:this={input} bind:value={query} on:keydown={handleKeydown} on:focus={() => activeIndex = -1} on:input={() => activeIndex = -1} id="portal-search" type="search" aria-describedby="portal-search-keyboard-help" class="mt-2 min-h-[44px] w-full border-3 border-[#0284c7] bg-white px-4 font-bold text-slate-800 shadow-[3px_3px_0_0_#0284c7] focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-900 dark:text-slate-100" />
  <p id="portal-search-keyboard-help" class="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">使用上下方向键把焦点移到结果链接，按 Enter 打开；也可以使用 Tab 或直接点击。</p>
  <p aria-live="polite" class="mt-3 text-sm font-black text-slate-600 dark:text-slate-300">找到 {results.length} 项</p>

  {#if entries.length === 0}
    <p class="mt-5 font-bold leading-7">公开索引暂时为空。可以先访问 <a class="underline" href="/start">从这里开始</a> 或 <a class="underline" href="/topics">主题地图</a>。</p>
  {:else if results.length === 0}
    <p class="mt-5 font-bold leading-7">没有匹配结果。可以改用 <a class="underline" href="/topics">主题地图</a> 继续探索。</p>
  {:else}
    <ul class="mt-5 grid gap-3">
      {#each results as result, index}
        <li class={`min-w-0 border-2 ${index === activeIndex ? 'border-[#f59e0b]' : 'border-[#0284c7]'} bg-[#f8fafc] p-3 dark:bg-slate-900`}>
          <a
            bind:this={resultLinks[index]}
            id={`portal-search-result-${index}`}
            data-search-result
            href={result.href}
            on:focus={() => activeIndex = index}
            on:mouseenter={() => activeIndex = index}
            on:keydown={(event) => handleResultKeydown(event, index)}
            class="flex min-h-[44px] min-w-0 max-w-full items-center break-all px-2 font-black text-[#075985] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:text-[#bae6fd]"
          >{result.title}</a>
          <p class="mt-1 break-words text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{result.description}</p>
        </li>
      {/each}
    </ul>
  {/if}
</section>
