/** Format a validated frontmatter date for sitemap metadata. */
export function calendarDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Format a validated frontmatter date for RSS pubDate. */
export function rssDate(value: unknown): string {
  if (!value) return new Date().toUTCString();
  const d = value instanceof Date ? value : new Date(value as string | number);
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}
