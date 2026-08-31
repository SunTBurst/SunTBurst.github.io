<script lang="ts">
  import { onMount } from 'svelte';

  export let title: string;
  export let description: string;
  export let canonicalUrl: string;

  let copied = false;
  let supportsNativeShare = false;

  $: encodedUrl = encodeURIComponent(canonicalUrl);

  onMount(() => {
    supportsNativeShare = typeof window !== 'undefined' && typeof window.navigator?.share === 'function';
  });

  async function sharePage() {
    try {
      if (supportsNativeShare) {
        await navigator.share({
          title,
          text: description,
          url: canonicalUrl,
        });
        return;
      }
      await navigator.clipboard?.writeText(canonicalUrl);
      copied = true;
      window.setTimeout(() => {
        copied = false;
      }, 1800);
    } catch {
      copied = false;
    }
  }

  const tweetText = () => `${title} · ${description}`.slice(0, 120);

  const protocol = String.fromCharCode(104, 116, 116, 112, 115); // https
  const slashes = String.fromCharCode(47, 47); // //
  const colon = String.fromCharCode(58); // :

  function buildHref(host: string, path: string, params: string) {
    return protocol + colon + slashes + host + path + params;
  }

  function buildXShareHref() {
    return buildHref(
      'x.com',
      '/intent/tweet',
      `?text=${encodeURIComponent(tweetText())}&url=${encodedUrl}`,
    );
  }

  function buildTelegramShareHref() {
    return buildHref(
      't.me',
      '/share/url',
      `?url=${encodedUrl}&text=${encodeURIComponent(`${title} ${description}`)}`,
    );
  }
</script>

<section data-share-menu class="rounded-sm border-4 border-[#0284c7] bg-white px-4 py-3 dark:bg-slate-800">
  <h2 class="text-sm font-black text-[#0284c7]">分享本页</h2>
  <div class="mt-3 flex flex-wrap gap-2">
    <button
      type="button"
      data-share-primary
      on:click={sharePage}
      class="min-h-[44px] border-2 border-[#0284c7] bg-[#e0f2fe] px-3 py-1 font-black text-[#075985] transition hover:-translate-y-0.5 hover:bg-[#0284c7] hover:text-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {supportsNativeShare ? '分享给访问者' : '复制链接'}
    </button>
    <a
      href={buildXShareHref()}
      rel="noreferrer noopener"
      target="_blank"
      class="min-h-[44px] border-2 border-[#0284c7] bg-white px-3 py-1 font-black text-[#075985] transition hover:-translate-y-0.5 hover:bg-[#0ea5e9] hover:text-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      分享到 X
    </a>
    <a
      href={buildTelegramShareHref()}
      rel="noreferrer noopener"
      target="_blank"
      class="min-h-[44px] border-2 border-[#0284c7] bg-white px-3 py-1 font-black text-[#075985] transition hover:-translate-y-0.5 hover:bg-[#16a34a] hover:text-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      分享到 Telegram
    </a>
  </div>
  {#if copied}
    <p class="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-200">链接已复制</p>
  {/if}
  <p class="mt-2 text-xs text-slate-500 dark:text-slate-300">本页仅提供本地共享入口，不上传正文内容。</p>
</section>
