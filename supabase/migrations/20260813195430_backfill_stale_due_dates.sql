/*
# Backfill stale checklist due dates on pre-existing accounts

## Purpose
Accounts created before the overdue-fix patch have checklist_items with
due_date values computed from phase offsets relative to the wedding date.
For users who signed up less than 18 months before their wedding, several
phases had computed due dates in the past — before the account even existed.
The display logic now correctly avoids showing these as "Overdue", but the
stored dates still read as e.g. "Jan 14, 2026" next to an amber "This week"
badge, which is self-contradictory.

This one-time migration repairs those rows by redistributing stale due dates
across a 2-week catch-up window starting from the profile's created_at date,
using the same logic as the `seedDueDates` function used when seeding new
profiles.

## Safety constraints
- ONLY touches rows where due_date < the owning profile's created_at (cast to date).
- SKIPS completed tasks (completed = true).
- SKIPS custom/user-created tasks (category = 'Custom').
- SKIPS tasks where the user manually overrode the due date (overridden = true).
- Does NOT delete any rows.
- Does NOT change completion state.
- IDEMPOTENT: after running, the updated due_dates will be >= created_at,
  so the WHERE clause no longer matches them on a second run.
*/

WITH eligible AS (
  SELECT
    c.id,
    c.wedding_id,
    c.due_date,
    p.created_at::date AS base_date,
    ROW_NUMBER() OVER (
      PARTITION BY c.wedding_id
      ORDER BY
        CASE
          WHEN c.timeframe = '18+ Months' THEN 0
          WHEN c.timeframe = '12 Months' THEN 1
          WHEN c.timeframe = '9 Months' THEN 2
          WHEN c.timeframe = '6 Months' THEN 3
          WHEN c.timeframe = '3 Months' THEN 4
          WHEN c.timeframe = '1 Month' THEN 5
          WHEN c.timeframe = '2 Weeks' THEN 6
          WHEN c.timeframe = '1 Week' THEN 7
          WHEN c.timeframe = 'Day Before' THEN 8
          WHEN c.timeframe = 'Wedding Day' THEN 9
          WHEN c.timeframe = 'After the Big Day' THEN 10
          ELSE 99
        END,
        c.task
    ) AS rn,
    COUNT(*) OVER (PARTITION BY c.wedding_id) AS total
  FROM checklist_items c
  JOIN wedding_profile p ON p.id = c.wedding_id
  WHERE c.due_date IS NOT NULL
    AND c.due_date < p.created_at::date
    AND c.completed = false
    AND c.category <> 'Custom'
    AND COALESCE(c.overridden, false) = false
),
computed AS (
  SELECT
    id,
    base_date,
    base_date + LEAST(
      (rn - 1) * GREATEST(1, LEAST(14, 14 / total)),
      14
    )::int AS new_due_date
  FROM eligible
)
UPDATE checklist_items
SET due_date = computed.new_due_date
FROM computed
WHERE checklist_items.id = computed.id
  AND checklist_items.due_date < computed.base_date
  AND checklist_items.completed = false;