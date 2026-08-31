<script lang="ts">
  import { onMount } from 'svelte';
  import type { PortalIndexEntry } from '../types/portal';
  import {
    clearLocalPortalData,
    FAVORITES_STORAGE_KEY,
    FOOTPRINTS_STORAGE_KEY,
    HISTORY_ENABLED_KEY,
    type StorageLike,
    type StoredPortalItem,
    readStoredItems,
    setHistoryEnabled,
    writeStoredItems,
  } from '../utils/browserStorage';

  export let entries: PortalIndexEntry[] = [];
  const manifestHrefs = new Set(entries.map((entry) => entry.href));

  let favorites: StoredPortalItem[] = [];
  let footprints: StoredPortalItem[] = [];
  let historyEnabled = false;
  let storage: StorageLike | null = null;

  function prune(items: StoredPortalItem[]) {
    return items.filter((item) => manifestHrefs.has(item.href)).slice(0, 100);
  }

  onMount(() => {
    try {
      storage = window.localStorage;
      if (!storage) return;
    } catch {
      storage = null;
      return;
    }

    favorites = prune(readStoredItems(storage, FAVORITES_STORAGE_KEY));
    footprints = prune(readStoredItems(storage, FOOTPRINTS_STORAGE_KEY));
    historyEnabled = readHistoryEnabled(storage);
    writeStoredItems(storage, FAVORITES_STORAGE_KEY, favorites);
    writeStoredItems(storage, FOOTPRINTS_STORAGE_KEY, footprints);
  });

  function readHistoryEnabled(storageLike: StorageLike): boolean {
    try {
      return storageLike.getItem(HISTORY_ENABLED_KEY) === '1';
    } catch {
      return false;
    }
  }

  function toggleHistory(event: Event) {
    const checkbox = event.currentTarget as HTMLInputElement;
    if (!storage) return;
    historyEnabled = checkbox.checked;
    setHistoryEnabled(storage, historyEnabled);
  }

  function clearData() {
    if (!storage) return;
    clearLocalPortalData(storage);
    favorites = [];
    footprints = [];
    historyEnabled = false;
  }

  function exportJson() {
    if (!storage) return;
    const payload = JSON.stringify({ favorites }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'suntburst-favorites.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }
</script>

<section aria-labelledby="favorites-manager-title" class="mx-auto mt-5 max-w-4xl border-4 border-[#0284c7] bg-white p-5 shadow-[7px_7px_0_0_#0284c7] dark:bg-slate-800 sm:p-8">
  <h1 id="favorites-manager-title" class="text-3xl font-black text-[#075985] dark:text-[#bae6fd]">收藏与阅读足迹</h1>
  <p class="mt-4 font-bold leading-7">所有内容都只保存在本浏览器的 localStorage，不会上传，也不会上传正文、查询、邮件或对话内容。</p>
  <p class="mt-2 font-bold leading-7">未登录状态下也可持续使用，清空仅影响 <code>suntburst:favorites:v1</code>、<code>suntburst:footprints:v1</code> 和 <code>suntburst:history-enabled:v1</code>。</p>

  <label class="mt-5 flex items-center gap-2 font-black">
    <input type="checkbox" aria-describedby="history-help" checked={historyEnabled} on:change={toggleHistory} class="size-5" />
    启用阅读足迹记录（仅在本机生效）
  </label>
  <p id="history-help" class="mt-1 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">开启后，系统会在页面加载后记录公开页面 URL（仅本地，不涉及正文或第三方）。</p>

  <div class="mt-6">
    <h2 class="text-xl font-black text-[#075985] dark:text-[#bae6fd]">收藏列表</h2>
    {#if favorites.length === 0}
      <p class="mt-2 font-bold">当前无收藏。</p>
    {:else}
      <ul class="mt-2 grid gap-2">
        {#each favorites as item}
          <li class="border-2 border-[#0284c7] p-3">
            <a class="font-black text-[#075985] underline dark:text-[#bae6fd]" href={item.href}>{item.title}</a>
            <p class="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">类型：{item.kind}</p>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="mt-6">
    <h2 class="text-xl font-black text-[#075985] dark:text-[#bae6fd]">阅读足迹（最近 {footprints.length} 条）</h2>
    {#if footprints.length === 0}
      <p class="mt-2 font-bold">当前暂无阅读足迹，开启后会自动记录。</p>
    {:else}
      <ul class="mt-2 grid gap-2">
        {#each footprints as item}
          <li class="border-2 border-[#0284c7] p-3">
            <a class="font-black text-[#075985] underline dark:text-[#bae6fd]" href={item.href}>{item.title}</a>
            <p class="mt-1 text-sm font-black">时间：{new Date(item.savedAt).toLocaleString('zh-CN')}</p>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="mt-6 flex flex-wrap gap-2">
    <button type="button" on:click={exportJson} class="min-h-[44px] min-w-[44px] border-2 border-[#0284c7] bg-[#e0f2fe] px-3 font-black text-[#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:bg-slate-700 dark:text-[#bae6fd]">导出收藏 JSON</button>
    <button type="button" on:click={clearData} class="min-h-[44px] min-w-[44px] border-2 border-red-600 bg-red-100 px-3 font-black text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40">一键清空本地数据</button>
  </div>

  <p class="mt-4 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">返回：<a href="/start" class="underline">从这里继续探索</a></p>
</section>
