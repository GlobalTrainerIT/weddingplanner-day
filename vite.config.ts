import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://weddingplanner.day';

const ROUTES: Record<string, { title: string; description: string; canonical: string }> = {
  privacy: {
    title: 'Privacy Policy — Vow Wedding Planner',
    description: 'Read the Vow Wedding Planner privacy policy. Learn how we collect, use, and protect your wedding planning data.',
    canonical: `${SITE}/privacy`,
  },
  terms: {
    title: 'Terms of Service — Vow Wedding Planner',
    description: 'Read the Vow Wedding Planner terms of service. Understand the rules and guidelines for using the Vow app.',
    canonical: `${SITE}/terms`,
  },
};

function perRouteSeoPlugin() {
  return {
    name: 'per-route-seo',
    closeBundle() {
      const indexHtmlPath = path.resolve('dist/index.html');
      if (!fs.existsSync(indexHtmlPath)) return;
      const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

      for (const [route, meta] of Object.entries(ROUTES)) {
        const html = indexHtml
          .replace(
            /<title>[^<]*<\/title>/,
            `<title>${meta.title}</title>`,
          )
          .replace(
            /<meta name="description" content="[^"]*" \/>/,
            `<meta name="description" content="${meta.description}" />`,
          )
          .replace(
            /<link rel="canonical" href="[^"]*" \/>/,
            `<link rel="canonical" href="${meta.canonical}" />`,
          )
          .replace(
            /<meta property="og:url" content="[^"]*" \/>/,
            `<meta property="og:url" content="${meta.canonical}" />`,
          )
          .replace(
            /<meta property="og:title" content="[^"]*" \/>/,
            `<meta property="og:title" content="${meta.title}" />`,
          )
          .replace(
            /<meta property="og:description" content="[^"]*" \/>/,
            `<meta property="og:description" content="${meta.description}" />`,
          )
          .replace(
            /<meta name="twitter:title" content="[^"]*" \/>/,
            `<meta name="twitter:title" content="${meta.title}" />`,
          )
          .replace(
            /<meta name="twitter:description" content="[^"]*" \/>/,
            `<meta name="twitter:description" content="${meta.description}" />`,
          );

        const dir = path.resolve('dist', route);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), perRouteSeoPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
