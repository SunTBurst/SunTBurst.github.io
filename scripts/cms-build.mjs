import { spawnSync } from 'node:child_process';
import path from 'node:path';
const result = spawnSync(process.execPath, [path.resolve('node_modules/astro/bin/astro.mjs'), 'build'], {
  stdio: 'inherit', env: { ...process.env, CMS_ENABLED: 'true' },
});
process.exit(result.status ?? 1);
