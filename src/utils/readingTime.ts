export interface ReadableUnits {
  cjkCharacters: number;
  latinWords: number;
}

function stripPresentationSyntax(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1 ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1 ')
    .replace(/<(?:.|\n)*?>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countReadableUnits(content: string): ReadableUnits {
  const cleaned = stripPresentationSyntax(content);
  const cjkCharacters = (cleaned.match(/\p{Script=Han}/gu) ?? []).length;
  const latinWords = (cleaned.match(/[A-Za-z][A-Za-z0-9'-]*/g) ?? []).length;
  return { cjkCharacters, latinWords };
}

export function calculateReadingTime(content: string): number {
  const { cjkCharacters, latinWords } = countReadableUnits(content);
  const minutes = cjkCharacters / 300 + latinWords / 200;
  const readableMinutes = Math.ceil(minutes);
  return Math.max(1, readableMinutes);
}
