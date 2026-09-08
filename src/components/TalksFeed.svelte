<script lang="ts">
  import { siteConfig } from '../config/site';
  import type { TalkItem } from '../utils/postsFetcher';
  import SvelteLightbox from './SvelteLightbox.svelte';
  import { onMount, afterUpdate, tick } from 'svelte';

  export let talks: TalkItem[] = [];
  export let talksPerPage: number = 10;

  let selectedTag: string | null = null;
  let visibleCount = talksPerPage;
  let feedElement: HTMLDivElement;
  let mounted = false;
  let foldFrame = 0;
  const expandedTalks = new Set<string>();

  // Lightbox state
  let isLightboxOpen = false;
  let lightboxImages: string[] = [];
  let lightboxInitialIndex = 0;

  $: allTags = Array.from(new Set(talks.flatMap(t => t.tags || []))).filter(Boolean);

  $: filteredTalks = talks.filter(t => 
    selectedTag ? t.tags && t.tags.includes(selectedTag) : true
  );

  $: displayedTalks = filteredTalks.slice(0, visibleCount);
  $: hasMore = visibleCount < filteredTalks.length;

  function handleTagSelect(tag: string | null) {
    selectedTag = selectedTag === tag ? null : tag;
    visibleCount = talksPerPage;
  }

  function loadMore() {
    visibleCount = Math.min(visibleCount + talksPerPage, filteredTalks.length);
  }

  function openLightbox(imagesList: string[], index: number, e: Event) {
    e.stopPropagation();
    lightboxImages = imagesList;
    lightboxInitialIndex = index;
    isLightboxOpen = true;
  }

  function openTalk(slug: string, event: MouseEvent) {
    // Links, image controls and fold buttons own their interaction.
    if (event.defaultPrevented || (event.target as Element).closest('a, button, input, select, textarea, [role="button"]')) return;
    window.location.href = `/talk/${slug}`;
  }

  // Remeasure the current cards without replacing Svelte's filtering/lightbox state.
  // A single delegated listener handles recreated controls, so resize never stacks listeners.
  function setupTalkFold() {
    if (!mounted || !feedElement) return;
    const focusedControl = document.activeElement?.closest<HTMLButtonElement>('[data-talk-fold-action]');
    const focusedTalkId = focusedControl && feedElement.contains(focusedControl)
      ? focusedControl.dataset.talkId : undefined;
    feedElement.querySelectorAll<HTMLElement>('[data-talk-content]').forEach(el => {
      const wrap = el.querySelector<HTMLElement>('.talk-fold-wrap');
      if (!wrap) return;
      const talkId = el.dataset.talkContent!;
      const card = el.closest('[data-layout-talk-card]')!;
      card.querySelectorAll('.talk-fold-overlay, .talk-collapse-wrap').forEach(control => control.remove());
      el.style.maxHeight = '';
      el.style.overflow = '';

      const contentHeight = el.scrollHeight;
      const threshold = Math.min(2500, window.innerHeight * 2.5);
      if (contentHeight <= threshold) {
        el.dataset.talkFoldState = 'short';
        if (focusedTalkId === talkId) card.querySelector<HTMLAnchorElement>('[data-talk-link]')?.focus({ preventScroll: true });
        return;
      }

      const expanded = expandedTalks.has(talkId);
      el.dataset.talkFoldState = expanded ? 'expanded' : 'collapsed';
      const controlWrap = document.createElement('div');
      controlWrap.className = expanded ? 'talk-collapse-wrap' : 'talk-fold-overlay';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'talk-fold-control';
      button.dataset.talkFoldAction = expanded ? 'collapse' : 'expand';
      button.dataset.talkId = talkId;
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-controls', el.id);
      button.textContent = expanded ? '收起' : '展开阅读全文';
      controlWrap.appendChild(button);
      if (expanded) {
        el.after(controlWrap);
      } else {
        el.style.maxHeight = `${threshold}px`;
        el.style.overflow = 'hidden';
        el.appendChild(controlWrap);
      }
      if (focusedTalkId === talkId) button.focus({ preventScroll: true });
    });
  }

  function scheduleTalkFold() {
    if (!mounted || foldFrame) return;
    foldFrame = window.requestAnimationFrame(() => {
      foldFrame = 0;
      setupTalkFold();
    });
  }

  function handleFoldAction(event: MouseEvent) {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-talk-fold-action]');
    if (!button || !feedElement.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    const talkId = button.dataset.talkId!;
    const collapsing = button.dataset.talkFoldAction === 'collapse';
    if (collapsing) expandedTalks.delete(talkId);
    else expandedTalks.add(talkId);
    setupTalkFold();
    const card = Array.from(feedElement.querySelectorAll<HTMLElement>('[data-layout-talk-card]'))
      .find(element => element.dataset.layoutTalkCard === talkId);
    card?.querySelector<HTMLButtonElement>('[data-talk-fold-action]')?.focus({ preventScroll: true });
    if (collapsing && card) {
      window.scrollTo({
        top: card.getBoundingClientRect().top + window.scrollY - 100,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  }

  onMount(() => {
    mounted = true;
    void tick().then(scheduleTalkFold);
    feedElement.addEventListener('click', handleFoldAction);
    window.addEventListener('portal:appearance-change', scheduleTalkFold);
    window.addEventListener('resize', scheduleTalkFold);
    let measuredWidth = 0;
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(width - measuredWidth) > 0.5) {
        measuredWidth = width;
        scheduleTalkFold();
      }
    });
    resizeObserver?.observe(feedElement);

    // Scroll and highlight deep links
    let scrollTimer: ReturnType<typeof setTimeout>;
    let highlightTimer: ReturnType<typeof setTimeout>;
    const hash = window.location.hash;
    if (hash) {
      const elementId = hash.substring(1);
      scrollTimer = setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          element.classList.add('ring-4', 'ring-[#0ea5e9]');
          highlightTimer = setTimeout(() => element.classList.remove('ring-4', 'ring-[#0ea5e9]'), 1500);
        }
      }, 300);
    }
    return () => {
      mounted = false;
      window.cancelAnimationFrame(foldFrame);
      clearTimeout(scrollTimer);
      clearTimeout(highlightTimer);
      resizeObserver?.disconnect();
      feedElement.removeEventListener('click', handleFoldAction);
      window.removeEventListener('portal:appearance-change', scheduleTalkFold);
      window.removeEventListener('resize', scheduleTalkFold);
    };
  });

  afterUpdate(async () => {
    await tick();
    scheduleTalkFold();
  });
