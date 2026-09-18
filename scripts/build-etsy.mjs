/**
 * Etsy printables: the Vow wedding planner as a digital download.
 *
 * Etsy shoppers searching "wedding planner printable" are the same couples the
 * app is for, and many of them want paper. Selling the printable there earns on
 * its own AND puts weddingplanner.day on the last page of every copy. The
 * checklist comes straight from the app's defaults, so paper and app agree.
 *
 * Run: node scripts/build-etsy.mjs     (needs Google Chrome installed; fonts
 * load from Google Fonts, so it needs the network)
 *
 * Output (etsy/out/, committed so listings can be re-uploaded any time):
 *   vow-wedding-planner-bundle-letter.pdf / -a4.pdf     the full bundle
 *   vow-checklist-*.pdf, vow-budget-*.pdf, vow-guest-rsvp-*.pdf,
 *   vow-day-of-timeline-*.pdf                           single listings
 *   images/<listing>-1..n.jpg                           2700x2025 listing photos
 * Listing copy (titles, tags, descriptions) lives in etsy/LISTINGS.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { DEFAULT_CHECKLIST_TASKS, POST_WEDDING_TASKS } from '../src/lib/checklistDefaults.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'etsy', 'out')
const IMG = path.join(OUT, 'images')
mkdirSync(IMG, { recursive: true })
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const GOLD = '#c9a96e'
const GOLD_DK = '#8a6d3b'
const INK = '#2a1f15'
const MUTED = '#6b5d4f'
const LINE = '#e4d9c6'
const CREAM = '#faf9f7'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

// ---------- page building blocks ----------
const head = (title, sub = '') => `
  <header>
    <div class="kicker">Vow · Wedding Planner</div>
    <h1>${title}</h1>
    ${sub ? `<p class="sub">${sub}</p>` : ''}
    <div class="rule"><span></span>◆<span></span></div>
  </header>`
const foot = `<footer>weddingplanner.day</footer>`
const page = (body, cls = '') => `<section class="page ${cls}">${body}${foot}</section>`
const table = (cols, rows, widths) => `
  <table>
    <colgroup>${widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>
    <thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${Array.from({ length: rows }, () => `<tr>${cols.map(() => '<td></td>').join('')}</tr>`).join('')}</tbody>
  </table>`
const field = (label) => `<div class="field"><label>${label}</label><div class="line"></div></div>`

// ---------- pages ----------
const cover = page(`
  <div class="cover">
    <div class="kicker">The Complete</div>
    <div class="big">Wedding<br>Planner</div>
    <div class="rule wide"><span></span>◆<span></span></div>
    <div class="names">${field('Our names')}</div>
    <div class="names">${field('Wedding date')}</div>
    <p class="tag">Checklist · Budget · Guests · Seating · Day-of Timeline</p>
  </div>`, 'cover-page')

const glance = page(`${head('Our Wedding at a Glance')}
  <div class="grid2">
    ${['Wedding date', 'Ceremony time', 'Ceremony venue', 'Reception venue', 'Total budget', 'Guest count',
       'Officiant', 'Wedding planner', 'Photographer', 'Caterer', 'Florist', 'DJ / Band',
       'Maid / Matron of honor', 'Best man / person', 'Colors & theme', 'Honeymoon destination'].map(field).join('')}
  </div>
  <h2>Our vision</h2><div class="box tall"></div>`)

const TF_ORDER = ['18+ Months', '12 Months', '9 Months', '6 Months', '3 Months', '1 Month', '2 Weeks', '1 Week', 'Day Before', 'Wedding Day', 'After the Big Day']
const allTasks = [...DEFAULT_CHECKLIST_TASKS, ...POST_WEDDING_TASKS]
const groups = TF_ORDER.map((tf) => [tf, allTasks.filter((t) => t.timeframe === tf)]).filter(([, t]) => t.length)
const tfLabel = (tf) => (/^\d|\+/.test(tf) ? `${tf} Before` : tf)
const checkGroup = ([tf, tasks]) => `
  <div class="cgroup"><h3>${tfLabel(tf)}</h3>
    ${tasks.map((t) => `<div class="check"><span class="cb"></span>${esc(t.task)}</div>`).join('')}
    <div class="check"><span class="cb"></span><span class="blank"></span></div>
  </div>`
// Every timeframe on one page: a checklist you can see whole is the point.
const checklist = [
  page(`${head('Wedding Checklist', 'Everything to do, from 18 months out to the thank-you notes')}<div class="cols checklist">${groups.map(checkGroup).join('')}</div>`),
]

// Typical US allocation, as a starting point the couple writes over.
const BUDGET = [['Venue & catering', '45%'], ['Photography & video', '12%'], ['Attire & rings', '10%'], ['Flowers & decor', '8%'],
  ['Music & entertainment', '6%'], ['Stationery & postage', '3%'], ['Hair & makeup', '2%'], ['Transportation', '2%'],
  ['Cake & desserts', '2%'], ['Favors & gifts', '2%'], ['Officiant & license', '1%'], ['Buffer / unexpected', '7%']]
const budget = page(`${head('Budget Tracker', 'Typical share of the total is a starting point — make it yours')}
  <div class="row3">${field('Total budget')}${field('Saved so far')}${field('Contributions')}</div>
  <table class="filled">
    <colgroup><col style="width:30%"><col style="width:10%"><col style="width:15%"><col style="width:15%"><col style="width:15%"><col style="width:15%"></colgroup>
    <thead><tr><th>Category</th><th>Typical</th><th>Budget</th><th>Estimate</th><th>Actual</th><th>Paid</th></tr></thead>
    <tbody>${BUDGET.map(([c, p]) => `<tr><td>${c}</td><td class="muted">${p}</td><td></td><td></td><td></td><td></td></tr>`).join('')}
      <tr><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr class="total"><td>Total</td><td class="muted">100%</td><td></td><td></td><td></td><td></td></tr></tbody>
  </table>
  <h2>Where we can save</h2><div class="box"></div>`)

const payments = page(`${head('Payment Schedule', 'Deposits, balances and due dates in one place')}
  ${table(['Vendor', 'Total', 'Deposit', 'Paid on', 'Balance', 'Due', '✓'], 22, ['26%', '12%', '12%', '13%', '12%', '13%', '6%'])}`)

const vendorBox = (role) => `<div class="vbox"><h4>${role}</h4>${['Name', 'Phone', 'Email', 'Price / deposit'].map(field).join('')}</div>`
const vendors = page(`${head('Vendor Contacts')}
  <div class="grid2 vgrid">${['Venue', 'Caterer', 'Photographer', 'Videographer', 'Florist', 'DJ / Band', 'Baker', 'Hair & Makeup', 'Officiant', 'Rentals'].map(vendorBox).join('')}</div>`)

const guestPage = (n) => page(`${head('Guest List & RSVP', n > 1 ? 'Continued' : 'Track invitations, replies and meal choices')}
  ${table(['#', 'Name(s)', 'Address / contact', 'Party', 'Invite', 'RSVP', 'Meal', 'Table'], 28, ['5%', '24%', '29%', '7%', '8%', '8%', '11%', '8%'])}`)
const guests = [guestPage(1), guestPage(2), guestPage(3)]

const tableCircle = (i) => `<div class="tbl"><div class="circle">Table ${i}</div>${Array.from({ length: 8 }, () => '<div class="seat"></div>').join('')}</div>`
const seating = page(`${head('Seating Chart', 'Head table first, then work outward')}
  <div class="tgrid">${Array.from({ length: 12 }, (_, i) => tableCircle(i + 1)).join('')}</div>`)

const partyBox = (role) => `<div class="prow"><div class="role">${role}</div><div class="line"></div><div class="line short"></div></div>`
const party = page(`${head('Wedding Party', 'Names, sizes and contact')}
  <div class="phead"><span>Role</span><span>Name</span><span>Phone / size</span></div>
  ${['Maid / Matron of honor', 'Best man / person', 'Bridesmaid', 'Bridesmaid', 'Bridesmaid', 'Bridesmaid', 'Groomsman', 'Groomsman', 'Groomsman', 'Groomsman',
     'Flower girl', 'Ring bearer', 'Parents', 'Parents', 'Reader', 'Usher'].map(partyBox).join('')}`)

const hours = ['7:00 AM', '8:00', '9:00', '10:00', '11:00', '12:00 PM', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00', '8:00', '9:00', '10:00', '11:00', '12:00 AM']
const timeline = page(`${head('Day-of Timeline', 'Share a copy with your planner, photographer and wedding party')}
  <div class="tl">${hours.map((h) => `<div class="tlrow"><div class="hr">${h}</div><div class="line"></div><div class="who"></div></div>`).join('')}</div>
  <p class="hint">Tip: hair & makeup usually runs 45 min per person · first look 1.5–2 h before the ceremony · sunset photos 20 min before sunset.</p>`)

const SHOTS = ['Getting ready — details (dress, rings, shoes)', 'Getting ready — candids', 'First look', 'Couple portraits', 'Wedding party — full group',
  'Couple with each family', 'Grandparents', 'Ceremony — processional', 'Ceremony — vows & rings', 'First kiss', 'Recessional',
  'Reception room before guests', 'Grand entrance', 'First dance', 'Parent dances', 'Toasts', 'Cake cutting', 'Bouquet / garter toss', 'Send-off']
const shots = page(`${head('Photo Shot List', 'Must-have moments for your photographer')}
  <div class="cols">${[...SHOTS, '', '', '', '', ''].map((s) => `<div class="check"><span class="cb"></span>${s ? esc(s) : '<span class="blank"></span>'}</div>`).join('')}</div>
  <h2>Family groupings</h2><div class="box"></div>`)

const PACK = {
  Documents: ['Passports / IDs', 'Marriage certificate copy', 'Tickets & confirmations', 'Travel insurance'],
  Clothing: ['Swimwear', 'Evening outfits', 'Comfortable shoes', 'Layers for flights', 'Sleepwear'],
  Essentials: ['Chargers & adapters', 'Medications', 'Sunscreen', 'Toiletries', 'Sunglasses'],
  Extras: ['Camera', 'Book / e-reader', '"Just married" items', 'Thank-you notes to write'],
}
const honeymoon = page(`${head('Honeymoon Packing List')}
  <div class="cols">${Object.entries(PACK).map(([g, items]) => `<div class="cgroup"><h3>${g}</h3>${[...items, ''].map((s) => `<div class="check"><span class="cb"></span>${s ? esc(s) : '<span class="blank"></span>'}</div>`).join('')}</div>`).join('')}</div>`)

const thanks = page(`${head('Thank-You Tracker', 'Gifts received and notes sent')}
  ${table(['Guest(s)', 'Gift', 'Received', 'Note sent'], 26, ['32%', '38%', '15%', '15%'])}`)

const notes = page(`${head('Notes & Ideas')}<div class="ruled">${'<div class="line"></div>'.repeat(26)}</div>`)

const closing = page(`
  <div class="cover">
    <div class="kicker">Want it all in one place?</div>
    <div class="big small">Plan it on<br>your phone, too</div>
    <div class="rule wide"><span></span>◆<span></span></div>
    <p class="pitch">This planner is the paper edition of <b>Vow</b>, a wedding planning app that keeps your checklist,
      budget, guest list, RSVPs and seating chart in sync with your partner — free to start.</p>
    <p class="url">weddingplanner.day</p>
    <p class="tag">Thank you for your purchase, and congratulations! ♡</p>
  </div>`, 'cover-page')

// ---------- products ----------
const PRODUCTS = {
  'vow-wedding-planner-bundle': [cover, glance, ...checklist, budget, payments, vendors, ...guests, seating, party, timeline, shots, honeymoon, thanks, notes, closing],
  'vow-checklist': [...checklist, glance, notes, closing],
  'vow-budget': [budget, payments, closing],
  'vow-guest-rsvp': [...guests, seating, thanks, closing],
  'vow-day-of-timeline': [timeline, party, shots, closing],
}

const css = (size) => `
@page { size: ${size}; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0 }
body { font-family: 'Inter', system-ui, sans-serif; color: ${INK}; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.page { width: 100%; height: ${size === 'A4' ? '297mm' : '11in'}; padding: 0.55in 0.6in 0.5in; position: relative; page-break-after: always; overflow: hidden; background: #fff }
.page::before { content: ''; position: absolute; inset: 0.25in; border: 1px solid ${LINE}; pointer-events: none }
footer { position: absolute; bottom: 0.32in; left: 0; right: 0; text-align: center; font-size: 7.5pt; letter-spacing: .25em; text-transform: uppercase; color: ${GOLD_DK} }
header { text-align: center; margin-bottom: 14px }
.kicker { font-size: 7.5pt; letter-spacing: .35em; text-transform: uppercase; color: ${GOLD_DK} }
h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 30pt; line-height: 1.1; margin-top: 4px }
.sub { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 12pt; color: ${MUTED} }
h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 15pt; margin: 14px 0 6px }
h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 12.5pt; color: ${GOLD_DK}; margin-bottom: 3px; border-bottom: 1px solid ${LINE}; padding-bottom: 2px }
h4 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 12pt; color: ${GOLD_DK}; margin-bottom: 2px }
.rule { display: flex; align-items: center; justify-content: center; gap: 8px; color: ${GOLD}; font-size: 7pt; margin-top: 6px }
.rule span { width: 60px; height: 1px; background: ${GOLD} }
.rule.wide span { width: 110px }
.field { margin-bottom: 9px }
.field label { display: block; font-size: 7pt; letter-spacing: .15em; text-transform: uppercase; color: ${MUTED}; margin-bottom: 12px }
.line { border-bottom: 1px solid ${LINE}; height: 1px }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px }
.row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 20px; margin-bottom: 8px }
.box { border: 1px solid ${LINE}; border-radius: 6px; height: 1.3in }
.box.tall { height: 2.3in }
.cols { column-count: 2; column-gap: 28px }
.cgroup { break-inside: avoid; margin-bottom: 10px }
.checklist .check { font-size: 9pt; padding: 2.4px 0 }
.checklist .cgroup { margin-bottom: 9px }
.checklist .check:has(.blank) { display: none }
.check { display: flex; align-items: flex-start; gap: 7px; font-size: 8.8pt; line-height: 1.3; padding: 2.6px 0; break-inside: avoid }
.cb { flex: none; width: 9px; height: 9px; border: 1px solid ${GOLD_DK}; border-radius: 2px; margin-top: 2px }
.blank { flex: 1; border-bottom: 1px solid ${LINE}; height: 11px }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5pt }
th { font-size: 6.8pt; letter-spacing: .12em; text-transform: uppercase; color: #fff; background: ${GOLD_DK}; font-weight: 600; padding: 5px 5px; text-align: left }
td { border-bottom: 1px solid ${LINE}; height: 0.3in; padding: 0 6px }
td + td, th + th { border-left: 1px solid ${LINE} }
table.filled td { height: 0.4in }
tr.total td { font-weight: 700; border-top: 1.5px solid ${GOLD_DK} }
.muted { color: ${MUTED} }
.vgrid { row-gap: 10px }
.vbox { border: 1px solid ${LINE}; border-radius: 6px; padding: 10px 12px 2px }
.vbox { padding: 8px 12px 0 } .vbox .field { margin-bottom: 5px } .vbox .field label { margin-bottom: 9px }
.tgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 22px; margin-top: 4px }
.tbl { text-align: center }
.circle { width: 0.72in; height: 0.72in; border-radius: 50%; border: 1.5px solid ${GOLD}; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 11pt; color: ${GOLD_DK} }
.seat { border-bottom: 1px solid ${LINE}; height: 13.5px }
.phead { display: grid; grid-template-columns: 1.3fr 2fr 1.3fr; gap: 14px; font-size: 7pt; letter-spacing: .15em; text-transform: uppercase; color: ${MUTED}; margin-bottom: 4px }
.prow { display: grid; grid-template-columns: 1.3fr 2fr 1.3fr; gap: 14px; align-items: end; height: 0.47in }
.prow .role { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 11.5pt; font-weight: 600; padding-bottom: 2px }
.tl { margin-top: 4px }
.tlrow { display: grid; grid-template-columns: 0.9in 1fr 1.3in; gap: 12px; align-items: end; height: 0.43in }
.hr { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 11.5pt; color: ${GOLD_DK}; padding-bottom: 2px }
.who { border-bottom: 1px dashed ${LINE} }
.hint { margin-top: 12px; font-size: 7.8pt; color: ${MUTED}; font-style: italic; text-align: center }
.ruled .line { height: 0.33in }
.cover-page { background: ${CREAM} }
.cover { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center }
.cover .big { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 64pt; line-height: .95; margin: 10px 0 4px }
.cover .big.small { font-size: 42pt }
.cover .names { width: 60%; margin-top: 22px; text-align: left }
.cover .tag { margin-top: 36px; font-size: 8pt; letter-spacing: .25em; text-transform: uppercase; color: ${MUTED} }
.pitch { max-width: 4.6in; margin-top: 22px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 14pt; line-height: 1.45; color: ${MUTED} }
.url { margin-top: 16px; font-size: 13pt; letter-spacing: .3em; text-transform: uppercase; color: ${GOLD_DK}; font-weight: 600 }
`

const html = (pages, size) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>${css(size)}</style></head><body>${pages.join('')}</body></html>`

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const tab = await browser.newPage()

async function load(doc) {
  // 'load' + fonts.ready rather than networkidle0: an idle Google Fonts
  // connection can hold networkidle open until it times out.
  await tab.setContent(doc, { waitUntil: 'load', timeout: 90000 })
  await tab.evaluate(() => document.fonts.ready)
}

// PDFs, both paper sizes (Etsy buyers are worldwide).
for (const [name, pages] of Object.entries(PRODUCTS)) {
  for (const size of ['Letter', 'A4']) {
    await load(html(pages, size))
    // Pages have a fixed height with overflow hidden, so too much content is
    // silently clipped. Fail loudly instead.
    const over = await tab.evaluate(() => [...document.querySelectorAll('.page')]
      .map((p, i) => {
        const limit = p.querySelector('footer').getBoundingClientRect().top
        const last = [...p.querySelectorAll('*:not(footer)')].reduce((m, el) => Math.max(m, el.getBoundingClientRect().bottom), 0)
        return last > limit + 1 ? i + 1 : 0
      }).filter(Boolean))
    if (over.length) throw new Error(`${name} (${size}): page(s) ${over.join(', ')} overflow into the footer`)
    const file = path.join(OUT, `${name}-${size.toLowerCase()}.pdf`)
    await tab.pdf({ path: file, format: size, printBackground: true, preferCSSPageSize: true })
    console.log('wrote', path.relative(ROOT, file), `(${pages.length} pages)`)
  }
}

// Page previews (Letter at 2x) for the listing photos.
const PREVIEW = { cover, glance, check: checklist[0], budget, vendors, guests: guests[0], seating, timeline, party, shots, honeymoon, payments, closing }
const shots_ = {}
await tab.setViewport({ width: 816, height: 1056, deviceScaleFactor: 2 })
for (const [k, p] of Object.entries(PREVIEW)) {
  await load(html([p], 'Letter'))
  shots_[k] = await tab.screenshot({ clip: { x: 0, y: 0, width: 816, height: 1056 }, type: 'png' })
}

// Listing photos: 2700x2025 (4:3, Etsy's recommended ratio).
const b64 = (k) => `data:image/png;base64,${shots_[k].toString('base64')}`
const photo = (inner) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:2700px;height:2025px;overflow:hidden;font-family:Inter,sans-serif;color:${INK};
background:radial-gradient(ellipse at 30% 20%,#fff 0%,${CREAM} 45%,#efe6d6 100%);position:relative}
.pg{position:absolute;width:816px;height:1056px;box-shadow:0 30px 70px rgba(42,31,21,.22),0 4px 12px rgba(42,31,21,.12);background:#fff}
.pg img{width:100%;height:100%;display:block}
.title{position:absolute;font-family:'Cormorant Garamond',serif;font-weight:500;color:${INK}}
.k{position:absolute;font-size:34px;letter-spacing:.35em;text-transform:uppercase;color:${GOLD_DK}}
.badge{position:absolute;background:${GOLD_DK};color:#fff;border-radius:999px;padding:22px 46px;font-size:38px;font-weight:600;letter-spacing:.06em}
.list{position:absolute;font-family:'Cormorant Garamond',serif;font-size:58px;line-height:1.5;color:${INK}}
.list b{color:${GOLD_DK};font-weight:600}
</style></head><body>${inner}</body></html>`
const pg = (k, x, y, s = 1, r = 0) => `<div class="pg" style="left:${x}px;top:${y}px;transform:scale(${s}) rotate(${r}deg);transform-origin:top left"><img src="${b64(k)}"></div>`

const INCLUDED = ['Cover & At-a-Glance', 'Month-by-month checklist', 'Budget tracker', 'Payment schedule', 'Vendor contacts',
  'Guest list & RSVP (3 pp)', 'Seating chart', 'Wedding party', 'Day-of timeline', 'Photo shot list', 'Honeymoon packing', 'Thank-you tracker']

const PHOTOS = {
  'vow-wedding-planner-bundle': [
    `${pg('budget', 1560, 330, 1.35, 7)}${pg('check', 1180, 250, 1.4, -4)}${pg('cover', 250, 190, 1.55, -2)}
     <div class="badge" style="left:1500px;top:1760px">17 pages · Letter + A4 · Instant download</div>`,
    `<div class="k" style="left:160px;top:170px">What's included</div>
     <div class="title" style="left:150px;top:230px;font-size:130px">The Complete<br>Wedding Planner</div>
     <div class="list" style="left:170px;top:620px">${INCLUDED.map((s) => `<b>◆</b> ${s}`).join('<br>')}</div>
     ${pg('seating', 1650, 330, 1.05, 5)}${pg('guests', 1330, 520, 1.05, -3)}`,
    `${pg('check', 120, 220, 1.5, 0)}${pg('budget', 1356, 220, 1.5, 0)}`,
    `${pg('timeline', 120, 220, 1.5, 0)}${pg('seating', 1356, 220, 1.5, 0)}`,
    `${pg('vendors', 120, 220, 1.5, 0)}${pg('guests', 1356, 220, 1.5, 0)}`,
    `<div class="k" style="left:160px;top:420px">Print at home or at any print shop</div>
     <div class="title" style="left:150px;top:490px;font-size:120px">Instant download.<br>US Letter + A4.</div>
     <div class="list" style="left:170px;top:1000px"><b>1</b> Purchase<br><b>2</b> Download your PDFs from Etsy<br><b>3</b> Print as many copies as you need</div>
     ${pg('glance', 1740, 300, 1.2, 5)}${pg('cover', 1560, 240, 1.3, -2)}`,
  ],
  'vow-checklist': [
    `${pg('check', 1500, 170, 1.6, 4)}<div class="k" style="left:160px;top:560px">Printable</div>
     <div class="title" style="left:150px;top:620px;font-size:150px">Wedding<br>Checklist</div>
     <div class="list" style="left:170px;top:1060px"><b>◆</b> 18 months to the day after<br><b>◆</b> 54 tasks on one page<br><b>◆</b> Letter + A4</div>`,
    `${pg('check', 738, 220, 1.5, 0)}`,
  ],
  'vow-budget': [
    `${pg('payments', 1720, 300, 1.35, 6)}${pg('budget', 1320, 200, 1.5, -3)}<div class="k" style="left:160px;top:560px">Printable</div>
     <div class="title" style="left:150px;top:620px;font-size:150px">Wedding<br>Budget Tracker</div>
     <div class="list" style="left:170px;top:1060px"><b>◆</b> 12 categories with typical %<br><b>◆</b> Payment schedule<br><b>◆</b> Letter + A4</div>`,
    `${pg('budget', 120, 220, 1.5, 0)}${pg('payments', 1356, 220, 1.5, 0)}`,
  ],
  'vow-guest-rsvp': [
    `${pg('seating', 1720, 300, 1.35, 6)}${pg('guests', 1320, 200, 1.5, -3)}<div class="k" style="left:160px;top:560px">Printable</div>
     <div class="title" style="left:150px;top:620px;font-size:140px">Guest List,<br>RSVP & Seating</div>
     <div class="list" style="left:170px;top:1060px"><b>◆</b> 84-guest RSVP tracker<br><b>◆</b> 12-table seating chart<br><b>◆</b> Thank-you tracker</div>`,
    `${pg('guests', 120, 220, 1.5, 0)}${pg('seating', 1356, 220, 1.5, 0)}`,
  ],
  'vow-day-of-timeline': [
    `${pg('shots', 1720, 300, 1.35, 6)}${pg('timeline', 1320, 200, 1.5, -3)}<div class="k" style="left:160px;top:560px">Printable</div>
     <div class="title" style="left:150px;top:620px;font-size:140px">Wedding Day<br>Timeline</div>
     <div class="list" style="left:170px;top:1060px"><b>◆</b> Hour-by-hour, 7 AM to midnight<br><b>◆</b> Wedding party & shot list<br><b>◆</b> Letter + A4</div>`,
    `${pg('timeline', 120, 220, 1.5, 0)}${pg('shots', 1356, 220, 1.5, 0)}`,
  ],
}

await tab.setViewport({ width: 2700, height: 2025, deviceScaleFactor: 1 })
for (const [name, list] of Object.entries(PHOTOS)) {
  for (const [i, inner] of list.entries()) {
    await load(photo(inner))
    const png = await tab.screenshot({ type: 'png' })
    const file = path.join(IMG, `${name}-${i + 1}.jpg`)
    writeFileSync(file, await sharp(png).jpeg({ quality: 88 }).toBuffer())
  }
  console.log('photos', name, list.length)
}

await browser.close()
