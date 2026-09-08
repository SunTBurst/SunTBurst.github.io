type PaletteColors = {
  '--site-background': string;
  '--site-surface': string;
  '--article-background': string;
  '--site-text': string;
  '--site-text-muted': string;
  '--site-link': string;
  '--site-primary': string;
  '--site-primary-text': string;
  '--site-accent': string;
  '--site-accent-text': string;
  '--site-tint': string;
  '--site-highlight': string;
  '--site-highlight-text': string;
  '--site-border': string;
  '--site-code-background': string;
};

export const palettePresets = [
  {
    id: 'paper', label: '原色纸面', swatch: '#0284c7',
    light: {
      '--site-background': '#f7f5ef', '--site-surface': '#fffdf8', '--article-background': '#fffdf8',
      '--site-text': '#243447', '--site-text-muted': '#526173', '--site-link': '#075985',
      '--site-primary': '#0369a1', '--site-primary-text': '#ffffff', '--site-accent': '#0ea5e9',
      '--site-accent-text': '#92400e', '--site-tint': '#e0f2fe', '--site-highlight': '#fde68a',
      '--site-highlight-text': '#0c4a6e', '--site-border': '#0284c7', '--site-code-background': '#0f172a',
    },
    dark: {
      '--site-background': '#0f172a', '--site-surface': '#1e293b', '--article-background': '#172335',
      '--site-text': '#e2e8f0', '--site-text-muted': '#b6c5d8', '--site-link': '#7dd3fc',
      '--site-primary': '#0369a1', '--site-primary-text': '#ffffff', '--site-accent': '#38bdf8',
      '--site-accent-text': '#fcd34d', '--site-tint': '#20364a', '--site-highlight': '#fde68a',
      '--site-highlight-text': '#0c4a6e', '--site-border': '#469bc4', '--site-code-background': '#0f172a',
    },
  },
  {
    id: 'ocean', label: '海盐蓝', swatch: '#4295ac',
    light: {
      '--site-background': '#eff5f7', '--site-surface': '#fbfdfd', '--article-background': '#fbfdfd',
      '--site-text': '#243b47', '--site-text-muted': '#4b6370', '--site-link': '#1d596d',
      '--site-primary': '#236781', '--site-primary-text': '#ffffff', '--site-accent': '#4295ac',
      '--site-accent-text': '#4d6739', '--site-tint': '#dfeef2', '--site-highlight': '#deebcf',
      '--site-highlight-text': '#294735', '--site-border': '#3e7f93', '--site-code-background': '#10232c',
    },
    dark: {
      '--site-background': '#13242d', '--site-surface': '#1c323d', '--article-background': '#192e38',
      '--site-text': '#e1edf2', '--site-text-muted': '#b3c9d4', '--site-link': '#98d4e5',
      '--site-primary': '#236781', '--site-primary-text': '#ffffff', '--site-accent': '#78bfd3',
      '--site-accent-text': '#deebcf', '--site-tint': '#25434f', '--site-highlight': '#dce8cd',
      '--site-highlight-text': '#294735', '--site-border': '#649cae', '--site-code-background': '#10232c',
    },
  },
  {
    id: 'forest', label: '森林绿', swatch: '#538966',
    light: {
      '--site-background': '#f3f6f0', '--site-surface': '#fcfdf8', '--article-background': '#fcfdf8',
      '--site-text': '#243a2c', '--site-text-muted': '#4f6553', '--site-link': '#285c3c',
      '--site-primary': '#2d6748', '--site-primary-text': '#ffffff', '--site-accent': '#538966',
      '--site-accent-text': '#626027', '--site-tint': '#e4efdf', '--site-highlight': '#e3dfad',
      '--site-highlight-text': '#334323', '--site-border': '#558164', '--site-code-background': '#112019',
    },
    dark: {
      '--site-background': '#14221c', '--site-surface': '#1d3026', '--article-background': '#1a2b22',
      '--site-text': '#e5eee0', '--site-text-muted': '#b8c9b5', '--site-link': '#a9d2aa',
      '--site-primary': '#2d6748', '--site-primary-text': '#ffffff', '--site-accent': '#84b68a',
      '--site-accent-text': '#e3dfad', '--site-tint': '#263f2f', '--site-highlight': '#dedbaa',
      '--site-highlight-text': '#2d3b22', '--site-border': '#6f9b74', '--site-code-background': '#112019',
    },
  },
  {
    id: 'coffee', label: '暖咖', swatch: '#a77a54',
    light: {
      '--site-background': '#f5efe6', '--site-surface': '#fffbf4', '--article-background': '#fffbf4',
      '--site-text': '#403328', '--site-text-muted': '#6a5849', '--site-link': '#795032',
      '--site-primary': '#805437', '--site-primary-text': '#ffffff', '--site-accent': '#a77a54',
      '--site-accent-text': '#785422', '--site-tint': '#efe3d2', '--site-highlight': '#eed09b',
      '--site-highlight-text': '#543519', '--site-border': '#956e4f', '--site-code-background': '#221a16',
    },
    dark: {
      '--site-background': '#261e19', '--site-surface': '#362a22', '--article-background': '#30261f',
      '--site-text': '#f2e8d8', '--site-text-muted': '#d1bba5', '--site-link': '#e5bc94',
      '--site-primary': '#805437', '--site-primary-text': '#ffffff', '--site-accent': '#c79b73',
      '--site-accent-text': '#eed09b', '--site-tint': '#483528', '--site-highlight': '#e6c18f',
      '--site-highlight-text': '#543519', '--site-border': '#ad8563', '--site-code-background': '#221a16',
    },
  },
  {
    id: 'graphite', label: '石墨', swatch: '#788698',
    light: {
      '--site-background': '#f0f1f2', '--site-surface': '#fdfdfc', '--article-background': '#fdfdfc',
      '--site-text': '#30343a', '--site-text-muted': '#59616b', '--site-link': '#434f62',
      '--site-primary': '#4c586b', '--site-primary-text': '#ffffff', '--site-accent': '#788698',
      '--site-accent-text': '#665c43', '--site-tint': '#e3e7ed', '--site-highlight': '#e4dcc9',
      '--site-highlight-text': '#423d32', '--site-border': '#667486', '--site-code-background': '#181d24',
    },
    dark: {
      '--site-background': '#1c2026', '--site-surface': '#2a3038', '--article-background': '#252b32',
      '--site-text': '#e7e9ec', '--site-text-muted': '#bfc7d1', '--site-link': '#c2d0e6',
      '--site-primary': '#4c586b', '--site-primary-text': '#ffffff', '--site-accent': '#9dacbf',
      '--site-accent-text': '#e4dcc9', '--site-tint': '#363f4a', '--site-highlight': '#dfd6c4',
      '--site-highlight-text': '#423d32', '--site-border': '#8696aa', '--site-code-background': '#181d24',
    },
  },
] as const satisfies readonly { id: string; label: string; swatch: string; light: PaletteColors; dark: PaletteColors }[];

