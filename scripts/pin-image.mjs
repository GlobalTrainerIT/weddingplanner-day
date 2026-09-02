/**
 * Pin image generator.
 *
 * Renders a branded 1000x1500 (2:3) PNG per post. Pinterest ranks vertical
 * images far above landscape, and the site's og.png is 1200x630 — using it as
 * a pin wastes the impression. Generating the pin from the post's own title
 * means a new article is publishable with no design step, which is the whole
 * point: the pipeline must not stall waiting on a human to make an image.
 *
 * SVG has no automatic text wrapping, so line breaking is done here against an
 * estimated advance width per character. The estimate is deliberately
 * conservative — a line that wraps one word early looks fine, a line that
 * overflows the card does not.
 */
import { readFileSync, existsSync } from 'node:fs'
import sharp from 'sharp'

export const PIN_WIDTH = 1000
export const PIN_HEIGHT = 1500

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Rough per-character advance as a fraction of font size, for a bold humanist
// sans. Good enough for wrapping; nothing here needs to be typographically exact.
const NARROW = new Set(['i', 'l', 'j', 't', 'f', 'r', 'I', '.', ',', ':', ';', "'", '!', '|', ' '])
const WIDE = new Set(['m', 'w', 'M', 'W', 'O', 'Q', 'G', 'D', '—'])

function textWidth(text, fontSize) {
  let units = 0
  for (const ch of String(text)) {
    if (NARROW.has(ch)) units += 0.32
    else if (WIDE.has(ch)) units += 0.82
    else if (ch >= 'A' && ch <= 'Z') units += 0.66
    else units += 0.54
  }
  return units * fontSize
}

