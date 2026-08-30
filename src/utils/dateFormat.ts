import { siteConfig } from '../config/site';

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateParts(value: unknown, includeTime: boolean): Record<string, string> | null {
  const date = parseDate(value);
  if (!date) return null;
  const options: Intl.DateTimeFormatOptions = {
    timeZone: siteConfig.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' } : {}),
  };
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', options)
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
}

export function siteDateTime(value: unknown): string {
  const parts = dateParts(value, true);
  if (!parts) return '未知时间';
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Format a validated frontmatter date for sitemap metadata in the configured site time zone. */
export function calendarDate(value: unknown): string {
  const parts = dateParts(value, false);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

/** Format a validated frontmatter date for RSS pubDate. */
export function rssDate(value: unknown): string {
  return (parseDate(value) ?? new Date()).toUTCString();
}
