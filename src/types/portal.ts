export type FeatureImplementationStatus = 'planned' | 'implemented' | 'verified';
export type FeatureRuntimeState = 'disabled' | 'preview' | 'enabled';
export type PortalKind = 'page' | 'post' | 'talk' | 'knowledge' | 'project' | 'update';

export interface PortalIndexEntry {
  id: string;
  kind: PortalKind;
  title: string;
  description: string;
  href: `/${string}`;
  updatedAt: string;
  topics: string[];
}

export interface PortalLink {
  title: string;
  description: string;
  href: `/${string}`;
  nextHref: `/${string}`;
  accent: 'blue' | 'amber' | 'emerald' | 'violet';
}

export interface KnowledgeTopic {
  slug: string;
  title: string;
  description: string;
  status: 'mapping' | 'growing' | 'established';
}

export interface PortalProject {
  slug: string;
  title: string;
  summary: string;
  status: 'building' | 'maintaining' | 'archived';
  href: `/${string}`;
  updated: string;
}

export interface PortalUpdate {
  title: string;
  summary: string;
  href: `/${string}`;
  implementationStatus: FeatureImplementationStatus;
  runtimeState: FeatureRuntimeState;
}

export interface VisitorJourney {
  slug: string;
  title: string;
  duration: string;
  description: string;
  outcome: string;
  stops: Array<{ label: string; href: `/${string}` }>;
}

export interface EditorialPrinciple {
  slug: string;
  title: string;
  description: string;
}

export interface PortalRoadmapItem {
  title: string;
  description: string;
  state: 'completed' | 'configuration' | 'planned';
  href: `/${string}`;
}

export interface PortalConfig {
  identity: { name: string; tagline: string; timeZone: string };
  startHere: PortalLink[];
  journeys: VisitorJourney[];
  principles: EditorialPrinciple[];
  roadmap: PortalRoadmapItem[];
  focus: string[];
  topics: KnowledgeTopic[];
  projects: PortalProject[];
}
