import { getCollection } from 'astro:content';

export function getPublishedPosts() {
  return getCollection('posts', ({ data }) => !data.draft);
}

export function getPublishedTalks() {
  return getCollection('talks', ({ data }) => !data.draft);
}
