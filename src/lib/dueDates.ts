import type { ChecklistItem, WeddingProfile } from '../types';

/** Map a timeframe label to months before the wedding date */
const PHASE_MONTHS_OFFSET: Record<string, number> = {
  '18+ Months': 18,
  '12 Months': 12,
  '9 Months': 9,
  '6 Months': 6,
  '3 Months': 3,
  '1 Month': 1,
  '2 Weeks': 0.5,
  '1 Week': 7 / 30,
  'Day Before': 1 / 30,
  'Wedding Day': 0,
  'After the Big Day': -1,
};

/** Compute a due_date for a checklist item from its timeframe and the wedding date */
export function computeDueDate(timeframe: string, weddingDate: string): string | null {
  if (!weddingDate) return null;
  const offsetMonths = PHASE_MONTHS_OFFSET[timeframe];
  if (offsetMonths === undefined) return null;

  const d = new Date(`${weddingDate}T00:00:00`);
  d.setMonth(d.getMonth() - Math.floor(offsetMonths));
  // Handle fractional months (weeks/days)
  const fracPart = offsetMonths - Math.floor(offsetMonths);
  if (fracPart > 0) {
    d.setDate(d.getDate() - Math.round(fracPart * 30));
  }
  return d.toISOString().slice(0, 10);
}

/** Get the status of a task based on its due date */
export type TaskStatus = 'overdue' | 'due_this_week' | 'due_this_month' | 'upcoming' | 'done' | 'no_date';

export function getTaskStatus(item: ChecklistItem, createdAt?: string): TaskStatus {
  if (item.completed) return 'done';
  if (!item.due_date) return 'no_date';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${item.due_date}T00:00:00`);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // A task can only be overdue if its due date is on or after the wedding profile
  // was created — otherwise the user never had a chance to complete it.
  if (diffDays < 0) {
    if (createdAt) {
      const created = new Date(`${createdAt.slice(0, 10)}T00:00:00`);
      if (due.getTime() < created.getTime()) return 'due_this_week';
    }
    return 'overdue';
  }
  if (diffDays <= 7) return 'due_this_week';
  if (diffDays <= 30) return 'due_this_month';
  return 'upcoming';
}

/**
 * Compute due dates for seeded checklist tasks, staggering any phases whose
 * computed due date is already in the past (relative to the profile creation
 * date) across a catch-up window starting today. This prevents brand-new
 * accounts from seeing a wall of red "Overdue" tasks they never had a chance
 * to complete.
 */
export function seedDueDates(
  tasks: { timeframe: string; task: string; category: string }[],
  weddingDate: string,
  createdAt: string,
): { timeframe: string; task: string; category: string; due_date: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const createdDate = new Date(`${createdAt.slice(0, 10)}T00:00:00`);
  const phaseOrder = Object.keys(PHASE_MONTHS_OFFSET);

  // Separate tasks into past-phase and future-phase
  const pastTasks: { timeframe: string; task: string; category: string }[] = [];
  const futureTasks: { timeframe: string; task: string; category: string; due_date: string }[] = [];

  for (const task of tasks) {
    const computed = computeDueDate(task.timeframe, weddingDate);
    if (computed) {
      const due = new Date(`${computed}T00:00:00`);
      if (due.getTime() < createdDate.getTime()) {
        pastTasks.push(task);
      } else {
        futureTasks.push({ ...task, due_date: computed });
      }
    } else {
      futureTasks.push({ ...task, due_date: '' });
    }
  }

  // Sort past tasks by phase order (earliest phases first)
  pastTasks.sort((a, b) => {
    const ia = phaseOrder.indexOf(a.timeframe);
    const ib = phaseOrder.indexOf(b.timeframe);
    return ia - ib;
  });

  // Spread past-phase tasks across the next 2 weeks, earliest phases first
  const catchUpDays = 14;
  const stagger = pastTasks.length > catchUpDays
    ? Math.ceil(catchUpDays / pastTasks.length)
    : 1;

  const staggered = pastTasks.map((task, i) => {
    const due = new Date(today);
    due.setDate(due.getDate() + Math.min(i * stagger, catchUpDays));
    return { ...task, due_date: due.toISOString().slice(0, 10) };
  });

  return [...staggered, ...futureTasks];
}

/** Assignee display helper */
export function formatAssignee(item: ChecklistItem, profile?: WeddingProfile | null): string {
  if (item.assignee_name) return item.assignee_name;
  switch (item.assignee) {
    case 'partner_1': return profile?.partner1_name || 'Partner 1';
    case 'partner_2': return profile?.partner2_name || 'Partner 2';
    case 'planner': return 'Planner';
    case 'other': return 'Other';
    default: return '';
  }
}

/** Assignee avatar color helper */
export function assigneeColor(assignee: string): string {
  switch (assignee) {
    case 'partner_1': return '#c9a96e';
    case 'partner_2': return '#e88c8c';
    case 'planner': return '#7ba896';
    case 'other': return '#a89bb5';
    default: return '#c9a96e';
  }
}

/** Backfill due_date for existing checklist items that don't have one yet */
export function backfillDueDates(items: ChecklistItem[], weddingDate: string): ChecklistItem[] {
  if (!weddingDate) return items;
  return items.map(item => {
    if (item.due_date || item.overridden) return item;
    const computed = computeDueDate(item.timeframe, weddingDate);
    return computed ? { ...item, due_date: computed } : item;
  });
}
