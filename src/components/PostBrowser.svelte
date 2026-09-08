<script lang="ts">
  import { onMount } from 'svelte';
  import {
    activatePostBrowseLink,
    browsePosts,
    buildPostBrowseHref,
    parsePostBrowseSearch,
    type PostBrowseState,
    type PublicPostBrowseEntry,
  } from '../utils/postBrowserCore';

  export let posts: PublicPostBrowseEntry[] = [];

  let query = '';
  let category = '';
  let tag = '';
  let currentPage = 1;
  let currentHref = '/posts';
  let initialized = false;
  let categorySelect: HTMLSelectElement;
  let tagSelect: HTMLSelectElement;

  $: categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  $: tags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  $: model = browsePosts(posts, { query, category, tag, page: currentPage }, 6);

  function state(page = currentPage): PostBrowseState {
    return { query, category, tag, page };
  }

  function pageHref(page: number): string {
    return buildPostBrowseHref(currentHref, state(page));
  }

  function applyState(nextState: PostBrowseState) {
    query = nextState.query;
    category = nextState.category;
    tag = nextState.tag;
    currentPage = browsePosts(posts, nextState, 6).page;
    if (categorySelect) categorySelect.value = category;
    if (tagSelect) tagSelect.value = tag;
  }

  function applyLocation() {
    currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    applyState(parsePostBrowseSearch(window.location.search, categories, tags));
    const canonicalHref = buildPostBrowseHref(currentHref, state());
    if (canonicalHref !== currentHref) window.history.replaceState(null, '', canonicalHref);
    currentHref = canonicalHref;
  }

  function syncHistory(mode: 'push' | 'replace') {
    if (!initialized) return;
    const nextHref = buildPostBrowseHref(currentHref, state());
    if (nextHref === currentHref) return;
    if (mode === 'push') window.history.pushState(null, '', nextHref);
    else window.history.replaceState(null, '', nextHref);
    currentHref = nextHref;
  }

  function setQuery(event: Event) {
    query = (event.currentTarget as HTMLInputElement).value;
    currentPage = 1;
    syncHistory('replace');
  }

  function setCategory(event: Event) {
    category = (event.currentTarget as HTMLSelectElement).value;
    currentPage = 1;
    syncHistory('push');
  }

  function setTag(event: Event) {
    tag = (event.currentTarget as HTMLSelectElement).value;
    currentPage = 1;
    syncHistory('push');
  }

  function clearFilters() {
    query = '';
    category = '';
    tag = '';
    currentPage = 1;
    if (categorySelect) categorySelect.value = '';
    if (tagSelect) tagSelect.value = '';
    syncHistory('push');
  }

  function selectPage(event: MouseEvent, page: number) {
    activatePostBrowseLink(event, () => {
      currentPage = page;
      syncHistory('push');
    });
  }

  onMount(() => {
    applyLocation();
    initialized = true;
    const restoreFromHistory = () => applyLocation();
    window.addEventListener('popstate', restoreFromHistory);
    return () => window.removeEventListener('popstate', restoreFromHistory);
  });
</script>

