import type { BudgetItem, Guest, ChecklistItem } from '../types';

interface WeddingMeta {
  partner1: string;
  partner2: string;
  weddingDate: string | null;
}

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  category: string;
}

/** Escape any value before it is interpolated into exported HTML. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseStyles() {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #2a1f15; background: #fff; }
      .header { background: linear-gradient(135deg, #1a1510 0%, #2e2218 100%); color: #fff; padding: 32px 40px; }
      .header-title { font-size: 28px; font-weight: bold; letter-spacing: 0.5px; }
      .header-subtitle { color: #c9a96e; font-size: 14px; margin-top: 4px; }
      .header-meta { color: #9a8a7a; font-size: 12px; margin-top: 8px; }
      .header-logo { font-size: 11px; color: #c9a96e; margin-top: 12px; letter-spacing: 2px; text-transform: uppercase; }
      .content { padding: 32px 40px; }
      .section-title { font-size: 14px; font-weight: bold; color: #c9a96e; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e8e0d5; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
      th { background: #f5f0ea; text-align: left; padding: 8px 10px; font-size: 11px; color: #6a5a4a; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 8px 10px; border-bottom: 1px solid #f0ebe3; vertical-align: top; }
      tr:last-child td { border-bottom: none; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: bold; }
      .badge-confirmed { background: #d1fae5; color: #065f46; }
      .badge-declined { background: #fee2e2; color: #991b1b; }
      .badge-pending { background: #fef3c7; color: #92400e; }
      .badge-paid { background: #d1fae5; color: #065f46; }
      .badge-unpaid { background: #f5f0ea; color: #6a5a4a; }
      .check { color: #059669; font-weight: bold; }
      .circle { color: #9a8a7a; }
      .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
      .summary-card { background: #f5f0ea; padding: 12px 16px; border-radius: 8px; }
      .summary-label { font-size: 10px; color: #9a8a7a; text-transform: uppercase; letter-spacing: 0.5px; }
      .summary-value { font-size: 18px; font-weight: bold; color: #2a1f15; margin-top: 2px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  `;
}

function header(title: string, meta: WeddingMeta) {
  const dateStr = meta.weddingDate
    ? new Date(meta.weddingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  return `
    <div class="header">
      <div class="header-title">${esc(meta.partner1)} &amp; ${esc(meta.partner2)}</div>
      ${dateStr ? `<div class="header-subtitle">${esc(dateStr)}</div>` : ''}
      <div class="header-meta">${esc(title)}</div>
      <div class="header-logo">Vow Wedding Planner</div>
    </div>
  `;
}

function openWindow(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Also attempt to auto-print after a short delay
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      setTimeout(() => win.print(), 500);
    });
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  void filename;
}

function fmt(n: number | null | undefined) {
  return `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function exportBudgetPDF(items: BudgetItem[], meta: WeddingMeta, totalBudget: number) {
  const totalEstimated = items.reduce((s, i) => s + (i.estimated_cost ?? 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actual_cost ?? 0), 0);

  const categories = [...new Set(items.map(i => i.category))].sort();

  const categorySections = categories.map(cat => {
    const catItems = items.filter(i => i.category === cat);
    const rows = catItems.map(i => `
      <tr>
        <td>${esc(i.item_name)}</td>
        <td>${fmt(i.estimated_cost)}</td>
        <td>${fmt(i.actual_cost)}</td>
        <td>${fmt(i.deposit_paid)}</td>
        <td>${i.paid ? '<span class="badge badge-paid">Paid</span>' : '<span class="badge badge-unpaid">Pending</span>'}</td>
      </tr>
    `).join('');
    return `
      <div class="section-title">${esc(cat)}</div>
      <table>
        <thead><tr><th>Item</th><th>Estimated</th><th>Actual</th><th>Deposit</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Budget Tracker</title>${baseStyles()}</head><body>
    ${header('Budget Tracker', meta)}
    <div class="content">
      <div class="summary-grid">
        <div class="summary-card"><div class="summary-label">Total Budget</div><div class="summary-value">${fmt(totalBudget)}</div></div>
        <div class="summary-card"><div class="summary-label">Total Estimated</div><div class="summary-value">${fmt(totalEstimated)}</div></div>
        <div class="summary-card"><div class="summary-label">Total Actual</div><div class="summary-value">${fmt(totalActual)}</div></div>
      </div>
      ${categorySections}
    </div>
  </body></html>`;

  openWindow(html, 'budget-tracker.html');
}

export function exportGuestListPDF(guests: Guest[], meta: WeddingMeta) {
  const sorted = [...guests].sort((a, b) => a.last_name.localeCompare(b.last_name));

  const rows = sorted.map(g => `
    <tr>
      <td>${esc(g.last_name)}, ${esc(g.first_name)}</td>
      <td>${esc(g.email || '—')}</td>
      <td>${esc(g.group_name || '—')}</td>
      <td><span class="badge badge-${esc(g.rsvp_status)}">${esc(g.rsvp_status.charAt(0).toUpperCase() + g.rsvp_status.slice(1))}</span></td>
      <td>${esc(g.meal_choice || '—')}</td>
      <td>${esc(g.has_plus_one ? (g.plus_one_name || 'Yes') : '—')}</td>
    </tr>
  `).join('');

  const confirmed = guests.filter(g => g.rsvp_status === 'confirmed').length;
  const pending = guests.filter(g => g.rsvp_status === 'pending').length;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Guest List</title>${baseStyles()}</head><body>
    ${header('Guest List', meta)}
    <div class="content">
      <div class="summary-grid">
        <div class="summary-card"><div class="summary-label">Total Guests</div><div class="summary-value">${guests.length}</div></div>
        <div class="summary-card"><div class="summary-label">Confirmed</div><div class="summary-value">${confirmed}</div></div>
        <div class="summary-card"><div class="summary-label">Pending</div><div class="summary-value">${pending}</div></div>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Group</th><th>RSVP</th><th>Meal</th><th>Plus One</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </body></html>`;

  openWindow(html, 'guest-list.html');
}

export function exportChecklistPDF(items: ChecklistItem[], meta: WeddingMeta) {
  const timeframes = ['18+ Months', '12 Months', '9 Months', '6 Months', '3 Months', '1 Month', '2 Weeks', '1 Week', 'Day Before', 'Wedding Day'];
  const done = items.filter(i => i.completed).length;

  const sections = timeframes.map(tf => {
    const tfItems = items.filter(i => i.timeframe === tf);
    if (tfItems.length === 0) return '';
    const rows = tfItems.map(i => `
      <tr>
        <td style="width:24px;text-align:center">${i.completed ? '<span class="check">✓</span>' : '<span class="circle">○</span>'}</td>
        <td>${esc(i.task)}</td>
        <td style="color:#9a8a7a">${esc(i.category)}</td>
      </tr>
    `).join('');
    return `
      <div class="section-title">${esc(tf)}</div>
      <table><tbody>${rows}</tbody></table>
    `;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Master Checklist</title>${baseStyles()}</head><body>
    ${header('Master Checklist', meta)}
    <div class="content">
      <div class="summary-grid">
        <div class="summary-card"><div class="summary-label">Total Tasks</div><div class="summary-value">${items.length}</div></div>
        <div class="summary-card"><div class="summary-label">Completed</div><div class="summary-value">${done}</div></div>
        <div class="summary-card"><div class="summary-label">Remaining</div><div class="summary-value">${items.length - done}</div></div>
      </div>
      ${sections}
    </div>
  </body></html>`;

  openWindow(html, 'checklist.html');
}

export function exportTimelinePDF(events: TimelineEvent[], meta: WeddingMeta) {
  const sorted = [...events].sort((a, b) => a.time.localeCompare(b.time));

  const rows = sorted.map(e => `
    <tr>
      <td style="font-weight:bold;white-space:nowrap">${esc(e.time)}</td>
      <td>${esc(e.title)}</td>
      <td>${esc(e.description || '—')}</td>
      <td style="color:#9a8a7a">${esc(e.category)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Wedding Day Timeline</title>${baseStyles()}</head><body>
    ${header('Wedding Day Timeline', meta)}
    <div class="content">
      <table>
        <thead><tr><th>Time</th><th>Event</th><th>Details</th><th>Category</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </body></html>`;

  openWindow(html, 'timeline.html');
}
