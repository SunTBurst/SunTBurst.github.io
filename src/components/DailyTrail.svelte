<script lang="ts">
  import { onMount } from 'svelte';
  import {
    riyadhDateKey,
    selectDailyTrail,
    type DailyTrailPools,
  } from '../utils/dailyTrail';

  export let pools: DailyTrailPools;
  export let initialDateKey: string;

  let dateKey = initialDateKey;
  $: trail = selectDailyTrail(dateKey, pools);
  $: dateLabel = `${dateKey.slice(0, 4)} 年 ${dateKey.slice(5, 7)} 月 ${dateKey.slice(8, 10)} 日`;

  onMount(() => {
    dateKey = riyadhDateKey(new Date());
  });
</script>

<section
  data-daily-trail
  data-trail-date={dateKey}
  data-trail-state={trail.length === 3 ? 'ready' : 'partial'}
  aria-labelledby="daily-trail-title"
  class="border-4 border-[#0284c7] bg-white p-5 shadow-[7px_7px_0_0_#f59e0b] dark:bg-slate-800 sm:p-8"
>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="max-w-3xl">
      <p class="text-xs font-black tracking-[0.18em] text-[#0369a1] dark:text-[#bae6fd]">TODAY'S TRAIL · RIYADH</p>
      <h1 id="daily-trail-title" class="mt-1 text-3xl font-black text-[#075985] dark:text-[#bae6fd]">今日漫游</h1>
      <p class="mt-3 font-bold leading-7 text-slate-700 dark:text-slate-200">每天给自己一条短路线：先读一个框架，再看一项实践，最后打开一个小工具。今天沿这三站慢慢走，不需要把整个网站一次看完。</p>
    </div>
    <time datetime={dateKey} class="shrink-0 border-3 border-[#075985] bg-[#fde68a] px-4 py-3 text-sm font-black text-[#075985] shadow-[4px_4px_0_0_#075985]">{dateLabel}<br />利雅得日期</time>
  </div>

  {#if trail.length === 0}
    <div class="mt-6 border-3 border-dashed border-slate-400 bg-slate-50 p-5 dark:bg-slate-900">
      <p class="font-black text-slate-800 dark:text-white">公开内容暂时不足以组成今日路线。</p>
      <a href="/start" class="mt-3 inline-flex min-h-[44px] items-center font-black text-[#075985] underline decoration-2 underline-offset-4 dark:text-[#bae6fd]">从固定路线开始 →</a>
    </div>
  {:else}
    <ol class="mt-7 grid gap-5 lg:grid-cols-3">
      {#each trail as stop, index}
        <li
          data-trail-stop={stop.stage}
          class:border-violet-700={stop.stage === 'knowledge'}
          class:shadow-[5px_5px_0_0_#6d28d9]={stop.stage === 'knowledge'}
          class:border-amber-700={stop.stage === 'practice'}
          class:shadow-[5px_5px_0_0_#b45309]={stop.stage === 'practice'}
          class:border-emerald-700={stop.stage === 'tool'}
          class:shadow-[5px_5px_0_0_#047857]={stop.stage === 'tool'}
          class="flex min-w-0 flex-col border-4 bg-slate-50 p-5 dark:bg-slate-900"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="text-3xl font-black text-slate-400">0{index + 1}</span>
            <span class="border-2 border-slate-500 bg-white px-2 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{stop.label}</span>
          </div>
          <p class="mt-4 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{stop.prompt}</p>
          <h2 class="mt-2 text-xl font-black text-slate-900 dark:text-white">{stop.title}</h2>
          <p class="mt-2 grow text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{stop.description}</p>
          <a href={stop.href} class="mt-5 flex min-h-[48px] min-w-0 items-center justify-center break-words border-3 border-[#075985] bg-white px-4 py-2 text-center font-black text-[#075985] shadow-[3px_3px_0_0_#075985] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:bg-slate-800 dark:text-[#bae6fd]">从这里出发 →</a>
        </li>
      {/each}
    </ol>
  {/if}

  <div class="mt-7 flex flex-col gap-3 border-t-3 border-dashed border-slate-400 pt-5 sm:flex-row sm:items-center sm:justify-between">
    <p class="font-bold leading-7 text-slate-700 dark:text-slate-200">同一天路线保持不变，明天会换成另一条路线。想立即换一个入口，可以使用随机探索。</p>
    <a href="/explore" class="inline-flex min-h-[44px] shrink-0 items-center justify-center border-2 border-pink-700 bg-pink-50 px-4 py-2 font-black text-pink-900 shadow-[3px_3px_0_0_#be185d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-500/40 dark:bg-pink-950/30 dark:text-pink-100">随机带我逛 →</a>
  </div>
</section>
