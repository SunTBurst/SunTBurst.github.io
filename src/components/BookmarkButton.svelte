<script lang="ts">
  import { onMount } from 'svelte';
  import type { PortalIndexEntry } from '../types/portal';
  import {
    FAVORITES_STORAGE_KEY,
    type StorageLike,
    type StoredPortalItem,
    normalizeStoredItem,
    readStoredItems,
    removeStoredItem,
    upsertStoredItem,
    writeStoredItems,
  } from '../utils/browserStorage';

  export let entry: PortalIndexEntry;

  let isFavorited = false;
  let storage: StorageLike | null = null;
  let favorites: StoredPortalItem[] = [];

  onMount(() => {
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    if (!storage) return;
    favorites = readStoredItems(storage, FAVORITES_STORAGE_KEY);
    isFavorited = favorites.some((item) => item.href === entry.href);
  });

  function toggleFavorite() {
    if (!storage) return;
    const manifest = normalizeStoredItem({
      href: entry.href,
      title: entry.title,
      kind: entry.kind,
      savedAt: Date.now(),
    });
    if (!manifest) return;
    if (isFavorited) {
      favorites = removeStoredItem(favorites, entry.href);
    } else {
      favorites = upsertStoredItem(favorites, manifest);
    }
    const saved = writeStoredItems(storage, FAVORITES_STORAGE_KEY, favorites);
    if (saved) isFavorited = !isFavorited;
  }
</script>

<button
  type="button"
  data-portal-bookmark
  on:click={toggleFavorite}
  class="mt-2 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center border-2 border-[#0284c7] bg-[#fef9c3] px-3 font-black text-[#075985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0ea5e9]/40 dark:bg-slate-700 dark:text-[#fde68a]"
>
  {isFavorited ? '已收藏' : '收藏'}
</button>
