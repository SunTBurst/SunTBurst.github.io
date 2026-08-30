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

export const collections = {
  posts: postsCollection,
  talks: talksCollection
};

