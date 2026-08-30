import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeGitHubPublicProfile } from '../src/utils/publicProfiles';

const username = (process.env.PUBLIC_GITHUB_USERNAME || 'SunTBurst').trim();
const token = process.env.GITHUB_TOKEN?.trim();

if (!/^[A-Za-z0-9-]{1,80}$/.test(username)) throw new Error('PUBLIC_GITHUB_USERNAME is invalid');

const baseUrl = `https://api.github.com/users/${username}`;
const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'SunTBurst-Portal-Build',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (token) headers.Authorization = `Bearer ${token}`;

async function requestJson(url: string) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`GitHub public API returned ${response.status}`);
  return response.json();
}

async function main() {
  try {
    const [profile, repositories, events] = await Promise.all([
      requestJson(baseUrl),
      requestJson(`${baseUrl}/repos?type=owner&sort=updated&direction=desc&per_page=6`),
      requestJson(`${baseUrl}/events/public?per_page=10`),
    ]);
    const snapshot = normalizeGitHubPublicProfile(profile, repositories, events, new Date().toISOString());
    const outputDir = path.join(process.cwd(), '.cache');
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, 'public-profiles.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(`Generated public GitHub snapshot for ${snapshot.profile.login}: ${snapshot.repositories.length} repositories, ${snapshot.activity.length} activities.`);
  } catch (error) {
    const reason = error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, '[redacted-url]') : 'unknown error';
    console.warn(`Public GitHub snapshot refresh skipped; checked-in fallback will be used (${reason}).`);
  }
}

await main();
