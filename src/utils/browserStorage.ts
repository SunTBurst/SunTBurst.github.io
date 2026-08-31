export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export interface StoredPortalItem {
  href: string;
  title: string;
  kind: string;
  savedAt: number;
}

export const FAVORITES_STORAGE_KEY = 'suntburst:favorites:v1';
export const FOOTPRINTS_STORAGE_KEY = 'suntburst:footprints:v1';
export const HISTORY_ENABLED_KEY = 'suntburst:history-enabled:v1';

const MAX_STORAGE_ITEMS = 100;

function isSafeLocalHref(href: unknown): href is string {
  if (typeof href !== 'string') return false;
  if (!href.startsWith('/')) return false;
  if (href.startsWith('//')) return false;
  if (href.includes('?') || href.includes('#')) return false;
  try {
    decodeURIComponent(href);
  } catch {
    return false;
  }
  return !/[\u0000-\u001f\u007f]/.test(href);
}

export function normalizeStoredItem(item: unknown): StoredPortalItem | null {
  if (!item || typeof item !== 'object') return null;
  const entry = item as Partial<StoredPortalItem>;
  if (!isSafeLocalHref(entry.href)) return null;
  if (typeof entry.title !== 'string' || !entry.title.trim()) return null;
  if (typeof entry.kind !== 'string' || !entry.kind.trim()) return null;
  const savedAt = Number(entry.savedAt);
  if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
  return {
    href: entry.href,
    title: entry.title.trim(),
    kind: entry.kind.trim(),
    savedAt,
  };
}

export function parseStoredItems(raw: string | null): StoredPortalItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const parsedItems = parsed
      .map(normalizeStoredItem)
      .filter((entry): entry is StoredPortalItem => Boolean(entry))
      .filter((entry, index, array) => array.findIndex((item) => item.href === entry.href) === index);
    return parsedItems.slice(0, MAX_STORAGE_ITEMS);
  } catch {
    return [];
  }
}

function safeStorageRead(storage: StorageLike, key: string): StoredPortalItem[] {
  try {
    return parseStoredItems(storage.getItem(key));
  } catch {
    return [];
  }
}

function safeStorageWrite(storage: StorageLike, key: string, items: StoredPortalItem[]): boolean {
  try {
    storage.setItem(key, JSON.stringify(items.slice(0, MAX_STORAGE_ITEMS)));
    return true;
  } catch {
    return false;
  }
}

function safeStorageClear(storage: StorageLike, key: string): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function upsertStoredItem(
  items: StoredPortalItem[],
  item: StoredPortalItem,
): StoredPortalItem[] {
  const normalized = normalizeStoredItem(item);
  if (!normalized) return items.slice(0, MAX_STORAGE_ITEMS);
  const next = [normalized, ...items.filter((entry) => entry.href !== normalized.href)];
  return next.slice(0, MAX_STORAGE_ITEMS);
}

export function readStoredItems(storage: StorageLike | null, key: typeof FAVORITES_STORAGE_KEY | typeof FOOTPRINTS_STORAGE_KEY): StoredPortalItem[] {
  if (!storage) return [];
  return safeStorageRead(storage, key);
}

export function writeStoredItems(
  storage: StorageLike | null,
  key: typeof FAVORITES_STORAGE_KEY | typeof FOOTPRINTS_STORAGE_KEY,
  items: StoredPortalItem[],
): boolean {
  if (!storage) return false;
  return safeStorageWrite(storage, key, items);
}

export function removeStoredItem(
  items: StoredPortalItem[],
  href: string,
): StoredPortalItem[] {
  return items.filter((entry) => entry.href !== href).slice(0, MAX_STORAGE_ITEMS);
}

export function setHistoryEnabled(
  storage: StorageLike | null,
  enabled: boolean,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(HISTORY_ENABLED_KEY, enabled ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}

export function isHistoryEnabled(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(HISTORY_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearLocalPortalData(storage: StorageLike | null): boolean {
  if (!storage) return false;
  const clearFavorites = safeStorageClear(storage, FAVORITES_STORAGE_KEY);
  const clearFootprints = safeStorageClear(storage, FOOTPRINTS_STORAGE_KEY);
  const clearHistory = safeStorageClear(storage, HISTORY_ENABLED_KEY);
  return clearFavorites && clearFootprints && clearHistory;
}
