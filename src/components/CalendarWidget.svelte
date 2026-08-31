<script lang="ts">
  interface CalendarPost {
    slug: string;
    title: string;
    date: string;
    description: string;
  }

  export let posts: CalendarPost[] = [];

  let currentDate = new Date();

  $: currentYear = currentDate.getFullYear();
  $: currentMonth = currentDate.getMonth();

  // Get days in current month
  $: daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Get starting day of week
  $: startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Generate days array
  $: days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentYear, currentMonth, i + 1));

  $: postsByDay = posts.reduce((acc, p) => {
    if (!p.date || p.date === '未知时间') return acc;
    const key = p.date.slice(0, 10);
    acc[key] = acc[key] || [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, CalendarPost[]>);

  function prevMonth() {
    currentDate = new Date(currentYear, currentMonth - 1, 1);
  }

  function nextMonth() {
    currentDate = new Date(currentYear, currentMonth + 1, 1);
  }

  function formatYMD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  $: currentMonthEvents = posts
    .filter((post) => post.date?.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`))
    .sort((a, b) => b.date.localeCompare(a.date));

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
</script>

<section class="bg-white dark:bg-slate-800 border-4 border-[#0284c7] p-3.5 shadow-[6px_6px_0px_0px_#0284c7] rounded-sm w-full relative animate-card-entrance opacity-0" data-nosnippet data-calendar-widget aria-labelledby="calendar-widget-title" style="animation-delay: 0.08s">
  <h2 id="calendar-widget-title" class="text-center font-mono text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-widest block select-none">
    #博客创作日历
  </h2>
  
  <div class="flex justify-between items-center mb-4 border-b-2 border-dashed border-[#0284c7]/20 pb-2">
    <button type="button" data-calendar-month on:click={prevMonth} aria-label="上一个月" class="flex min-h-[44px] min-w-[44px] items-center justify-center hover:bg-[#0369a1] hover:text-white border-2 border-transparent hover:border-[#0284c7] rounded-sm transition-colors cursor-pointer text-[#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    
    <div class="font-extrabold text-[#075985] text-sm tracking-widest px-2 py-1 rounded-sm select-none" aria-live="polite">
      {currentYear} / {String(currentMonth + 1).padStart(2, '0')}
    </div>
    
    <button type="button" data-calendar-month on:click={nextMonth} aria-label="下一个月" class="flex min-h-[44px] min-w-[44px] items-center justify-center hover:bg-[#0369a1] hover:text-white border-2 border-transparent hover:border-[#0284c7] rounded-sm transition-colors cursor-pointer text-[#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>

  <div>
    <div class="grid grid-cols-7 gap-1 text-center mb-2 select-none">
      {#each weekdays as day}
        <div class="text-[10px] font-black text-[#075985]">{day}</div>
      {/each}
    </div>
    <div class="grid grid-cols-7 gap-1">
      {#each Array(startDayOfWeek) as _}
        <div></div>
      {/each}
      {#each days as day}
        {@const ymd = formatYMD(day)}
        {@const hasEvents = !!postsByDay[ymd]}
        <span
          data-calendar-day
          aria-label={`${ymd}${hasEvents ? `，${postsByDay[ymd].length} 篇文章` : ''}`}
          class="relative flex h-8 items-center justify-center rounded-sm border-2 text-[11px] font-black select-none
            {hasEvents ? 'border-[#075985] bg-[#fde68a] text-[#075985]' : 'border-transparent text-slate-600 dark:text-slate-300'}"
        >
          {day.getDate()}
          {#if hasEvents}
            <span aria-hidden="true" class="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full border border-white bg-[#075985]"></span>
          {/if}
        </span>
      {/each}
    </div>
  </div>

  {#if currentMonthEvents.length > 0}
    <div class="mt-4 pt-3 border-t-2 border-dashed border-[#0284c7]/20 animate-fade-in">
      <h3 class="mb-2 text-xs font-black text-[#075985]">本月文章</h3>
      <div class="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1 pt-1">
        {#each currentMonthEvents as event}
          <a 
            href={`/posts/${event.slug}/`}
            class="group flex min-h-[44px] items-center gap-2 border-2 border-[#0284c7] bg-[#f8fafc] p-2 text-left text-[#075985] transition-all hover:translate-y-[1px] hover:bg-[#fffbeb] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:bg-slate-700 dark:text-[#bae6fd] dark:hover:bg-slate-600"
          >
            <span aria-hidden="true" class="h-1.5 w-1.5 shrink-0 rounded-sm bg-[#075985]"></span>
            <span class="min-w-0">
              <span class="block text-[10px] font-bold text-slate-600 dark:text-slate-300">{event.date.slice(0, 10)}</span>
              <span class="line-clamp-1 block text-xs font-black">
              {event.title}
              </span>
            </span>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</section>
