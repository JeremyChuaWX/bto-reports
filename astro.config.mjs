// @ts-check
import { defineConfig } from 'astro/config';

// Served from GitHub Pages at https://jeremychuawx.github.io/bto-reports/
export default defineConfig({
  site: 'https://jeremychuawx.github.io',
  base: '/bto-reports',
  trailingSlash: 'always',
});
