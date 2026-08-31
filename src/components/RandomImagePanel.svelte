<script lang="ts">
  import { selectRandomImage, type CuratedImage } from '../utils/randomImages';

  export let images: CuratedImage[] = [];

  let current = images[0];

  function secureRandom() {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0] / 2 ** 32;
  }

  function showAnother() {
    current = selectRandomImage(images, current?.id, secureRandom());
  }
</script>

<section
  data-random-image-panel
  aria-labelledby="random-image-title"
  class="border-4 border-[#0284c7] bg-white p-5 shadow-[7px_7px_0_0_#f59e0b] dark:bg-slate-800 sm:p-8"
>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="max-w-2xl">
      <p class="text-xs font-black tracking-[0.16em] text-[#0369a1]">CURATED · LOCAL · LICENSED</p>
      <h1 id="random-image-title" class="mt-1 text-3xl font-black text-[#075985] dark:text-[#bae6fd]">随机画片</h1>
      <p class="mt-3 font-bold leading-7 text-slate-700 dark:text-slate-200">
        从本站自有的精选画片中随机换一张。所有图片都随网站一起发布，不请求第三方图片服务，也不会把你的 IP、浏览记录或设备信息发送给图片提供方。
      </p>
    </div>
    <button
      type="button"
      on:click={showAnother}
      class="min-h-[48px] shrink-0 border-3 border-[#075985] bg-[#fde68a] px-5 py-2 font-black text-[#075985] shadow-[4px_4px_0_0_#075985] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40"
    >
      换一张
    </button>
  </div>

  {#if current}
    <figure class="mt-6 overflow-hidden border-3 border-[#075985] bg-slate-100 dark:bg-slate-900">
      {#key current.id}
        <img
          data-curated-image={current.id}
          src={current.src}
          width={current.width}
          height={current.height}
          alt={current.alt}
          decoding="async"
          class="aspect-[3/2] w-full object-cover"
        />
      {/key}
      <figcaption class="grid gap-1 border-t-3 border-[#075985] p-4 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-4">
        <span>{current.alt}</span>
        <span class="text-slate-600 dark:text-slate-300">
          {current.credit} · <a href={current.sourceUrl} class="underline decoration-2 underline-offset-4">{current.license}</a>
        </span>
      </figcaption>
    </figure>
  {/if}
</section>
