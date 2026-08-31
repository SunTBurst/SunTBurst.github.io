import type { PortalConfig } from '../types/portal';

export function validatePortalConfig(config: PortalConfig): string[] {
  const errors: string[] = [];
  if (config.identity.name !== 'SunTBurst') errors.push('identity.name must be SunTBurst');
  if (config.startHere.length < 3) errors.push('at least three start paths are required');
  const hrefs = config.startHere.map(({ href }) => href);
  if (new Set(hrefs).size !== hrefs.length) errors.push('start paths must be unique');
  for (const link of config.startHere) {
    if (
      !link.href.startsWith('/') || link.href.startsWith('//')
      || !link.nextHref.startsWith('/') || link.nextHref.startsWith('//')
    ) errors.push(`invalid local path: ${link.title}`);
    if (link.href === link.nextHref) errors.push(`path must continue to a second page: ${link.title}`);
  }
  if (config.journeys.length < 3) errors.push('at least three visitor journeys are required');
  for (const journey of config.journeys) {
    if (journey.stops.length < 3) errors.push(`journey must have at least three stops: ${journey.title}`);
    for (const stop of journey.stops) {
      if (!stop.href.startsWith('/') || stop.href.startsWith('//')) errors.push(`invalid journey stop: ${journey.title}`);
    }
  }
  return errors;
}
