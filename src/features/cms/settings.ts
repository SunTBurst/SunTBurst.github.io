import { appearanceConfig, siteConfig } from '../../config/site';
import { layoutPresets, palettePresets } from '../../config/appearance';
import about from '../../config/about.md?raw';
import type { CmsSettings } from './types';

export const defaultCmsSettings: CmsSettings = {
  title: siteConfig.title, subtitle: siteConfig.subtitle, author: siteConfig.author,
  avatar: siteConfig.avatar, about, announcement: '',
  defaultPalette: appearanceConfig.defaultPalette, defaultLayout: appearanceConfig.defaultLayout,
};

export function resolveCmsSettings(value?: Partial<CmsSettings>): CmsSettings {
  const result = { ...defaultCmsSettings, ...value };
  if (!palettePresets.some((p) => p.id === result.defaultPalette)) result.defaultPalette = defaultCmsSettings.defaultPalette;
  if (!layoutPresets.some((p) => p.id === result.defaultLayout)) result.defaultLayout = defaultCmsSettings.defaultLayout;
  if (!/^\/(?:images|media)\//.test(result.avatar) && !/^https:\/\/[^\s]+$/.test(result.avatar)) result.avatar = defaultCmsSettings.avatar;
  return result;
}
