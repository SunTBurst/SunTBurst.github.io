export interface AppearanceSelection {
  palette: string;
  layout: string;
}

export interface AppearanceOptions {
  palettes: readonly string[];
  layouts: readonly string[];
  defaults: AppearanceSelection;
}

const storageKey = 'suntburst:appearance:v1';

// Keep this function self-contained: the same validated logic runs in the head before paint.
export function normalizeAppearanceSelection(value: unknown, options: AppearanceOptions): AppearanceSelection {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    palette: typeof record.palette === 'string' && options.palettes.includes(record.palette) ? record.palette : options.defaults.palette,
    layout: typeof record.layout === 'string' && options.layouts.includes(record.layout) ? record.layout : options.defaults.layout,
  };
}

export function buildAppearanceBootstrap(options: AppearanceOptions): string {
  if (!options.palettes.includes(options.defaults.palette) || !options.layouts.includes(options.defaults.layout)) {
    throw new Error('默认配色或版式不在可用选项中');
  }
  const serialized = JSON.stringify(options).replaceAll('<', '\\u003c');
  return `(() => {
    const root = document.documentElement;
    let saved = null;
    let mode = null;
    try { saved = JSON.parse(window.localStorage.getItem('${storageKey}') || 'null'); } catch {}
    try { mode = window.localStorage.getItem('theme'); } catch {}
    const selected = (${normalizeAppearanceSelection.toString()})(saved, ${serialized});
    root.dataset.palette = selected.palette;
    root.dataset.layout = selected.layout;
    const systemDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', mode === 'dark' || (mode !== 'light' && systemDark));
  })();`;
}

export function persistAppearancePreference(
  value: unknown,
  options: AppearanceOptions,
  storageFactory: () => Pick<Storage, 'setItem'> = () => window.localStorage,
): boolean {
  try {
    storageFactory().setItem(storageKey, JSON.stringify(normalizeAppearanceSelection(value, options)));
    return true;
  } catch {
    return false;
  }
}
