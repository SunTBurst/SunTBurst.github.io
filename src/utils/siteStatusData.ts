import { portalTools } from './homeModel';
import { buildPortalIndex } from './portalIndex';
import { loadPublicProfileSnapshot } from './publicProfilesData';
import { buildSiteMetrics, buildSiteStatusSnapshot } from './siteMetrics';

export async function loadSiteStatusSnapshot() {
  const [entries, publicProfile] = await Promise.all([
    buildPortalIndex(),
    loadPublicProfileSnapshot(),
  ]);
  return buildSiteStatusSnapshot(
    buildSiteMetrics(entries, portalTools),
    import.meta.env.PUBLIC_BUILD_SHA,
    new Date().toISOString(),
    publicProfile.origin,
  );
}
