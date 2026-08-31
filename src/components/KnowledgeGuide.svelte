<script lang="ts">
  import type { PortalIndexEntry } from '../types/portal';
  import {
    answerPublicKnowledgeQuestion,
    PUBLIC_KNOWLEDGE_QUESTIONS,
    type KnowledgeGuideAnswer,
  } from '../utils/knowledgeGuide';

  export let entries: PortalIndexEntry[] = [];

  let question = '';
  let answer: KnowledgeGuideAnswer = answerPublicKnowledgeQuestion('', entries);

  const kindLabels: Record<PortalIndexEntry['kind'], string> = {
    page: '页面',
    post: '文章',
    talk: '说说',
    knowledge: '知识',
    project: '项目',
    update: '更新',
  };

  function ask(value = question) {
    question = value.slice(0, 200);
    answer = answerPublicKnowledgeQuestion(question, entries);
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    ask();
  }

  function clearQuestion() {
    question = '';
    answer = answerPublicKnowledgeQuestion('', entries);
  }
</script>

<section
  data-knowledge-guide
  data-guide-state={answer.status}
  aria-labelledby="knowledge-guide-title"
  class="border-4 border-[#0284c7] bg-white p-5 shadow-[7px_7px_0_0_#f59e0b] dark:bg-slate-800 sm:p-8"
>
  <div class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
    <div class="max-w-3xl">
      <p class="text-xs font-black tracking-[0.16em] text-[#0369a1]">PUBLIC KNOWLEDGE · LOCAL RETRIEVAL</p>
      <h1 id="knowledge-guide-title" class="mt-1 text-3xl font-black text-[#075985] dark:text-[#bae6fd]">公开知识问答</h1>
      <p class="mt-3 font-bold leading-7 text-slate-700 dark:text-slate-200">
        用一句自然语言描述你想找的内容。问题只在浏览器内与本站公开索引匹配，并返回可以直接核对的来源。
      </p>
    </div>
    <div class="border-3 border-violet-700 bg-violet-50 px-4 py-3 text-sm font-black leading-6 text-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
      本地检索基础版<br /><span class="font-bold">不调用大模型</span>
    </div>
  </div>

  <form class="mt-6" on:submit={submit} role="search" aria-label="公开知识问答">
    <label for="knowledge-question" class="text-sm font-black text-slate-800 dark:text-slate-100">你想了解什么？</label>
    <div class="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <input
        id="knowledge-question"
        bind:value={question}
        type="search"
        maxlength="200"
        autocomplete="off"
        aria-describedby="knowledge-question-help"
        placeholder="例如：AI 回答为什么必须附来源？"
        class="min-h-[48px] min-w-0 border-3 border-[#075985] bg-white px-4 font-bold text-slate-900 shadow-[3px_3px_0_0_#075985] focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-900 dark:text-white"
      />
      <button type="submit" class="min-h-[48px] border-3 border-[#075985] bg-[#fde68a] px-5 py-2 font-black text-[#075985] shadow-[4px_4px_0_0_#075985] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40">查找依据</button>
      <button type="button" on:click={clearQuestion} class="min-h-[48px] border-3 border-slate-600 bg-white px-5 py-2 font-black text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/40 dark:bg-slate-900 dark:text-white">清空</button>
    </div>
    <p id="knowledge-question-help" class="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">问题不会上传、保存或写入地址栏。当前只检索已经发布的文章、知识、项目和说说。</p>
  </form>

  <div class="mt-5">
    <p class="text-sm font-black text-slate-800 dark:text-slate-100">可以这样问</p>
    <div class="mt-2 flex flex-wrap gap-2">
      {#each PUBLIC_KNOWLEDGE_QUESTIONS as sample}
        <button
          type="button"
          data-guide-question={sample}
          on:click={() => ask(sample)}
          class="min-h-[44px] border-2 border-[#0284c7] bg-sky-50 px-3 py-2 text-left text-sm font-black text-[#075985] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:bg-sky-950/30 dark:text-[#bae6fd]"
        >{sample}</button>
      {/each}
    </div>
  </div>

  <div id="knowledge-answer" class="mt-6" aria-live="polite" aria-atomic="false">
    {#if answer.status === 'idle'}
      <div class="border-3 border-dashed border-slate-400 bg-slate-50 p-5 dark:bg-slate-900">
        <h2 class="text-xl font-black text-slate-800 dark:text-white">等待问题</h2>
        <p class="mt-2 font-bold leading-7 text-slate-600 dark:text-slate-300">{answer.summary}</p>
      </div>
    {:else if answer.status === 'unknown'}
      <div class="border-3 border-amber-700 bg-amber-50 p-5 dark:bg-amber-950/30">
        <h2 class="text-xl font-black text-amber-900 dark:text-amber-100">当前未知</h2>
        <p class="mt-2 font-bold leading-7 text-slate-700 dark:text-slate-200">{answer.summary}</p>
        <a href="/knowledge" class="mt-3 inline-flex min-h-[44px] items-center font-black text-[#075985] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:text-[#bae6fd]">打开知识地图 →</a>
      </div>
    {:else}
      <div class="border-3 border-emerald-700 bg-emerald-50 p-5 dark:bg-emerald-950/30">
        <p class="text-xs font-black tracking-[0.14em] text-emerald-800 dark:text-emerald-200">基于公开索引的检索结果</p>
        <h2 class="mt-1 text-xl font-black text-slate-900 dark:text-white">找到可核对的依据</h2>
        <p class="mt-3 font-bold leading-7 text-slate-700 dark:text-slate-200">{answer.summary}</p>
        <p class="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">这段文字由固定规则摘取和组织，不是模型生成的结论。请打开来源核对完整内容。</p>
      </div>

      <ol class="mt-4 grid gap-3">
        {#each answer.sources as source, index}
          <li class="border-3 border-[#0284c7] bg-white p-4 dark:bg-slate-900">
            <div class="flex flex-wrap items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
              <span>来源 {index + 1}</span><span aria-hidden="true">·</span><span>{kindLabels[source.kind]}</span><span aria-hidden="true">·</span><time datetime={source.updatedAt}>{source.updatedAt.slice(0, 10)}</time>
            </div>
            <a href={source.href} data-guide-source class="mt-1 flex min-h-[44px] items-center text-lg font-black text-[#075985] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:text-[#bae6fd]">{source.title}</a>
            <p class="mt-1 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{source.description}</p>
            <p class="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">匹配线索：{source.matchedTerms.slice(0, 5).join('、')}</p>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</section>