/** Greedy wrap. Returns an array of lines that each fit inside maxWidth. */
function wrap(text, fontSize, maxWidth) {
  const words = String(text).trim().split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (textWidth(candidate, fontSize) <= maxWidth || !line) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Shrink the title until it fits the space allotted. A long headline that
 * renders at 8 lines of 68px runs off the card, so size follows length.
 */
function fitTitle(title, maxWidth, maxLines) {
  for (const size of [76, 70, 64, 58, 52, 46, 42]) {
    const lines = wrap(title, size, maxWidth)
    if (lines.length <= maxLines) return { size, lines }
  }
  const size = 42
  return { size, lines: wrap(title, size, maxWidth).slice(0, maxLines) }
}

function logoMarkup(brand, x, y, size) {
  // A caller can pass a ready data URI (used when the source logo is a format
  // librsvg will not render inline, e.g. webp — convert it to PNG first).
  if (brand.logoDataUri) {
    return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="${brand.logoDataUri}" />`
  }
  if (brand.logoFile && existsSync(brand.logoFile)) {
    const b64 = readFileSync(brand.logoFile).toString('base64')
    const mime = brand.logoFile.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
    return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:${mime};base64,${b64}" />`
  }
  const letter = (brand.name || '?').trim().charAt(0).toUpperCase()
  const r = size / 2
  return `<circle cx="${x + r}" cy="${y + r}" r="${r}" fill="${brand.color}" />
    <text x="${x + r}" y="${y + r + size * 0.19}" font-family="${brand.fontStack}" font-size="${size * 0.55}"
          font-weight="700" fill="#ffffff" text-anchor="middle">${esc(letter)}</text>`
}

/**
 * @param {object} post   { title, board, pinLines?, }
 * @param {object} brand  { name, domain, color, colorDark, colorPale, ink, muted, tagline, fontStack, logoFile }
 * @returns {Promise<Buffer>} PNG
 */
export async function renderPin(post, brand) {
  const PAD = 78
  const INNER = PIN_WIDTH - PAD * 2
  const CX = PIN_WIDTH / 2

  let y = PAD + 46

  // Brand lockup
  const logoSize = 74
  const brandNameSize = 44
  const lockupWidth = logoSize + 20 + textWidth(brand.name, brandNameSize)
  const lockupX = CX - lockupWidth / 2
  const lockup = `${logoMarkup(brand, lockupX, y, logoSize)}
    <text x="${lockupX + logoSize + 20}" y="${y + logoSize * 0.7}" font-family="${brand.fontStack}"
          font-size="${brandNameSize}" font-weight="800" fill="${brand.colorDark}">${esc(brand.name)}</text>`
  y += logoSize + 74

  // The middle block (pill, title, rule, support) is laid out from zero and
  // then translated as a unit, so it can be optically centred in the space
  // between the lockup and the footer. Laying it out from the top instead
  // leaves a dead lower third on short titles.
  const blockTop = y
  let yy = 0

  // Category pill
  const board = (post.board || '').toUpperCase()
  const pillFont = 26
  const pillW = textWidth(board, pillFont) + 60
  const pillH = 52
  const pill = board
    ? `<rect x="${CX - pillW / 2}" y="${yy}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${brand.colorPale}" />
    <text x="${CX}" y="${yy + pillH / 2 + pillFont * 0.36}" font-family="${brand.fontStack}" font-size="${pillFont}"
          font-weight="800" letter-spacing="2.4" fill="${brand.colorDark}" text-anchor="middle">${esc(board)}</text>`
    : ''
  if (board) yy += pillH + 62

  // Title
  const { size: titleSize, lines: titleLines } = fitTitle(post.title, INNER - 30, 5)
  const titleLead = titleSize * 1.2
  const title = titleLines
    .map(
      (line, i) =>
        `<text x="${CX}" y="${yy + titleSize * 0.82 + i * titleLead}" font-family="${brand.fontStack}"
          font-size="${titleSize}" font-weight="800" fill="${brand.ink}" text-anchor="middle">${esc(line)}</text>`
    )
    .join('\n    ')
  yy += titleLines.length * titleLead + 46

  // Accent rule
  const rule = `<rect x="${CX - 60}" y="${yy}" width="120" height="7" rx="3.5" fill="${brand.color}" />`
  yy += 7 + 54
  y = 0

  // Supporting lines: explicit pinLines, else sentences from the description.
  const supportSize = 34
  const supportLead = supportSize * 1.5
  const raw = post.pinLines
    ? String(post.pinLines).split('|').map((s) => s.trim()).filter(Boolean)
    : String(post.pinDescription || post.description || '')
        .split(/(?<=[.!?])\s+/)
        .slice(0, 2)
  const supportLines = []
  for (const item of raw) {
    for (const line of wrap(item, supportSize, INNER - 60)) supportLines.push(line)
    if (supportLines.length >= 6) break
  }
  const shown = supportLines.slice(0, 6)
  const support = shown
    .map(
      (line, i) =>
        `<text x="${CX}" y="${yy + supportSize + i * supportLead}" font-family="${brand.fontStack}"
          font-size="${supportSize}" fill="${brand.muted}" text-anchor="middle">${esc(line)}</text>`
    )
    .join('\n    ')
  const blockHeight = yy + shown.length * supportLead

  // Footer sits at a fixed offset from the bottom so cards stay consistent.
  const footY = PIN_HEIGHT - PAD - 74

  // Centre the block in the gap between the lockup and the footer.
  const slack = footY - 90 - blockTop - blockHeight
  const blockY = blockTop + Math.max(0, slack / 2)
  const footer = `<text x="${CX}" y="${footY}" font-family="${brand.fontStack}" font-size="27"
          fill="${brand.muted}" text-anchor="middle">${esc(brand.tagline)}</text>
    <text x="${CX}" y="${footY + 50}" font-family="${brand.fontStack}" font-size="34" font-weight="800"
          fill="${brand.colorDark}" text-anchor="middle">${esc(brand.domain)}</text>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}">
    <rect width="${PIN_WIDTH}" height="${PIN_HEIGHT}" fill="${brand.color}" />
    <rect x="16" y="16" width="${PIN_WIDTH - 32}" height="${PIN_HEIGHT - 32}" rx="34" fill="${brand.paper}" />
    ${lockup}
    <g transform="translate(0, ${blockY.toFixed(1)})">
    ${pill}
    ${title}
    ${rule}
    ${support}
    </g>
    ${footer}
  </svg>`

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}
