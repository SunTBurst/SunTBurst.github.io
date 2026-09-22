function validDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function preferredDate(metadata: Record<string, unknown>, keys: string[], fallback: string): Date {
  for (const key of keys) {
    const date = validDate(metadata[key]);
    if (date) return date;
  }
  return validDate(fallback) ?? new Date(0);
}

export function cmsPublishedDate(metadata: Record<string, unknown>, publishedAt: string): Date {
  return preferredDate(metadata, ['published'], publishedAt);
}

export function cmsUpdatedDate(metadata: Record<string, unknown>, publishedAt: string): Date {
  return preferredDate(metadata, ['updated', 'published'], publishedAt);
}

export function cmsProjectStartedDate(metadata: Record<string, unknown>, publishedAt: string): Date {
  return preferredDate(metadata, ['started', 'published'], publishedAt);
}
