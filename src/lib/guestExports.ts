import type { Guest } from '../types';

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  // Neutralize spreadsheet formulas so exported guest text cannot execute on open.
  let safe = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/** Export address labels / envelope CSV for mailing invitations */
export function exportAddressLabels(guests: Guest[], partner1: string, partner2: string) {
  const headers = ['Full Name', 'Address', 'City', 'State', 'Zip', 'Country', 'Group', 'Side', 'Invite Sent'];
  const rows = guests.map(g => [
    `${g.first_name} ${g.last_name}`.trim(),
    g.address || '',
    '', '', '', '',
    g.group_name || '',
    g.side || '',
    g.invite_sent ? 'Yes' : 'No',
  ].map(escapeCsv).join(','));

  downloadCsv(`address-labels-${partner1}-${partner2}.csv`, [headers.join(','), ...rows].join('\n'));
}

/** Export caterer headcount sheet broken down by meal and age group */
export function exportCatererHeadcount(guests: Guest[]) {
  const confirmed = guests.filter(g => g.rsvp_status === 'confirmed');
  const mealGroups: Record<string, { adult: number; child: number; infant: number }> = {};

  confirmed.forEach(g => {
    const meal = g.meal_choice || 'No preference';
    const age = g.age_group || 'adult';
    if (!mealGroups[meal]) mealGroups[meal] = { adult: 0, child: 0, infant: 0 };
    mealGroups[meal][age as 'adult' | 'child' | 'infant']++;
  });

  const plusOnes = guests.filter(g => g.has_plus_one && g.plus_one_rsvp === 'confirmed').length;

  const lines: string[] = [];
  lines.push('Caterer Headcount Sheet');
  lines.push('');
  lines.push(`Total confirmed guests,${confirmed.length}`);
  lines.push(`Plus-ones attending,${plusOnes}`);
  lines.push(`Total headcount,${confirmed.length + plusOnes}`);
  lines.push('');
  lines.push('Meal,Adults,Children,Infants,Subtotal');
  Object.entries(mealGroups).forEach(([meal, counts]) => {
    const subtotal = counts.adult + counts.child + counts.infant;
    lines.push(`${escapeCsv(meal)},${counts.adult},${counts.child},${counts.infant},${subtotal}`);
  });

  // Dietary restrictions
  const dietary = confirmed.filter(g => g.dietary_restrictions);
  if (dietary.length > 0) {
    lines.push('');
    lines.push('Dietary Restrictions & Allergies');
    lines.push('Name,Restrictions');
    dietary.forEach(g => {
      lines.push(`${escapeCsv(`${g.first_name} ${g.last_name}`.trim())},${escapeCsv(g.dietary_restrictions)}`);
    });
  }

  downloadCsv('caterer-headcount.csv', lines.join('\n'));
}

/** Full data export (JSON + CSV) */
export function exportFullGuestData(guests: Guest[]) {
  const jsonBlob = new Blob([JSON.stringify(guests, null, 2)], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const jsonA = document.createElement('a');
  jsonA.href = jsonUrl;
  jsonA.download = 'guest-list-full.json';
  jsonA.click();
  URL.revokeObjectURL(jsonUrl);

  const headers = Object.keys(guests[0] || { id: '' }).filter(k => k !== 'wedding_id');
  const rows = guests.map(g => headers.map(h => escapeCsv(String(g[h as keyof Guest] ?? ''))).join(','));
  downloadCsv('guest-list-full.csv', [headers.join(','), ...rows].join('\n'));
}