export type PaletteId = (typeof palettePresets)[number]['id'];

export const layoutPresets = [
  { id: 'paper', label: '纸面', description: '宽松留白，保留原有阅读节奏' },
  { id: 'compact', label: '紧凑', description: '收拢间距，浏览更多内容' },
  { id: 'cards', label: '卡片', description: '用独立卡片分隔内容' },
] as const;

export type LayoutId = (typeof layoutPresets)[number]['id'];

/** Only the original light paper surfaces take author-configured colors. */
export function buildAppearanceCss(overrides: { backgroundColor: string; surfaceColor: string; articleColor: string }): string {
  if ([overrides.backgroundColor, overrides.surfaceColor, overrides.articleColor].some((value) => !/^#[0-9a-f]{6}$/i.test(value))) {
    throw new Error('外观颜色必须填写 # 加六位十六进制颜色值');
  }
  const rule = (selector: string, colors: PaletteColors) => `${selector}{${Object.entries(colors).map(([key, value]) => `${key}:${value};`).join('')}}`;
  return palettePresets.map((preset) => {
    const light = preset.id === 'paper' ? {
      ...preset.light,
      '--site-background': overrides.backgroundColor,
      '--site-surface': overrides.surfaceColor,
      '--article-background': overrides.articleColor,
    } : preset.light;
    return `${rule(`:root[data-palette="${preset.id}"]`, light)}\n${rule(`:root[data-palette="${preset.id}"].dark`, preset.dark)}`;
  }).join('\n');
}
