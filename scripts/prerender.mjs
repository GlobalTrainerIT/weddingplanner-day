import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROUTE_SEO, SITE_URL_EXPORT, DEFAULT_OG, faqJsonLd } from '../src/lib/seo.ts';
import { BLOG_POST_DATES } from '../src/lib/blogPostDates.ts';

const GA_ID = process.env.VITE_GA_MEASUREMENT_ID;
const GSC_TOKEN = process.env.VITE_GOOGLE_SITE_VERIFICATION;
const PINTEREST_VERIFY = process.env.VITE_PINTEREST_DOMAIN_VERIFY;

const TODAY = new Date().toISOString().slice(0, 10);

const distDir = join(process.cwd(), 'dist');
const template = readFileSync(join(distDir, 'index.html'), 'utf-8');

function injectTags(html, seo, pathname) {
  const title = seo.title || 'Vow — Wedding Planning App';
  const description = seo.description || 'Plan your entire wedding in one beautiful place.';
  const canonical = `${SITE_URL_EXPORT}${seo.canonical || pathname}`;
  const ogImage = seo.ogImage ? `${SITE_URL_EXPORT}${seo.ogImage}` : `${SITE_URL_EXPORT}${DEFAULT_OG}`;
  const ogType = seo.ogType || 'website';

  let out = html;

  // Replace title
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

  // Replace meta description
  out = out.replace(/<meta\s+name="description"\s+content="[^"]*"/, `<meta name="description" content="${description}"`);

  // Replace canonical
  out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"/, `<link rel="canonical" href="${canonical}"`);

  // Replace OG tags
  out = out.replace(/<meta\s+property="og:title"\s+content="[^"]*"/, `<meta property="og:title" content="${title}"`);
  out = out.replace(/<meta\s+property="og:description"\s+content="[^"]*"/, `<meta property="og:description" content="${description}"`);
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"/, `<meta property="og:url" content="${canonical}"`);
  out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"/, `<meta property="og:image" content="${ogImage}"`);
  out = out.replace(/<meta\s+property="og:type"\s+content="[^"]*"/, `<meta property="og:type" content="${ogType}"`);

  // Replace Twitter tags
  out = out.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"/, `<meta name="twitter:title" content="${title}"`);
  out = out.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"/, `<meta name="twitter:description" content="${description}"`);
  out = out.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"/, `<meta name="twitter:image" content="${ogImage}"`);

  // Remove existing JSON-LD scripts in <head>
  out = out.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');

  // Add noindex if needed
  if (seo.noindex) {
    out = out.replace('</head>', `  <meta name="robots" content="noindex, nofollow" />\n  </head>`);
  }

  // Inject env-driven head tags for crawlers
  const envHeadTags = [];
  if (GSC_TOKEN) {
    envHeadTags.push(`  <meta name="google-site-verification" content="${GSC_TOKEN}" />`);
  }
  if (PINTEREST_VERIFY) {
    envHeadTags.push(`  <meta name="p:domain_verify" content="${PINTEREST_VERIFY}" />`);
  }
  if (GA_ID) {
    envHeadTags.push(`  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`);
    envHeadTags.push(`  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});</script>`);
  }
  if (envHeadTags.length > 0) {
    out = out.replace('</head>', `${envHeadTags.join('\n')}\n  </head>`);
  }

  // Build JSON-LD blocks
  const jsonLdBlocks = [];
  if (seo.jsonLd) {
    const blocks = Array.isArray(seo.jsonLd) ? seo.jsonLd : [seo.jsonLd];
    jsonLdBlocks.push(...blocks);
  }
  if (pathname === '/') {
    jsonLdBlocks.push(faqJsonLd);
  }
  const jsonLdHtml = jsonLdBlocks
    .map(b => `  <script type="application/ld+json">\n  ${JSON.stringify(b, null, 2)}\n  </script>`)
    .join('\n');

  if (jsonLdHtml) {
    out = out.replace('</head>', `${jsonLdHtml}\n  </head>`);
  }

  return out;
}

// Generate prerendered HTML for each route
for (const [pathname, seo] of Object.entries(ROUTE_SEO)) {
  if (seo.excludeFromSitemap && pathname !== '/login' && pathname !== '/signup') continue;

  // Skip future-dated blog posts
  if (pathname.startsWith('/blog/')) {
    const slug = pathname.replace('/blog/', '');
    const date = BLOG_POST_DATES[slug];
    if (date && date > TODAY) continue;
  }

  const routePath = pathname === '/' ? '' : pathname;
  const outDir = join(distDir, routePath);
  const outFile = join(outDir, 'index.html');

  const html = injectTags(template, seo, pathname);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, html);
  console.log(`  prerendered: ${pathname}`);
}

// Generate sitemap.xml
const sitemapEntries = Object.entries(ROUTE_SEO)
  .filter(([, seo]) => !seo.excludeFromSitemap)
  .filter(([pathname]) => {
    if (pathname.startsWith('/blog/')) {
      const slug = pathname.replace('/blog/', '');
      const date = BLOG_POST_DATES[slug];
      if (date && date > TODAY) return false;
    }
    return true;
  })
  .map(([pathname, seo]) => {
    const lastmod = new Date().toISOString().slice(0, 10);
    const priority = seo.priority ?? 0.5;
    const changefreq = seo.changefreq ?? 'monthly';
    return `  <url>
    <loc>${SITE_URL_EXPORT}${pathname}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
  })
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;

writeFileSync(join(distDir, 'sitemap.xml'), sitemap);
writeFileSync(join(process.cwd(), 'public', 'sitemap.xml'), sitemap);
console.log('  generated: sitemap.xml');

console.log('Prerender complete.');
