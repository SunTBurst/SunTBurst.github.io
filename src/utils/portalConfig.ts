import type { PortalConfig } from '../types/portal';

export function validatePortalConfig(config: PortalConfig): string[] {
  const errors: string[] = [];
  if (config.identity.name !== 'SunTBurst') errors.push('identity.name must be SunTBurst');
  if (config.startHere.length < 3) errors.push('at least three start paths are required');
  const hrefs = config.startHere.map(({ href }) => href);
  if (new Set(hrefs).size !== hrefs.length) errors.push('start paths must be unique');
  for (const link of config.startHere) {
    if (!link.href.startsWith('/') || !link.nextHref.startsWith('/')) errors.push(`invalid local path: ${link.title}`);
    if (link.href === link.nextHref) errors.push(`path must continue to a second page: ${link.title}`);
  }
  return errors;
}