</script>

<div bind:this={feedElement} data-talk-feed class="w-full flex flex-col gap-4 sm:gap-6">
  {#if allTags.length > 0}
    <div data-layout-talk-controls class="flex flex-wrap gap-2">
      {#each allTags as tag}
        <button
          type="button"
          aria-pressed={selectedTag === tag}
          on:click={() => handleTagSelect(tag)}
          class="min-h-[44px] text-xs px-2.5 py-1 rounded-sm font-bold transition-all border-2 border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] cursor-pointer flex items-center gap-1 {selectedTag === tag ? 'bg-[#f59e0b] text-white' : 'bg-[rgba(250,248,245,0.55)] dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-[#fde68a] hover:translate-y-[-1px]'}"
        >
          <span>#{tag}</span>
        </button>
      {/each}
      {#if selectedTag}
        <button
          type="button"
          on:click={() => handleTagSelect(null)}
          class="min-h-[44px] text-xs px-2.5 py-1 rounded-sm font-bold transition-all border-2 border-red-400 shadow-[2px_2px_0px_0px_red-400] cursor-pointer bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
        >
          清除筛选
        </button>
      {/if}
    </div>
  {/if}
  <div data-layout-talk-list class="flex flex-col gap-4 sm:gap-6">
    {#if displayedTalks.length === 0}
      <div class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-12 shadow-[6px_6px_0px_0px_#0284c7] rounded-sm text-center">
        <p class="text-[#0284c7] font-black tracking-widest uppercase">哎呀，没有找到相关的说说</p>
      </div>
    {/if}

    {#each displayedTalks as talk, i (talk.id)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div 
        id={`talk-${talk.id}`}
        data-layout-talk-card={talk.id}
        class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-5 md:p-6 shadow-[8px_8px_0px_0px_#0284c7] hover:shadow-[10px_10px_0px_0px_#f59e0b] hover:-translate-y-1 transition-all rounded-sm relative group cursor-pointer animate-card-entrance opacity-0"
        style="animation-delay: {0.2 + (i % 12) * 0.05}s"
        on:click={(event) => openTalk(talk.slug, event)}
      >
        <!-- Avatar & Meta Header -->
        <div data-layout-talk-header class="flex gap-4 items-center mb-4 select-none">
          <img src={siteConfig.avatar} alt="SunTBurst" class="h-10 w-10 flex-shrink-0 -rotate-3 rounded-sm border-3 border-[#0284c7] bg-[#fde68a] shadow-[4px_4px_0px_0px_#0284c7]" />
          <div>
             <div class="font-black text-[#0284c7] tracking-wide flex items-center gap-2 text-sm leading-none">
                {siteConfig.author}
                {#if talk.mood}
                  <span class="text-xs ml-1" title="心情">{talk.mood}</span>
                {/if}
             </div>
             <div class="flex items-center gap-2 mt-1 leading-none">
                <span class="text-[10px] sm:text-xs text-slate-500 font-mono font-bold">{talk.date}</span>
             </div>
          </div>
        </div>

        <!-- Content area -->
        <div id={`talk-content-${talk.id}`} data-talk-content={talk.id} class="talk-content mt-2 pl-1 sm:pl-[56px] text-sm text-slate-700 dark:text-slate-300">
          {#if talk.title && talk.title !== '日常动态'}
            <div class="flex items-center gap-2 mb-2 select-none">
              <span class="w-2 h-2 bg-[#f59e0b] border border-[#0284c7] inline-block shadow-[1px_1px_0px_0px_#0284c7] skew-x-12"></span>
              <h3 class="min-w-0 font-black text-[#0284c7] text-md"><a data-talk-link href={`/talk/${talk.slug}`} class="inline-flex min-h-[44px] min-w-0 max-w-full items-center break-all px-1 py-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">{talk.title}</a></h3>
            </div>
          {:else}
            <a data-talk-link href={`/talk/${talk.slug}`} class="inline-flex min-h-[44px] items-center px-1 text-sm text-[#0284c7] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">查看随记</a>
          {/if}
          
          {#if talk.sanitizedHtml}
            <div class="talk-fold-wrap">
              <div class="prose max-w-none text-slate-755 dark:text-slate-300 leading-relaxed font-medium">
                {@html talk.sanitizedHtml}
              </div>
            </div>
          {/if}

          <!-- Nine-grid Image Gallery -->
          {#if talk.images.length > 0}
            <div class="mt-4 grid gap-2 {talk.images.length === 1 ? 'grid-cols-1 max-w-sm' : talk.images.length === 2 || talk.images.length === 4 ? 'grid-cols-2 max-w-xs' : 'grid-cols-3 max-w-md'}">
              {#each talk.images as image, idx}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div 
                  class="w-full overflow-hidden rounded-sm border-2 border-[#0284c7] hover:border-[#f59e0b] shadow-[2px_2px_0px_0px_rgba(2,132,199,0.15)] hover:shadow-[3px_3px_0px_0px_#0284c7] transition-all cursor-pointer bg-slate-50 relative group-hover:scale-[1.015] {talk.images.length === 1 ? 'aspect-video sm:aspect-[4/3] max-h-80' : 'aspect-square'}"
                  on:click|stopPropagation={(e) => openLightbox(talk.images.map((item) => item.src), idx, e)}
                >
                   <img src={image.src} alt={image.alt || `${talk.title || '说说'} 配图 ${idx + 1}`} class="w-full h-full object-cover transition-transform duration-550 hover:scale-[1.06]" loading="lazy" decoding="async" />
                </div>
              {/each}
            </div>
          {/if}

          <!-- Bottom Metadata: Location, Weather, Device -->
          {#if talk.location || talk.weather || talk.device}
            <div class="mt-4 flex flex-wrap gap-3 items-center text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 select-none border-t border-dashed border-slate-100 dark:border-slate-700 pt-2.5">
              {#if talk.location}
                <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors"><span>📍</span> {talk.location}</span>
              {/if}
              {#if talk.weather}
                <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors"><span>⛅</span> {talk.weather}</span>
              {/if}
              {#if talk.device}
                <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors font-mono"><span class="text-slate-400">📱</span> {talk.device}</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

    {#if hasMore}
      <div data-layout-talk-pagination class="flex justify-center mt-8 pb-12">
        <button
          type="button"
          on:click={loadMore}
          class="min-h-[44px] px-6 py-2.5 bg-white dark:bg-slate-700 border-3 border-[#0284c7] rounded-sm font-black text-sm text-[#0284c7] uppercase tracking-wider hover:bg-[#0ea5e9] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0px_0px_#0284c7] active:translate-y-1 active:shadow-none"
        >
          加载更多
        </button>
      </div>
    {/if}
  </div>

{#if isLightboxOpen}
  <SvelteLightbox images={lightboxImages} initialIndex={lightboxInitialIndex} onClose={() => isLightboxOpen = false} />
{/if}
