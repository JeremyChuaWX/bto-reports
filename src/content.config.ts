import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// One report per project, synced from the research folder by scripts/sync_data.py
const reports = defineCollection({
  loader: glob({
    pattern: 'projects/*/*/report.md',
    base: './src/data',
    generateId: ({ entry }) => entry.replace(/^projects\//, '').replace(/\/report\.md$/, ''),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: 'summary.md', base: './src/data' }),
});

export const collections = { reports, pages };
