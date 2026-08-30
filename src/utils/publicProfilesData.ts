import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fallback from '../generated/public-profiles.fallback.json';
import { parsePublicProfileSnapshot, type PublicProfileSnapshot } from './publicProfiles';

export async function loadPublicProfileSnapshot(): Promise<{ snapshot: PublicProfileSnapshot; origin: 'build-cache' | 'fallback' }> {
  try {
    const cachePath = path.join(process.cwd(), '.cache', 'public-profiles.json');
    const cached = JSON.parse(await readFile(cachePath, 'utf8'));
    return { snapshot: parsePublicProfileSnapshot(cached), origin: 'build-cache' };
  } catch {
    return { snapshot: parsePublicProfileSnapshot(fallback), origin: 'fallback' };
  }
}
