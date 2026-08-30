<script lang="ts">
  import { siteConfig } from '../config/site';
  import type { TalkItem } from '../utils/postsFetcher';
  import SvelteLightbox from './SvelteLightbox.svelte';
  import { onMount, afterUpdate, tick } from 'svelte';

  export let talks: TalkItem[] = [];
  export let talksPerPage: number = 10;

  let selectedTag: string | null = null;
  let visibleCount = talksPerPage;

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

  // Fold long talk content
  function setupTalkFold() {
    document.querySelectorAll('.talk-content').forEach(el => {
      const wrap = el.querySelector('.talk-fold-wrap');
      if (!wrap) return;
      const existingOverlay = el.querySelector('.talk-fold-overlay');
      if (existingOverlay) existingOverlay.remove();
      el.style.maxHeight = '';
      el.classList.remove('overflow-hidden', 'transition-all', 'duration-700', 'ease-in-out', 'relative');

      const contentHeight = wrap.scrollHeight;
      const threshold = Math.min(2500, window.innerHeight * 2.5);
      if (contentHeight <= threshold) return;

      el.style.maxHeight = `${threshold}px`;
      el.classList.add('overflow-hidden', 'transition-all', 'duration-700', 'ease-in-out', 'relative');

      const isDark = document.documentElement.classList.contains('dark');
      const overlay = document.createElement('div');
      overlay.className = 'talk-fold-overlay absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t z-10 flex items-end justify-center pb-4 pointer-events-none';
      overlay.style.background = isDark
        ? 'linear-gradient(to top, #1e293b, transparent)'
        : 'linear-gradient(to top, white, transparent)';
      const btn = document.createElement('button');
      btn.className = 'pointer-events-auto bg-[#0284c7] border-2 border-[#0284c7] text-white font-black px-5 py-1.5 flex items-center gap-2 shadow-[4px_4px_0px_0px_#fde68a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs rounded-sm uppercase tracking-wider cursor-pointer';
      btn.innerHTML = '展开阅读全文 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      overlay.appendChild(btn);
      el.appendChild(overlay);

      btn.addEventListener('click', function expand() {
        el.style.maxHeight = `${contentHeight + 50}px`;
        overlay.classList.add('opacity-0');
        setTimeout(() => {
          const collapseWrap = document.createElement('div');
          collapseWrap.className = 'talk-collapse-wrap flex justify-center pt-3 pb-1';
          const collapseBtn = document.createElement('button');
          collapseBtn.className = 'bg-white dark:bg-slate-700 border-2 border-[#0284c7] text-[#0284c7] dark:text-white font-black px-3 py-1 flex items-center gap-2 shadow-[3px_3px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-[10px] rounded-sm uppercase tracking-wider cursor-pointer';
          collapseBtn.innerHTML = '收起 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
          collapseWrap.appendChild(collapseBtn);
          el.after(collapseWrap);
          collapseBtn.addEventListener('click', () => {
            el.style.maxHeight = `${threshold}px`;
            overlay.classList.remove('opacity-0');
            collapseWrap.remove();
            window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
          });
        }, 700);
      }, { once: true });
    });
  }

  onMount(async () => {
    await tick();
    setupTalkFold();

    // Scroll and highlight deep links
    const hash = window.location.hash;
    if (hash) {
      const elementId = hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          element.classList.add('ring-4', 'ring-[#0ea5e9]');
          setTimeout(() => element.classList.remove('ring-4', 'ring-[#0ea5e9]'), 1500);
        }
      }, 300);
    }
  });

  afterUpdate(async () => {
    await tick();
    setupTalkFold();
  });
</script>

<div class="w-full flex flex-col gap-4 sm:gap-6">
  {#if allTags.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each allTags as tag}
        <button
          on:click={() => handleTagSelect(tag)}
          class="text-xs px-2.5 py-1 rounded-sm font-bold transition-all border-2 border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] cursor-pointer flex items-center gap-1 {selectedTag === tag ? 'bg-[#f59e0b] text-white' : 'bg-[rgba(250,248,245,0.55)] dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-[#fde68a] hover:translate-y-[-1px]'}"
        >
          <span>#{tag}</span>
        </button>
      {/each}
      {#if selectedTag}
        <button
          on:click={() => handleTagSelect(null)}
          class="text-xs px-2.5 py-1 rounded-sm font-bold transition-all border-2 border-red-400 shadow-[2px_2px_0px_0px_red-400] cursor-pointer bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
        >
          清除筛选
        </button>
      {/if}
    </div>
  {/if}
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
        class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-5 md:p-6 shadow-[8px_8px_0px_0px_#0284c7] hover:shadow-[10px_10px_0px_0px_#f59e0b] hover:-translate-y-1 transition-all rounded-sm relative group cursor-pointer animate-card-entrance opacity-0"
        style="animation-delay: {0.2 + (i % 12) * 0.05}s"
        on:click={() => window.location.href = `/talk/${talk.slug}`}
      >
        <!-- Avatar & Meta Header -->
        <div class="flex gap-4 items-center mb-4 select-none">
          <img src={siteConfig.avatar} alt="TSun" class="h-10 w-10 flex-shrink-0 -rotate-3 rounded-sm border-3 border-[#0284c7] bg-[#fde68a] shadow-[4px_4px_0px_0px_#0284c7]" />
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
        <div class="talk-content mt-2 pl-1 sm:pl-[56px] text-sm text-slate-700 dark:text-slate-300">
          {#if talk.title && talk.title !== '日常动态'}
            <div class="flex items-center gap-2 mb-2 select-none">
              <span class="w-2 h-2 bg-[#f59e0b] border border-[#0284c7] inline-block shadow-[1px_1px_0px_0px_#0284c7] skew-x-12"></span>
              <h3 class="font-black text-[#0284c7] text-md">{talk.title}</h3>
            </div>
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
                  class="w-full overflow-hidden rounded-sm border-2 border-[#0284c7] hover:border-[#f59e0b] shadow-[2px_2px_0px_0px_rgba(2,132,199,0.15)] hover:shadow-[3px_3px_0px_0px_#0284c7] transition-all cursor-pointer bg-slate-50 relative group-hover:scale-[1.015] {images.length === 1 ? 'aspect-video sm:aspect-[4/3] max-h-80' : 'aspect-square'}"
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

    {#if hasMore}
      <div class="flex justify-center mt-8 pb-12">
        <button
          on:click={loadMore}
          class="px-6 py-2.5 bg-white dark:bg-slate-700 border-3 border-[#0284c7] rounded-sm font-black text-sm text-[#0284c7] uppercase tracking-wider hover:bg-[#0ea5e9] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0px_0px_#0284c7] active:translate-y-1 active:shadow-none"
        >
          加载更多
        </button>
      </div>
    {/if}
  </div>

{#if isLightboxOpen}
  <SvelteLightbox images={lightboxImages} initialIndex={lightboxInitialIndex} onClose={() => isLightboxOpen = false} />
{/if}
