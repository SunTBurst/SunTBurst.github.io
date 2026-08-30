import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    published: z.coerce.date(),
    description: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    slug: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const talksCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/talks" }),
  schema: z.object({
    title: z.string().min(1).optional(),
    published: z.coerce.date(),
    description: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    slug: z.string().optional(),
    draft: z.boolean().default(false),
    location: z.string().optional(),
    weather: z.string().optional(),
    mood: z.string().optional(),
    device: z.string().optional(),
  })
});

const knowledgeCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/knowledge" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    topics: z.array(z.string()).default([]),
    status: z.enum(['seed', 'growing', 'stable']).default('seed'),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const projectsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    started: z.coerce.date(),
    updated: z.coerce.date(),
    status: z.enum(['building', 'maintaining', 'archived']),
    tags: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const updatesCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/updates" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    published: z.coerce.date(),
    kind: z.enum(['site', 'knowledge', 'project', 'content']),
    href: z.string().startsWith('/'),
    status: z.enum(['completed', 'in-progress']),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  posts: postsCollection,
  talks: talksCollection,
  knowledge: knowledgeCollection,
  projects: projectsCollection,
  updates: updatesCollection,
};

