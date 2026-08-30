import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

export function buildProject(projectRoot, siteUrl = 'https://tsun.test', extraEnv = {}) {
  const distDir = path.join(projectRoot, 'dist');
  const astroCli = path.join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
  rmSync(distDir, { recursive: true, force: true });

  const result = spawnSync(process.execPath, [astroCli, 'build'], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: '1',
      NO_COLOR: '1',
      PUBLIC_SITE_URL: siteUrl,
      ...extraEnv,
    },
  });

  return { ...result, output: `${result.stdout}\n${result.stderr}` };
}