<div data-post-browser class="mt-6">
  <div class="grid gap-3 border-3 border-[#0284c7] bg-[#f8fafc] p-3 dark:bg-slate-900 sm:grid-cols-3 sm:p-4">
    <label class="min-w-0 font-black text-[#075985] dark:text-[#bae6fd]">
      <span class="block text-sm">搜索文章</span>
      <input value={query} on:input={setQuery} name="q" type="search" placeholder="搜索标题、正文、分类或标签" class="mt-1 min-h-[44px] w-full min-w-0 border-2 border-[#0284c7] bg-white px-3 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-800 dark:text-slate-100" />
    </label>
    <label class="min-w-0 font-black text-[#075985] dark:text-[#bae6fd]">
      <span class="block text-sm">分类</span>
      <select bind:this={categorySelect} on:change={setCategory} name="category" class="mt-1 min-h-[44px] w-full min-w-0 border-2 border-[#0284c7] bg-white px-3 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-800 dark:text-slate-100">
        <option value="">全部分类</option>
        {#each categories as item}<option value={item}>{item}</option>{/each}
      </select>
    </label>
    <label class="min-w-0 font-black text-[#075985] dark:text-[#bae6fd]">
      <span class="block text-sm">标签</span>
      <select bind:this={tagSelect} on:change={setTag} name="tag" class="mt-1 min-h-[44px] w-full min-w-0 border-2 border-[#0284c7] bg-white px-3 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-800 dark:text-slate-100">
        <option value="">全部标签</option>
        {#each tags as item}<option value={item}>{item}</option>{/each}
      </select>
    </label>
  </div>

  <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
    <p aria-live="polite" class="font-black text-slate-600 dark:text-slate-300">找到 {model.totalItems} 篇</p>
    {#if query || category || tag}
      <button type="button" on:click={clearFilters} class="min-h-[44px] border-2 border-[#0284c7] bg-[#fde68a] px-4 font-black text-[#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">清除筛选</button>
    {/if}
  </div>

  {#if posts.length === 0}
    <div class="mt-5 border-2 border-dashed border-[#0284c7] p-5">
      <h2 class="text-xl font-black">暂时没有公开文章</h2>
      <p class="mt-2 font-bold leading-7">这里将收录学习笔记、阶段思考和可公开的实践记录；内容发布后会自动进入本页。</p>
    </div>
  {:else if model.items.length === 0}
    <div class="mt-5 border-2 border-dashed border-[#0284c7] p-5">
      <h2 class="text-xl font-black">没有匹配文章</h2>
      <p class="mt-2 font-bold leading-7">请调整关键词、分类或标签；公开文章没有被删除。</p>
    </div>
  {:else}
    <ul class="mt-5 grid gap-4 sm:grid-cols-2">
      {#each model.items as post}
        <li class="min-w-0 border-3 border-[#0284c7] bg-[#e0f2fe] p-4 dark:bg-slate-900">
          <a data-post-link href={post.href} class="flex min-h-[44px] min-w-0 max-w-full items-center break-all font-black text-[#075985] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:text-[#bae6fd]">{post.title}</a>
          <p class="mt-2 text-sm font-black">{post.date}{post.category ? ` · ${post.category}` : ''}</p>
          <p class="mt-2 break-words font-bold leading-6">{post.description}</p>
          {#if post.tags.length > 0}<p class="mt-2 break-words text-sm font-bold text-slate-600 dark:text-slate-300">{post.tags.map((item) => `#${item}`).join(' ')}</p>{/if}
        </li>
      {/each}
    </ul>

    {#if model.totalPages > 1}
      <nav aria-label="文章分页" class="mt-6 flex flex-wrap items-center justify-center gap-2">
        {#if model.hasPrevious}
          <a data-post-page-link href={pageHref(model.page - 1)} on:click={(event) => selectPage(event, model.page - 1)} class="flex min-h-[44px] min-w-[44px] items-center justify-center border-2 border-[#0284c7] bg-white px-3 font-black text-[#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:bg-slate-800 dark:text-[#bae6fd]">上一页</a>
        {/if}
        {#each model.pageNumbers as page}
          <a data-post-page-link href={pageHref(page)} aria-current={page === model.page ? 'page' : undefined} on:click={(event) => selectPage(event, page)} class={`flex min-h-[44px] min-w-[44px] items-center justify-center border-2 border-[#0284c7] px-3 font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 ${page === model.page ? 'bg-[#0284c7] text-white' : 'bg-[#fde68a] text-[#075985]'}`}>{page}</a>
        {/each}
        {#if model.hasNext}
          <a data-post-page-link href={pageHref(model.page + 1)} on:click={(event) => selectPage(event, model.page + 1)} class="flex min-h-[44px] min-w-[44px] items-center justify-center border-2 border-[#0284c7] bg-white px-3 font-black text-[#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:bg-slate-800 dark:text-[#bae6fd]">下一页</a>
        {/if}
      </nav>
    {/if}
  {/if}
</div>
