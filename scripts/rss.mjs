/**
 * RSS feed + Pinterest pin images for the blog.
 *
 * Runs after prerender (see the `postbuild` script). The blog pages themselves
 * already exist — prerender emits dist/blog/<slug>/index.html with correct
 * og:type=article tags. What was missing is a feed, which is what a social
 * scheduler (Content360's RSS Campaign) reads to publish pins and posts
 * automatically. Without it, every pin has to be written and linked by hand,
 * and pins end up pointing at the homepage instead of the article they promise.
 *
 * Post data is read from the same pure-data modules prerender uses —
 * src/lib/seo.ts (ROUTE_SEO) and src/lib/blogPostDates.ts — rather than from
 * src/components/BlogPostPage.tsx, because that file contains JSX and Node's
 * type-stripping does not handle JSX. Those .ts imports require Node >= 22.18;
 * netlify.toml pins the version for exactly this reason.
 *
 * Outputs:
 *   dist/blog/rss.xml           the feed
 *   dist/blog/pins/<slug>.png   1000x1500 pin per post
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ROUTE_SEO, SITE_URL_EXPORT, DEFAULT_OG } from '../src/lib/seo.ts'
import { BLOG_POST_DATES } from '../src/lib/blogPostDates.ts'
import { renderPin, PIN_WIDTH, PIN_HEIGHT } from './pin-image.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const PINS = path.join(DIST, 'blog', 'pins')

const SITE = String(SITE_URL_EXPORT).replace(/\/$/, '')

const FEED_TITLE = 'Vow — Wedding Planning Guides'
const FEED_DESC =
  'Straight answers to the wedding questions that actually cost money and time: budgets, guest lists, seating, vendor contracts, and day-of timelines.'

const BRAND = {
  name: 'Vow',
  domain: 'weddingplanner.day',
  tagline: 'Checklist · budget · guest list · seating',
  color: '#c9a96e',
  colorDark: '#a8874d',
  colorPale: '#f5ecdc',
  paper: '#fdfbf7',
  ink: '#2a1f15',
  muted: '#6a5a4a',
  fontStack: "'Helvetica Neue', Helvetica, Arial, sans-serif",
}

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g
const xml = (s = '') => esc(String(s).replace(CONTROL_CHARS, ''))

function rfc822(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toUTCString()
}

/**
 * Derive the post list from ROUTE_SEO. Every blog route already carries the
 * title and description the feed needs, so the feed cannot describe a post
 * differently from the page — they come from one source.
 */
function collectPosts() {
  const posts = []
  for (const [route, seo] of Object.entries(ROUTE_SEO)) {
    if (!route.startsWith('/blog/')) continue
    const slug = route.slice('/blog/'.length)
    if (!slug || slug.includes('/')) continue
    const date = BLOG_POST_DATES[slug]
    if (!date) {
      console.warn(`rss: no date for ${slug}; skipping`)
      continue
    }
    posts.push({
      slug,
      title: seo.title,
      description: seo.description,
      board: seo.category || 'Wedding Planning',
      url: `${SITE}/blog/${slug}/`,
      date,
    })
  }
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/** librsvg will not render webp inline, so convert the icon to a PNG data URI. */
async function logoDataUri() {
  for (const candidate of ['public/icon-512.webp', 'public/icon-512.png', 'public/icon-192.webp']) {
    const file = path.join(ROOT, candidate)
    if (!existsSync(file)) continue
    try {
      const png = await sharp(readFileSync(file)).resize(256, 256, { fit: 'contain' }).png().toBuffer()
      return `data:image/png;base64,${png.toString('base64')}`
    } catch (err) {
      console.warn(`rss: could not convert ${candidate} (${err.message})`)
    }
  }
  return null
}

async function buildPins(posts, brand) {
  mkdirSync(PINS, { recursive: true })
  for (const post of posts) {
    try {
      const png = await renderPin({ ...post, pinDescription: post.description }, brand)
      writeFileSync(path.join(PINS, `${post.slug}.png`), png)
      post.image = `${SITE}/blog/pins/${post.slug}.png`
      post.imageWidth = PIN_WIDTH
      post.imageHeight = PIN_HEIGHT
    } catch (err) {
      console.warn(`rss: pin render failed for ${post.slug} (${err.message}); using default og image`)
      post.image = SITE + DEFAULT_OG
      post.imageWidth = null
      post.imageHeight = null
    }
  }
}

function renderFeed(posts) {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(p.url)}</link>
      <guid isPermaLink="true">${xml(p.url)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <category>${xml(p.board)}</category>
      <description>${xml(p.description)}</description>
      <enclosure url="${xml(p.image)}" type="image/png" length="0" />
      <media:content url="${xml(p.image)}" medium="image" type="image/png"${
        p.imageWidth ? ` width="${p.imageWidth}" height="${p.imageHeight}"` : ''
      }>
        <media:title type="plain">${xml(p.title)}</media:title>
        <media:description type="plain">${xml(p.description)}</media:description>
      </media:content>
      <media:thumbnail url="${xml(p.image)}" />
    </item>`
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xml(FEED_TITLE)}</title>
    <link>${SITE}/blog</link>
    <description>${xml(FEED_DESC)}</description>
    <language>en-us</language>
    <lastBuildDate>${posts.length ? rfc822(posts[0].date) : new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`
}

const posts = collectPosts()
const brand = { ...BRAND, logoDataUri: await logoDataUri() }
await buildPins(posts, brand)
mkdirSync(path.join(DIST, 'blog'), { recursive: true })
writeFileSync(path.join(DIST, 'blog', 'rss.xml'), renderFeed(posts))

console.log(`rss: ${posts.length} post(s) -> dist/blog/rss.xml`)
console.log(`rss: ${posts.length} pin image(s) -> dist/blog/pins/`)
