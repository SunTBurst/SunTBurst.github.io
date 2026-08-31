import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

interface ScanRule {
  id: string;
  pattern: RegExp;
  publicBuildOnly?: boolean;
  previewOnly?: boolean;
}

const root = process.cwd();
const rules: ScanRule[] = [
  { id: 'generic-secret-key', pattern: /(?:^|[^A-Za-z0-9])sk-(?:kimi-)?[A-Za-z0-9_-]{20,}/u },
  { id: 'github-token', pattern: /(?:github_pat_[A-Za-z0-9_]{40,}|gh[opsu]_[A-Za-z0-9]{30,})/u },
  { id: 'supabase-secret-key', pattern: /sb_secret_[A-Za-z0-9_-]{16,}/u },
  { id: 'private-key-block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { id: 'literal-bearer-token', pattern: /authorization[^\n]{0,40}Bearer\s+(?!\$\{|<)[A-Za-z0-9._-]{16,}/iu },
  { id: 'assigned-service-role', pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"'$\s][^"']{10,}["']/u },
  { id: 'browser-ai-origin', pattern: /api\.(?:openai\.com|moonshot\.(?:cn|ai)|deepseek\.com)/iu, publicBuildOnly: true },
  { id: 'preview-comment-network-sink', pattern: /(?:submit-comment|list-comments|delete-comment|moderate-comment)/u, publicBuildOnly: true, previewOnly: true },
  { id: 'browser-service-role-name', pattern: /SUPABASE_SERVICE_ROLE_KEY/u, publicBuildOnly: true },
];

function trackedFiles(): string[] {
  const result = spawnSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'buffer' },
  );
  if (result.status !== 0) throw new Error('Unable to enumerate tracked files');
  return result.stdout.toString('utf8').split('\0').filter(Boolean);
}

function publicBuildFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? publicBuildFiles(target) : [target];
  });
}

function scanFile(file: string, activeRules: ScanRule[], label: string): string[] {
  const buffer = readFileSync(file);
  if (buffer.includes(0)) return [];
  const text = buffer.toString('utf8');
  const relativePath = label === 'tracked'
    ? path.relative(root, file).replaceAll('\\', '/')
    : `dist/${path.relative(path.join(root, 'dist'), file).replaceAll('\\', '/')}`;
  return activeRules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => `PUBLIC_SECRET_SCAN_FAIL rule=${rule.id} path=${relativePath}`);
}

const failures = [
  ...trackedFiles().flatMap((relativePath) => scanFile(
    path.join(root, relativePath),
    rules.filter((rule) => !rule.publicBuildOnly),
    'tracked',
  )),
  ...publicBuildFiles(path.join(root, 'dist')).flatMap((file) => scanFile(
    file,
    rules.filter((rule) => !rule.previewOnly || process.env.PUBLIC_COMMENTS_STATE !== 'enabled'),
    'dist',
  )),
];

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('PUBLIC_SECRET_SCAN_OK\n');
}
