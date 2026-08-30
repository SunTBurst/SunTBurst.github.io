<script lang="ts">
  import type { TalkItem } from '../utils/postsFetcher';
  import SvelteLightbox from './SvelteLightbox.svelte';
  import { siteConfig } from '../config/site';

  export let talk: TalkItem;

  let isLightboxOpen = false;
  let lightboxImages: string[] = [];
  let lightboxInitialIndex = 0;

  function openLightbox(imagesList: string[], index: number, e: Event) {
    e.stopPropagation();
    lightboxImages = imagesList;
    lightboxInitialIndex = index;
    isLightboxOpen = true;
  }

</script>

<div class="max-w-[800px] mx-auto w-full space-y-6">
  <!-- Back button -->
  <div class="mb-6 flex justify-start select-none animate-card-entrance opacity-0">
     <a href="/talks" class="px-3 py-1.5 border-3 border-[#0284c7] bg-white dark:bg-slate-700 text-[#0284c7] dark:text-slate-200 flex items-center gap-1.5 hover:bg-[#0ea5e9] hover:text-white transition-colors cursor-pointer rounded-sm shadow-[4px_4px_0px_0px_#0284c7] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-black uppercase text-xs">
        <span>&lsaquo; BACK TO TALKS</span>
     </a>
  </div>

  <!-- Main Talk Card -->
  <div 
    class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-5 md:p-6 shadow-[10px_10px_0px_0px_#f59e0b] rounded-sm relative animate-card-entrance opacity-0"
    style="animation-delay: 0.06s"
  >
    <!-- Avatar & Meta Header -->
    <div class="flex gap-4 items-center mb-4 select-none">
      <img src={siteConfig.avatar} alt="SunTBurst" class="h-12 w-12 flex-shrink-0 -rotate-3 rounded-sm border-3 border-[#0284c7] bg-[#fde68a] shadow-[4px_4px_0px_0px_#0284c7]" />
      <div>
         <div class="font-black text-[#0284c7] tracking-wide flex items-center gap-2 text-lg">
            {siteConfig.author}
            {#if talk.mood}
              <span class="text-xs ml-1" title="心情">{talk.mood}</span>
            {/if}
         </div>
         <div class="flex items-center gap-2 mt-1 leading-none">
            <span class="text-xs text-slate-500 font-mono font-bold">{talk.date}</span>
         </div>
      </div>
    </div>

    <!-- Content area -->
    <div class="talk-content mt-2 pl-0 sm:pl-[64px] text-base text-slate-700 dark:text-slate-300">
      {#if talk.title && talk.title !== '日常动态'}
        <div class="flex items-center gap-2 mb-2 select-none">
          <span class="w-2 h-2 bg-[#f59e0b] border border-[#0284c7] inline-block shadow-[1px_1px_0px_0px_#0284c7] skew-x-12"></span>
          <h3 class="font-black text-[#0284c7] text-lg">{talk.title}</h3>
        </div>
      {/if}
      
      {#if talk.sanitizedHtml}
        <div class="prose prose-lg max-w-none text-slate-755 dark:text-slate-300 leading-relaxed font-medium">
          {@html talk.sanitizedHtml}
        </div>
      {/if}

      <!-- Nine-grid Image Gallery -->
      {#if talk.images.length > 0}
        <div class="mt-4 grid gap-2 {talk.images.length === 1 ? 'grid-cols-1 max-w-sm' : talk.images.length === 2 || talk.images.length === 4 ? 'grid-cols-2 max-w-xs' : 'grid-cols-3 max-w-md'}">
          {#each talk.images as image, idx}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div 
              class="w-full overflow-hidden rounded-sm border-2 border-[#0284c7] hover:border-[#f59e0b] shadow-[2px_2px_0px_0px_rgba(2,132,199,0.15)] hover:shadow-[3px_3px_0px_0px_#0284c7] transition-all cursor-pointer bg-slate-50 relative {talk.images.length === 1 ? 'aspect-video sm:aspect-[4/3] max-h-80' : 'aspect-square'}"
              on:click={(e) => openLightbox(talk.images.map((item) => item.src), idx, e)}
            >
              <img src={image.src} alt={image.alt || `${talk.title} 配图 ${idx + 1}`} class="w-full h-full object-cover transition-transform duration-550 hover:scale-[1.06]" loading="lazy" decoding="async" />
            </div>
          {/each}
        </div>
      {/if}

      <!-- Bottom Metadata: Location, Weather, Device -->
      {#if talk.location || talk.weather || talk.device}
        <div class="mt-4 flex flex-wrap gap-3 items-center text-xs font-bold text-slate-500 dark:text-slate-400 select-none border-t border-dashed border-slate-100 dark:border-slate-700 pt-3">
          {#if talk.location}
            <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors"><span>📍</span> {talk.location}</span>
          {/if}
          {#if talk.weather}
            <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors"><span>⛅</span> {talk.weather}</span>
          {/if}
          {#if talk.device}
            <span class="flex items-center gap-1 hover:text-[#0284c7] transition-colors font-mono"><span class="text-slate-400 dark:text-slate-500">📱</span> {talk.device}</span>
          {/if}
        </div>
      {/if}
    </div>

    <div class="mt-8 flex justify-end border-t-2 border-dashed border-[#0284c7]/20 pt-4 pl-0 sm:pl-[64px]">
       <div class="text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 select-none">
          ID: {talk.id}
       </div>
    </div>
  </div>

  <div class="mt-8 text-center flex justify-center pb-12 select-none">
      <a href="/talks" class="px-6 py-3 border-4 border-[#0284c7] text-[#0284c7] bg-white dark:bg-slate-700 font-black hover:bg-[#0284c7] hover:text-white transition-all cursor-pointer rounded-sm shadow-[6px_6px_0px_0px_#0284c7] uppercase tracking-widest text-sm flex items-center justify-center hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
        返回列表 / Back to Talks
      </a>
  </div>
</div>


{#if isLightboxOpen}
  <SvelteLightbox images={lightboxImages} initialIndex={lightboxInitialIndex} onClose={() => isLightboxOpen = false} />
{/if}
