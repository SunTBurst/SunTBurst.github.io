<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import type { NavigationGroups } from '../config/navigation';

  export let groups: NavigationGroups;

  let open = false;
  let dialog: HTMLDivElement;
  let opener: HTMLButtonElement;
  let savedBodyOverflow = '';
  let bodyLocked = false;

  const groupLabels = {
    primary: '主要导航',
    explore: '探索',
    connect: '连接',
  } as const;

  function lockBody() {
    if (bodyLocked) return;
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    bodyLocked = true;
  }

  function unlockBody() {
    if (!bodyLocked) return;
    document.body.style.overflow = savedBodyOverflow;
    bodyLocked = false;
  }

  function focusableElements() {
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
  }

  function openMenu() {
    if (open) return;
    open = true;
    lockBody();

    void tick().then(() => {
      const firstRouteLink = dialog?.querySelector<HTMLAnchorElement>('a[href]');
      (firstRouteLink ?? focusableElements()[0])?.focus();
    });
  }

  function closeMenu() {
    if (!open) return;
    open = false;
    unlockBody();
    opener?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = focusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  onDestroy(unlockBody);
</script>

<button
  bind:this={opener}
  type="button"
  aria-label="打开主菜单"
  aria-expanded={open}
  aria-controls="mobile-main-menu"
  on:click={openMenu}
  class="min-h-[44px] min-w-[44px] border-2 border-[#0284c7] bg-[#fde68a] px-3 text-sm font-black text-[#0284c7] shadow-[3px_3px_0px_0px_#0284c7] transition hover:-translate-y-0.5 hover:bg-[#0ea5e9] hover:text-white focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-700 dark:text-[#fde68a]"
>
  菜单
</button>

{#if open}
  <div class="fixed inset-0 z-[2000] bg-slate-950/50" aria-hidden="true"></div>
  <div
    bind:this={dialog}
    id="mobile-main-menu"
    role="dialog"
    aria-modal="true"
    aria-label="主菜单"
    tabindex="-1"
    on:keydown={handleKeydown}
    class="fixed inset-x-3 top-3 z-[2001] max-h-[calc(100vh-1.5rem)] overflow-y-auto border-4 border-[#0284c7] bg-[#fdfbf7] p-4 shadow-[7px_7px_0px_0px_#0284c7] dark:bg-slate-900"
  >
    <div class="mb-4 flex items-center justify-between gap-3 border-b-2 border-[#0284c7] pb-3">
      <p class="text-base font-black text-[#0284c7]">主菜单</p>
      <button
        type="button"
        aria-label="关闭主菜单"
        on:click={closeMenu}
        class="min-h-[44px] min-w-[44px] border-2 border-[#0284c7] bg-white px-3 text-sm font-black text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] transition hover:bg-[#f87171] hover:text-white focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-700 dark:text-[#fde68a]"
      >
        关闭
      </button>
    </div>

    {#each Object.entries(groups) as [groupName, items]}
      <nav aria-label={groupLabels[groupName as keyof typeof groupLabels]} class="mb-5 last:mb-0">
        <p class="mb-2 text-xs font-black tracking-[0.18em] text-[#0369a1]">{groupLabels[groupName as keyof typeof groupLabels]}</p>
        <ul class="grid gap-2">
          {#each items as item}
            <li>
              <a
                href={item.href}
                on:click={closeMenu}
                class="flex min-h-[44px] items-center border-2 border-[#0284c7] bg-[#e0f2fe] px-3 text-sm font-black text-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7] transition hover:-translate-y-0.5 hover:bg-[#0ea5e9] hover:text-white focus:outline-none focus:ring-4 focus:ring-[#0ea5e9]/40 dark:bg-slate-800 dark:text-[#bae6fd]"
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    {/each}
  </div>
{/if}
