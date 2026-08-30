import { getCollection } from 'astro:content';

export const getPublishedKnowledge = () => getCollection('knowledge', ({ data }) => !data.draft);
export const getPublishedProjects = () => getCollection('projects', ({ data }) => !data.draft);
export const getPublishedUpdates = () => getCollection('updates', ({ data }) => !data.draft);
