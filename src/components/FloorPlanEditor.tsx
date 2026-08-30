import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import type { Guest, Household, SeatingTable, SeatingObject, SeatingRule, TableShape, ObjectType, WeddingProfile } from '../types';

// ===== Types =====

interface HistoryState {
  tables: SeatingTable[];
  objects: SeatingObject[];
  assignments: Record<string, { tableId: string; seat: number }>;
}

interface Props {
  weddingId: string;
  guests: Guest[];
  households: Household[];
  onUpdateGuests: (guests: Guest[]) => void;
  profile: WeddingProfile | null;
}

const GRID_SIZE = 20;
const PAGE_WIDTH = 1100;
const PAGE_HEIGHT = 850;

const MEAL_COLORS: Record<string, string> = {
  Chicken: '#f59e0b',
  Beef: '#dc2626',
  Fish: '#0ea5e9',
  Vegetarian: '#16a34a',
  Vegan: '#22c55e',
};

void 0;

const SHAPE_DEFAULTS: Record<TableShape, { width: number; height: number; capacity: number }> = {
  round: { width: 120, height: 120, capacity: 8 },
  rectangle: { width: 180, height: 80, capacity: 8 },
  head: { width: 300, height: 80, capacity: 12 },
  sweetheart: { width: 100, height: 60, capacity: 2 },
};

let idCounter = 0;
function tempId() { return `temp-${Date.now()}-${idCounter++}`; }

/** Escape any value before it is interpolated into exported HTML or SVG. */
function escHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== Seat position calculation =====

function getSeatPositions(table: SeatingTable): { x: number; y: number }[] {
  const seats: { x: number; y: number }[] = [];
  const { width, height, shape, capacity } = table;
  const cx = width / 2;
  const cy = height / 2;

  if (shape === 'round') {
    const r = width / 2 + 18;
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2;
      seats.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  } else if (shape === 'sweetheart') {
    const r = width / 2 + 16;
    for (let i = 0; i < capacity; i++) {
      const angle = Math.PI + (i / capacity) * Math.PI;
      seats.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  } else {
    const halfH = height / 2 + 16;
    const perSide = Math.ceil(capacity / 2);
    for (let i = 0; i < perSide; i++) {
      const x = width * (i + 0.5) / perSide;
      seats.push({ x, y: -halfH + cy });
      if (seats.length < capacity) seats.push({ x, y: halfH + cy });
    }
  }
  return seats;
}

// ===== Component =====

export default function FloorPlanEditor({ weddingId, guests, households, onUpdateGuests: _onUpdateGuests, profile }: Props) {
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [objects, setObjects] = useState<SeatingObject[]>([]);
  const [rules, setRules] = useState<SeatingRule[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { tableId: string; seat: number }>>({});
  const [loading, setLoading] = useState(true);

  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'table' | 'object' | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, px: 0, py: 0 });
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  // Undo/redo
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  // UI panels
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);
  const [dragGuestId, setDragGuestId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [autoArrangePreview, setAutoArrangePreview] = useState<Record<string, { tableId: string; seat: number }> | null>(null);
  const [toast, setToast] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);

  // ===== Load data =====

  useEffect(() => {
    if (!weddingId) return;
    loadAll();
  }, [weddingId]);

  async function loadAll() {
    setLoading(true);
    const [tablesRes, objectsRes, rulesRes] = await Promise.all([
      supabase.from('seating_tables').select('*').eq('wedding_id', weddingId),
      supabase.from('seating_objects').select('*').eq('wedding_id', weddingId),
      supabase.from('seating_rules').select('*').eq('wedding_id', weddingId),
    ]);
    setTables((tablesRes.data || []) as SeatingTable[]);
    setObjects((objectsRes.data || []) as SeatingObject[]);
    setRules((rulesRes.data || []) as SeatingRule[]);

    // Build assignments from guests' table_number + seat_number
    const assign: Record<string, { tableId: string; seat: number }> = {};
    guests.forEach(g => {
      if (g.table_number != null && g.seat_number != null) {
        const table = (tablesRes.data || []).find((t: SeatingTable) => t.table_number === g.table_number);
        if (table) assign[g.id] = { tableId: table.id, seat: g.seat_number };
      }
    });
    setAssignments(assign);
    setLoading(false);
  }

  // ===== Persistence helpers =====

  async function persistTable(t: SeatingTable) {
    if (t.id.startsWith('temp-')) {
      const { id, ...rest } = t;
      void id;
      const { data, error } = await supabase.from('seating_tables').insert({ ...rest, wedding_id: weddingId }).select().single();
      if (error) { showToast('Failed to save table', 'error'); return; }
      if (data) setTables(prev => prev.map(x => x.id === t.id ? data : x));
    } else {
      const { error } = await supabase.from('seating_tables').update({
        label: t.label, shape: t.shape, capacity: t.capacity, x: t.x, y: t.y,
        rotation: t.rotation, width: t.width, height: t.height, table_number: t.table_number,
      }).eq('id', t.id);
      if (error) showToast('Failed to update table', 'error');
    }
  }

  async function persistObject(o: SeatingObject) {
    if (o.id.startsWith('temp-')) {
      const { id, ...rest } = o;
      void id;
      const { data, error } = await supabase.from('seating_objects').insert({ ...rest, wedding_id: weddingId }).select().single();
      if (error) { showToast('Failed to save object', 'error'); return; }
      if (data) setObjects(prev => prev.map(x => x.id === o.id ? data : x));
    } else {
      const { error } = await supabase.from('seating_objects').update({
        label: o.label, object_type: o.object_type, x: o.x, y: o.y,
        rotation: o.rotation, width: o.width, height: o.height,
      }).eq('id', o.id);
      if (error) showToast('Failed to update object', 'error');
    }
  }

  async function deleteTableFromDB(id: string) {
    if (!id.startsWith('temp-')) {
      const { error } = await supabase.from('seating_tables').delete().eq('id', id);
      if (error) showToast('Failed to delete table', 'error');
    }
  }

  async function deleteObjectFromDB(id: string) {
    if (!id.startsWith('temp-')) {
      const { error } = await supabase.from('seating_objects').delete().eq('id', id);
      if (error) showToast('Failed to delete object', 'error');
    }
  }

  async function persistAssignment(guestId: string, tableId: string | null, seat: number | null) {
    const table = tableId ? tables.find(t => t.id === tableId) : null;
    const tableNumber = table ? table.table_number : null;
    const { error } = await supabase.from('guests').update({
      table_number: tableNumber,
      seat_number: seat,
    }).eq('id', guestId);
    if (error) showToast('Failed to assign guest', 'error');
  }

  // ===== Undo/Redo =====

  function snapshot(): HistoryState {
    return {
      tables: tables.map(t => ({ ...t })),
      objects: objects.map(o => ({ ...o })),
      assignments: { ...assignments },
    };
  }

  function pushUndo() {
    setUndoStack(prev => [...prev.slice(-30), snapshot()]);
    setRedoStack([]);
  }

  function undo() {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const state = prev[prev.length - 1];
      setRedoStack(r => [...r, snapshot()]);
      // Sync to DB: delete tables/objects that exist now but not in the snapshot
      tables.forEach(t => {
        if (!state.tables.find(st => st.id === t.id)) deleteTableFromDB(t.id);
      });
      objects.forEach(o => {
        if (!state.objects.find(so => so.id === o.id)) deleteObjectFromDB(o.id);
      });
      // Re-insert tables/objects that exist in snapshot but not now
      state.tables.forEach(t => {
        if (!tables.find(ct => ct.id === t.id)) persistTable(t);
      });
      state.objects.forEach(o => {
        if (!objects.find(co => co.id === o.id)) persistObject(o);
      });
      // Update all remaining tables/objects to match snapshot state
      state.tables.forEach(t => {
        if (tables.find(ct => ct.id === t.id)) persistTable(t);
      });
      state.objects.forEach(o => {
        if (objects.find(co => co.id === o.id)) persistObject(o);
      });
      setTables(state.tables);
      setObjects(state.objects);
      setAssignments(state.assignments);
      return prev.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const state = prev[prev.length - 1];
      setUndoStack(u => [...u, snapshot()]);
      // Same DB sync as undo
      tables.forEach(t => {
        if (!state.tables.find(st => st.id === t.id)) deleteTableFromDB(t.id);
      });
      objects.forEach(o => {
        if (!state.objects.find(so => so.id === o.id)) deleteObjectFromDB(o.id);
      });
      state.tables.forEach(t => {
        if (!tables.find(ct => ct.id === t.id)) persistTable(t);
      });
      state.objects.forEach(o => {
        if (!objects.find(co => co.id === o.id)) persistObject(o);
      });
      state.tables.forEach(t => {
        if (tables.find(ct => ct.id === t.id)) persistTable(t);
      });
      state.objects.forEach(o => {
        if (objects.find(co => co.id === o.id)) persistObject(o);
      });
      setTables(state.tables);
      setObjects(state.objects);
      setAssignments(state.assignments);
      return prev.slice(0, -1);
    });
  }

  // ===== Conflict detection =====

  function checkConflicts(newAssignments: Record<string, { tableId: string; seat: number }>): string[] {
    const warnings: string[] = [];
    for (const rule of rules) {
      if (rule.scope === 'guest' && rule.guest_a_id && rule.guest_b_id) {
        const a = newAssignments[rule.guest_a_id];
        const b = newAssignments[rule.guest_b_id];
        if (a && b) {
          if (rule.rule_type === 'together' && a.tableId !== b.tableId) {
            const ga = guests.find(g => g.id === rule.guest_a_id);
            const gb = guests.find(g => g.id === rule.guest_b_id);
            warnings.push(`${ga?.first_name} ${ga?.last_name} and ${gb?.first_name} ${gb?.last_name} should be seated together but are at different tables`);
          }
          if (rule.rule_type === 'apart' && a.tableId === b.tableId) {
            const ga = guests.find(g => g.id === rule.guest_a_id);
            const gb = guests.find(g => g.id === rule.guest_b_id);
            warnings.push(`${ga?.first_name} ${ga?.last_name} and ${gb?.first_name} ${gb?.last_name} are seated at the same table but should be kept apart`);
          }
        }
      }
      if (rule.scope === 'household' && rule.household_a_id && rule.household_b_id) {
        const aGuests = guests.filter(g => g.household_id === rule.household_a_id && newAssignments[g.id]);
        const bGuests = guests.filter(g => g.household_id === rule.household_b_id && newAssignments[g.id]);
        if (aGuests.length > 0 && bGuests.length > 0) {
          const aTables = new Set(aGuests.map(g => newAssignments[g.id]!.tableId));
          const bTables = new Set(bGuests.map(g => newAssignments[g.id]!.tableId));
          const ha = households.find(h => h.id === rule.household_a_id);
          const hb = households.find(h => h.id === rule.household_b_id);
          if (rule.rule_type === 'together') {
            const shared = [...aTables].filter(t => bTables.has(t));
            if (shared.length === 0 && aTables.size > 0 && bTables.size > 0) {
              warnings.push(`Households "${ha?.name}" and "${hb?.name}" should be seated together but are at different tables`);
            }
          }
          if (rule.rule_type === 'apart') {
            const shared = [...aTables].filter(t => bTables.has(t));
            if (shared.length > 0) {
              warnings.push(`Households "${ha?.name}" and "${hb?.name}" are at the same table but should be kept apart`);
            }
          }
        }
      }
    }
    return warnings;
  }

  useEffect(() => {
    setConflictWarnings(checkConflicts(assignments));
  }, [assignments, rules, guests, households]);

  // ===== Add objects =====

  function addTable(shape: TableShape) {
    pushUndo();
    const defaults = SHAPE_DEFAULTS[shape];
    const validNumbers = tables.map(t => t.table_number).filter(n => typeof n === 'number' && !isNaN(n));
    const maxTableNum = validNumbers.length > 0 ? Math.max(...validNumbers) : 0;
    const newTable: SeatingTable = {
      id: tempId(),
      wedding_id: weddingId,
      label: shape === 'head' ? 'Head Table' : shape === 'sweetheart' ? 'Sweetheart Table' : `Table ${maxTableNum + 1}`,
      shape,
      capacity: defaults.capacity,
      x: 200 + (tables.length % 4) * 180,
      y: 200 + Math.floor(tables.length / 4) * 180,
      rotation: 0,
      width: defaults.width,
      height: defaults.height,
      table_number: maxTableNum + 1,
    };
    setTables(prev => [...prev, newTable]);
    persistTable(newTable);
    setShowAddMenu(false);
    setSelectedId(newTable.id);
    setSelectedType('table');
  }

  function addObject(objectType: ObjectType) {
    pushUndo();
    const labels: Record<ObjectType, string> = {
      dance_floor: 'Dance Floor', bar: 'Bar', stage: 'Stage',
      cake_table: 'Cake Table', dj: 'DJ Booth', other: 'Object',
    };
    const sizes: Record<ObjectType, { w: number; h: number }> = {
      dance_floor: { w: 280, h: 200 },
      bar: { w: 200, h: 60 },
      stage: { w: 240, h: 80 },
      cake_table: { w: 100, h: 100 },
      dj: { w: 120, h: 80 },
      other: { w: 150, h: 100 },
    };
    const sz = sizes[objectType];
    const newObj: SeatingObject = {
      id: tempId(),
      wedding_id: weddingId,
      label: labels[objectType],
      object_type: objectType,
      x: 300 + (objects.length % 3) * 250,
      y: 400 + Math.floor(objects.length / 3) * 150,
      rotation: 0,
      width: sz.w,
      height: sz.h,
    };
    setObjects(prev => [...prev, newObj]);
    persistObject(newObj);
    setShowAddMenu(false);
    setSelectedId(newObj.id);
    setSelectedType('object');
  }

  function duplicateSelected() {
    if (!selectedId || selectedType === null) return;
    pushUndo();
    if (selectedType === 'table') {
      const t = tables.find(t => t.id === selectedId);
      if (!t) return;
      const validNumbers = tables.map(tt => tt.table_number).filter(n => typeof n === 'number' && !isNaN(n));
      const maxTableNum = validNumbers.length > 0 ? Math.max(...validNumbers) : 0;
      const copy: SeatingTable = {
        ...t, id: tempId(), x: t.x + 40, y: t.y + 40,
        table_number: maxTableNum + 1,
        label: t.shape === 'head' || t.shape === 'sweetheart' ? t.label : `Table ${maxTableNum + 1}`,
      };
      setTables(prev => [...prev, copy]);
      persistTable(copy);
      setSelectedId(copy.id);
    } else {
      const o = objects.find(o => o.id === selectedId);
      if (!o) return;
      const copy: SeatingObject = { ...o, id: tempId(), x: o.x + 40, y: o.y + 40 };
      setObjects(prev => [...prev, copy]);
      persistObject(copy);
      setSelectedId(copy.id);
    }
  }

  async function deleteSelected() {
    if (!selectedId || selectedType === null) return;
    pushUndo();
    if (selectedType === 'table') {
      const newAssign = { ...assignments };
      for (const [gid, a] of Object.entries(newAssign)) {
        if (a.tableId === selectedId) {
          delete newAssign[gid];
          persistAssignment(gid, null, null);
        }
      }
      setAssignments(newAssign);
      setTables(prev => prev.filter(t => t.id !== selectedId));
      await deleteTableFromDB(selectedId);
    } else {
      setObjects(prev => prev.filter(o => o.id !== selectedId));
      await deleteObjectFromDB(selectedId);
    }
    setSelectedId(null);
    setSelectedType(null);
  }

  // ===== Drag canvas objects =====

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg === 'true') {
      setSelectedId(null);
      setSelectedType(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
    }
  }

  function onTableMouseDown(e: React.MouseEvent, t: SeatingTable) {
    e.stopPropagation();
    setSelectedId(t.id);
    setSelectedType('table');
    setDraggingId(t.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = (e.clientX - rect.left - pan.x) / zoom - t.x;
      const cy = (e.clientY - rect.top - pan.y) / zoom - t.y;
      setDragOffset({ x: cx, y: cy });
    }
  }

  function onObjectMouseDown(e: React.MouseEvent, o: SeatingObject) {
    e.stopPropagation();
    setSelectedId(o.id);
    setSelectedType('object');
    setDraggingId(o.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = (e.clientX - rect.left - pan.x) / zoom - o.x;
      const cy = (e.clientY - rect.top - pan.y) / zoom - o.y;
      setDragOffset({ x: cx, y: cy });
    }
  }

  function onGlobalMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setPan({ x: panStart.px + (e.clientX - panStart.x), y: panStart.py + (e.clientY - panStart.y) });
      return;
    }
    if (!draggingId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = (e.clientX - rect.left - pan.x) / zoom;
    const worldY = (e.clientY - rect.top - pan.y) / zoom;
    const snappedX = Math.round((worldX - dragOffset.x) / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round((worldY - dragOffset.y) / GRID_SIZE) * GRID_SIZE;

    if (selectedType === 'table') {
      setTables(prev => prev.map(t => t.id === draggingId ? { ...t, x: snappedX, y: snappedY } : t));
    } else if (selectedType === 'object') {
      setObjects(prev => prev.map(o => o.id === draggingId ? { ...o, x: snappedX, y: snappedY } : o));
    }
  }

  function onGlobalMouseUp() {
    if (draggingId && selectedType === 'table') {
      const t = tables.find(t => t.id === draggingId);
      if (t) persistTable(t);
    }
    if (draggingId && selectedType === 'object') {
      const o = objects.find(o => o.id === draggingId);
      if (o) persistObject(o);
    }
    setDraggingId(null);
    setIsPanning(false);
    setRotatingId(null);
  }

  // ===== Rotation =====

  function onRotateMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setRotatingId(id);
  }

  function onRotateMouseMove(e: React.MouseEvent) {
    if (!rotatingId || !selectedId) return;
    const obj = selectedType === 'table' ? tables.find(t => t.id === selectedId) : objects.find(o => o.id === selectedId);
    if (!obj) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (obj.x + obj.width / 2) * zoom + pan.x + rect.left;
    const cy = (obj.y + obj.height / 2) * zoom + pan.y + rect.top;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    const snapped = Math.round(angle / 15) * 15;
    if (selectedType === 'table') {
      setTables(prev => prev.map(t => t.id === rotatingId ? { ...t, rotation: snapped } : t));
    } else {
      setObjects(prev => prev.map(o => o.id === rotatingId ? { ...o, rotation: snapped } : o));
    }
  }

  useEffect(() => {
    function handleRotate(e: MouseEvent) { if (rotatingId) onRotateMouseMove(e as unknown as React.MouseEvent); }
    function handleUp() { onGlobalMouseUp(); }
    function handleMove(e: MouseEvent) {
      if (isPanning || draggingId) onGlobalMouseMove(e as unknown as React.MouseEvent);
      if (rotatingId) handleRotate(e);
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  });

  // ===== Zoom =====

  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      setZoom(z => Math.max(0.2, Math.min(3, z + delta)));
    }
  }

  function zoomIn() { setZoom(z => Math.min(3, z + 0.15)); }
  function zoomOut() { setZoom(z => Math.max(0.2, z - 0.15)); }
  function fitToScreen() {
    if (tables.length === 0 && objects.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const validTables = tables.filter(t => isFinite(t.x) && isFinite(t.y) && isFinite(t.width) && isFinite(t.height) && t.width > 0 && t.height > 0);
    const validObjects = objects.filter(o => isFinite(o.x) && isFinite(o.y) && isFinite(o.width) && isFinite(o.height) && o.width > 0 && o.height > 0);
    if (validTables.length === 0 && validObjects.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const allX = [...validTables.map(t => t.x), ...validObjects.map(o => o.x), ...validTables.map(t => t.x + t.width), ...validObjects.map(o => o.x + o.width)];
    const allY = [...validTables.map(t => t.y), ...validObjects.map(o => o.y), ...validTables.map(t => t.y + t.height), ...validObjects.map(o => o.y + o.height)];
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minY = Math.min(...allY), maxY = Math.max(...allY);
    const contentW = Math.max(1, maxX - minX + 100);
    const contentH = Math.max(1, maxY - minY + 100);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const scale = Math.min((rect.width - 40) / contentW, (rect.height - 40) / contentH, 1.5);
    const safeScale = isFinite(scale) && scale > 0 ? scale : 1;
    setZoom(safeScale);
    setPan({
      x: (rect.width - (maxX - minX) * safeScale) / 2 - minX * safeScale,
      y: (rect.height - (maxY - minY) * safeScale) / 2 - minY * safeScale,
    });
  }

  // ===== Guest assignment =====

  const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed');
  // Build seatable entries including confirmed plus-ones as synthetic guest entries
  const plusOneEntries: Guest[] = confirmedGuests
    .filter(g => g.has_plus_one && g.plus_one_rsvp === 'confirmed')
    .map(g => ({
      ...g,
      id: `plus-one-${g.id}`,
      first_name: g.plus_one_name || 'Plus One',
      last_name: '',
      household_id: g.household_id,
      meal_choice: '',
      dietary_restrictions: '',
    }));
  const seatableGuests = [...confirmedGuests, ...plusOneEntries];
  const unassigned = seatableGuests.filter(g => !assignments[g.id]);
  const assignedMap = assignments;

  function guestsAtTable(tableId: string): Guest[] {
    return seatableGuests.filter(g => assignedMap[g.id]?.tableId === tableId);
  }

  function assignGuestToSeat(guestId: string, tableId: string, seat: number) {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    void assignGuestToTable;
    void unassignGuest;
    // Check if seat is occupied
    const occupant = seatableGuests.find(g => assignedMap[g.id]?.tableId === tableId && assignedMap[g.id]?.seat === seat);
    if (occupant && occupant.id !== guestId) {
      // Swap seats
      pushUndo();
      const newAssign = { ...assignments };
      const guestCurrent = newAssign[guestId];
      newAssign[occupant.id] = { tableId: guestCurrent?.tableId || tableId, seat: guestCurrent?.seat || 0 };
      newAssign[guestId] = { tableId, seat };
      setAssignments(newAssign);
      persistAssignment(occupant.id, guestCurrent?.tableId || tableId, guestCurrent?.seat || 0);
      persistAssignment(guestId, tableId, seat);
      setToast('Swapped seats');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    pushUndo();
    const newAssign = { ...assignments, [guestId]: { tableId, seat } };
    setAssignments(newAssign);
    persistAssignment(guestId, tableId, seat);
  }

  function assignGuestToTable(guestId: string, tableId: string) {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const occupied = guestsAtTable(tableId);
    if (occupied.length >= table.capacity) {
      setToast(`Table "${table.label}" is at full capacity (${table.capacity})`);
      setTimeout(() => setToast(''), 3000);
      return;
    }
    // Find first free seat
    const takenSeats = new Set(occupied.map(g => assignedMap[g.id]?.seat));
    let freeSeat = 0;
    for (let i = 0; i < table.capacity; i++) {
      if (!takenSeats.has(i)) { freeSeat = i; break; }
    }
    assignGuestToSeat(guestId, tableId, freeSeat);
  }

  function unassignGuest(guestId: string) {
    pushUndo();
    const newAssign = { ...assignments };
    delete newAssign[guestId];
    setAssignments(newAssign);
    persistAssignment(guestId, null, null);
  }

  function moveGuestToTable(guestId: string, tableId: string) {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const occupied = guestsAtTable(tableId).filter(g => g.id !== guestId);
    if (occupied.length >= table.capacity) {
      setToast(`Table "${table.label}" is at full capacity (${table.capacity})`);
      setTimeout(() => setToast(''), 3000);
      return;
    }
    const takenSeats = new Set(occupied.map(g => assignedMap[g.id]?.seat));
    let freeSeat = 0;
    for (let i = 0; i < table.capacity; i++) {
      if (!takenSeats.has(i)) { freeSeat = i; break; }
    }
    pushUndo();
    const newAssign = { ...assignments, [guestId]: { tableId, seat: freeSeat } };
    setAssignments(newAssign);
    persistAssignment(guestId, tableId, freeSeat);
  }

  // ===== Drag and drop from tray =====

  function onGuestDragStart(e: React.DragEvent, guestId: string) {
    setDragGuestId(guestId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', guestId);
  }

  function onTableDragOver(e: React.DragEvent, tableId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(tableId);
  }

  function onTableDrop(e: React.DragEvent, tableId: string) {
    e.preventDefault();
    setDropTarget(null);
    const guestId = e.dataTransfer.getData('text/plain') || dragGuestId;
    if (!guestId) return;
    moveGuestToTable(guestId, tableId);
    setDragGuestId(null);
  }

  function onSeatDrop(e: React.DragEvent, tableId: string, seat: number) {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    const guestId = e.dataTransfer.getData('text/plain') || dragGuestId;
    if (!guestId) return;
    assignGuestToSeat(guestId, tableId, seat);
    setDragGuestId(null);
  }

  // ===== Property panel =====

  function updateSelectedTable(updates: Partial<SeatingTable>) {
    if (!selectedId || selectedType !== 'table') return;
    pushUndo();
    setTables(prev => prev.map(t => t.id === selectedId ? { ...t, ...updates } : t));
    const t = tables.find(t => t.id === selectedId);
    if (t) persistTable({ ...t, ...updates });
  }

  function updateSelectedObject(updates: Partial<SeatingObject>) {
    if (!selectedId || selectedType !== 'object') return;
    pushUndo();
    setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, ...updates } : o));
    const o = objects.find(o => o.id === selectedId);
    if (o) persistObject({ ...o, ...updates });
  }

  // ===== Rules =====

  async function addRule(rule: Omit<SeatingRule, 'id' | 'wedding_id'>) {
    const { data } = await supabase.from('seating_rules').insert({ ...rule, wedding_id: weddingId }).select().single();
    if (data) setRules(prev => [...prev, data as SeatingRule]);
  }

  async function deleteRule(id: string) {
    await supabase.from('seating_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
  }

  // ===== Auto-arrange =====

  function autoArrange() {
    pushUndo();
    const newAssign: Record<string, { tableId: string; seat: number }> = {};
    const sortedTables = [...tables].sort((a, b) => {
      // Head table first, then by table number
      if (a.shape === 'head' && b.shape !== 'head') return -1;
      if (b.shape === 'head' && a.shape !== 'head') return 1;
      return a.table_number - b.table_number;
    });

    // Group confirmed guests by household
    const householdGroups: { householdId: string | null; guests: Guest[] }[] = [];
    const byHousehold = new Map<string | null, Guest[]>();
    confirmedGuests.forEach(g => {
      const key = g.household_id || null;
      if (!byHousehold.has(key)) byHousehold.set(key, []);
      byHousehold.get(key)!.push(g);
    });
    // Also include plus-one entries in their host's household group
    plusOneEntries.forEach(po => {
      const key = po.household_id || null;
      if (byHousehold.has(key)) {
        byHousehold.get(key)!.push(po);
      } else {
        byHousehold.set(key, [po]);
      }
    });
    householdGroups.push(...Array.from(byHousehold.entries()).map(([householdId, gs]) => ({ householdId, guests: gs })));

    // Sort groups by size (larger first for head table), then keep households together
    householdGroups.sort((a, b) => b.guests.length - a.guests.length);

    // Separate guests with "together" rules
    const togetherPairs = rules.filter(r => r.rule_type === 'together' && r.scope === 'guest');
    const apartPairs = rules.filter(r => r.rule_type === 'apart' && r.scope === 'guest');

    // Try to seat groups
    const tableSeats = sortedTables.map(t => ({ table: t, filled: 0, guests: [] as string[] }));

    for (const group of householdGroups) {
      // Try to find a table that fits the whole group
      let placed = false;
      for (const ts of tableSeats) {
        const remaining = ts.table.capacity - ts.filled;
        if (remaining >= group.guests.length) {
          // Check apart rules
          const hasConflict = group.guests.some(gid => {
            return apartPairs.some(p => {
              const otherId = p.guest_a_id === gid.id ? p.guest_b_id : p.guest_b_id === gid.id ? p.guest_a_id : null;
              return otherId !== null && ts.guests.includes(otherId);
            });
          });
          if (hasConflict) continue;
          // Place group
          for (const g of group.guests) {
            newAssign[g.id] = { tableId: ts.table.id, seat: ts.filled };
            ts.guests.push(g.id);
            ts.filled++;
          }
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Place individually
        for (const g of group.guests) {
          for (const ts of tableSeats) {
            if (ts.filled < ts.table.capacity) {
              const hasConflict = apartPairs.some(p => {
                const otherId = p.guest_a_id === g.id ? p.guest_b_id : p.guest_b_id === g.id ? p.guest_a_id : null;
                return otherId !== null && ts.guests.includes(otherId);
              });
              if (hasConflict) continue;
              newAssign[g.id] = { tableId: ts.table.id, seat: ts.filled };
              ts.guests.push(g.id);
              ts.filled++;
              break;
            }
          }
        }
      }
    }

    // Apply together rules — try to move people to the same table
    for (const rule of togetherPairs) {
      if (!rule.guest_a_id || !rule.guest_b_id) continue;
      const a = newAssign[rule.guest_a_id];
      const b = newAssign[rule.guest_b_id];
      if (a && b && a.tableId !== b.tableId) {
        // Try to move b to a's table
        const table = sortedTables.find(t => t.id === a.tableId);
        if (table) {
          const atTable = Object.values(newAssign).filter(v => v.tableId === a.tableId).length;
          if (atTable < table.capacity) {
            const takenSeats = new Set(Object.entries(newAssign).filter(([, v]) => v.tableId === a.tableId).map(([, v]) => v.seat));
            let freeSeat = 0;
            for (let i = 0; i < table.capacity; i++) { if (!takenSeats.has(i)) { freeSeat = i; break; } }
            newAssign[rule.guest_b_id] = { tableId: a.tableId, seat: freeSeat };
          }
        }
      }
    }

    setAutoArrangePreview(newAssign);
  }

  function acceptAutoArrange() {
    if (!autoArrangePreview) return;
    setAssignments(autoArrangePreview);
    // Persist all
    for (const [gid, a] of Object.entries(autoArrangePreview)) {
      persistAssignment(gid, a.tableId, a.seat);
    }
    // Unassign those not in preview
    for (const gid of Object.keys(assignments)) {
      if (!autoArrangePreview[gid]) persistAssignment(gid, null, null);
    }
    setAutoArrangePreview(null);
    setToast('Auto-arrange applied');
    setTimeout(() => setToast(''), 2000);
  }

  function discardAutoArrange() {
    setAutoArrangePreview(null);
  }

  // ===== Export =====

  function exportPDF() {
    const meta = { partner1: profile?.partner1_name || 'Partner 1', partner2: profile?.partner2_name || 'Partner 2', weddingDate: profile?.wedding_date || null };
    const dateStr = meta.weddingDate ? new Date(meta.weddingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';

    // Build SVG of the floor plan
    const allSvg: string[] = [];
    objects.forEach(o => {
      allSvg.push(`<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" rx="4" fill="#e8e0d5" stroke="#c9a96e" stroke-width="1.5" transform="rotate(${o.rotation} ${o.x + o.width / 2} ${o.y + o.height / 2})" /><text x="${o.x + o.width / 2}" y="${o.y + o.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#6a5a4a" font-family="sans-serif">${escHtml(o.label)}</text>`);
    });
    tables.forEach(t => {
      const seats = getSeatPositions(t);
      if (t.shape === 'round') {
        allSvg.push(`<circle cx="${t.x + t.width / 2}" cy="${t.y + t.height / 2}" r="${t.width / 2}" fill="#fff" stroke="#c9a96e" stroke-width="2" />`);
      } else {
        allSvg.push(`<rect x="${t.x}" y="${t.y}" width="${t.width}" height="${t.height}" rx="8" fill="#fff" stroke="#c9a96e" stroke-width="2" transform="rotate(${t.rotation} ${t.x + t.width / 2} ${t.y + t.height / 2})" />`);
      }
      allSvg.push(`<text x="${t.x + t.width / 2}" y="${t.y + t.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="bold" fill="#2a1f15" font-family="serif">${escHtml(t.label)}</text>`);
      seats.forEach((s, i) => {
        const occupant = seatableGuests.find(g => assignedMap[g.id]?.tableId === t.id && assignedMap[g.id]?.seat === i);
        allSvg.push(`<circle cx="${t.x + s.x}" cy="${t.y + s.y}" r="8" fill="${occupant ? '#c9a96e' : '#f5f0ea'}" stroke="#c9a96e" stroke-width="1" />`);
        if (occupant) {
          allSvg.push(`<text x="${t.x + s.x}" y="${t.y + s.y}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="#fff" font-family="sans-serif">${escHtml(occupant.first_name.charAt(0))}${escHtml(occupant.last_name.charAt(0))}</text>`);
        }
      });
    });

    // Per-table guest list with meal counts
    const tableListHtml = tables.sort((a, b) => a.table_number - b.table_number).map(t => {
      const tGuests = guestsAtTable(t.id);
      const mealCounts: Record<string, number> = {};
      tGuests.forEach(g => { if (g.meal_choice) mealCounts[g.meal_choice] = (mealCounts[g.meal_choice] || 0) + 1; });
      const dietary = tGuests.filter(g => g.dietary_restrictions);
      return `
        <div style="break-inside:avoid;margin-bottom:16px;">
          <div style="font-size:14px;font-weight:bold;color:#c9a96e;border-bottom:1px solid #e8e0d5;padding-bottom:4px;margin-bottom:6px;">${escHtml(t.label)} (${tGuests.length}/${Number(t.capacity) || 0})</div>
          <table style="font-size:11px;width:100%;"><tbody>
            ${tGuests.map(g => `<tr><td>${escHtml(g.first_name)} ${escHtml(g.last_name)}</td><td style="color:#9a8a7a">${escHtml(g.meal_choice || '—')}</td><td style="color:#dc2626;font-size:10px;">${g.dietary_restrictions ? '⚠ ' + escHtml(g.dietary_restrictions) : ''}</td></tr>`).join('')}
          </tbody></table>
          ${Object.keys(mealCounts).length > 0 ? `<div style="margin-top:4px;font-size:10px;color:#6a5a4a;">Meals: ${Object.entries(mealCounts).map(([m, c]) => `${escHtml(m)}: ${c}`).join(' · ')}</div>` : ''}
          ${dietary.length > 0 ? `<div style="margin-top:2px;font-size:10px;color:#dc2626;">Dietary: ${dietary.map(g => `${escHtml(g.first_name)} (${escHtml(g.dietary_restrictions)})`).join(', ')}</div>` : ''}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Floor Plan — ${escHtml(meta.partner1)} &amp; ${escHtml(meta.partner2)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Georgia, serif; color: #2a1f15; background: #fff; }
      .header { background: linear-gradient(135deg, #1a1510 0%, #2e2218 100%); color: #fff; padding: 24px 32px; }
      .header-title { font-size: 22px; font-weight: bold; }
      .header-sub { color: #c9a96e; font-size: 12px; margin-top: 4px; }
      .page { padding: 24px 32px; }
      .floor-plan-svg { width: 100%; border: 1px solid #e8e0d5; border-radius: 8px; margin-bottom: 24px; }
      .table-list { columns: 2; column-gap: 24px; }
      h2 { font-size: 14px; color: #c9a96e; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 10px; }
      @media print { .page { break-after: page; } }
    </style></head><body>
    <div class="header">
      <div class="header-title">${escHtml(meta.partner1)} &amp; ${escHtml(meta.partner2)}</div>
      <div class="header-sub">${escHtml(dateStr)} · Floor Plan &amp; Seating</div>
    </div>
    <div class="page">
      <h2>Floor Plan</h2>
      <svg class="floor-plan-svg" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#faf9f7;">
        ${allSvg.join('\n')}
      </svg>
      <h2>Per-Table Guest List & Meal Counts</h2>
      <div class="table-list">${tableListHtml}</div>
    </div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => setTimeout(() => win.print(), 500));
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // ===== Render =====

  const selectedTable = selectedType === 'table' ? tables.find(t => t.id === selectedId) : null;
  const selectedObject = selectedType === 'object' ? objects.find(o => o.id === selectedId) : null;
  const filteredUnassigned = unassigned.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return `${g.first_name} ${g.last_name}`.toLowerCase().includes(q);
  });

  // Group unassigned by household
  const unassignedByHousehold = new Map<string | null, Guest[]>();
  filteredUnassigned.forEach(g => {
    const key = g.household_id || null;
    if (!unassignedByHousehold.has(key)) unassignedByHousehold.set(key, []);
    unassignedByHousehold.get(key)!.push(g);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a96e]" /></div>;
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-180px)] min-h-[500px] border border-stone-200 dark:border-[#3a2e22] rounded-xl overflow-hidden bg-stone-50 dark:bg-[#1f1813]">
      {/* Left: Unassigned tray */}
      <div className="w-64 flex-shrink-0 bg-white dark:bg-[#2a1f15] border-r border-stone-200 dark:border-[#3a2e22] flex flex-col">
        <div className="px-4 py-3 border-b border-stone-100 bg-amber-50">
          <div className="flex items-center justify-between">
            <h3 className="text-amber-800 font-medium text-sm flex items-center gap-1.5">
              <span>Unassigned</span>
              <span className="bg-amber-200 text-amber-800 text-xs px-1.5 py-0.5 rounded-full font-bold">{unassigned.length}</span>
            </h3>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search guests…"
            className="w-full mt-2 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Array.from(unassignedByHousehold.entries()).map(([householdId, gs]) => {
            const h = householdId ? households.find(hh => hh.id === householdId) : null;
            return (
              <div key={householdId || 'individual'}>
                {h && <div className="text-xs text-[#6b5d4f] font-medium px-2 py-1 mt-1">{h.name}</div>}
                {gs.map(g => (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={e => onGuestDragStart(e, g.id)}
                    onDragEnd={() => setDragGuestId(null)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 cursor-grab active:cursor-grabbing border border-transparent hover:border-stone-200 transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: g.meal_choice ? (MEAL_COLORS[g.meal_choice] || '#9a8a7a') : (g.id.startsWith('plus-one-') ? '#c9a96e' : 'transparent') }}
                      title={g.meal_choice || (g.id.startsWith('plus-one-') ? 'Plus one — no meal choice' : 'No meal choice')}
                    />
                    <span className="text-xs text-[#2a1f15] flex-1 truncate">{g.first_name} {g.last_name}</span>
                    {g.dietary_restrictions && (
                      <span className="text-rose-500 text-xs flex-shrink-0" title={g.dietary_restrictions}>⚠</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          {unassigned.length === 0 && (
            <div className="text-center py-8 text-[#6b5d4f] text-xs">
              All confirmed guests are seated!
            </div>
          )}
          {seatableGuests.length === 0 && (
            <div className="text-center py-8 text-[#6b5d4f] text-xs">
              No confirmed guests yet. Mark guests as "Confirmed" in the Guest List first.
            </div>
          )}
        </div>
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 relative overflow-hidden" ref={canvasRef} onMouseDown={onCanvasMouseDown} onWheel={onWheel}>
        {/* Canvas background with grid */}
        <div
          data-canvas-bg="true"
          className="absolute inset-0 bg-stone-100 dark:bg-[#1f1813]"
          style={{
            backgroundImage: showGrid ? `linear-gradient(to right, #e8e0d5 1px, transparent 1px), linear-gradient(to bottom, #e8e0d5 1px, transparent 1px)` : undefined,
            backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Printable page boundary */}
          <div
            data-canvas-bg="true"
            className="absolute border-2 border-dashed border-stone-300 dark:border-[#3a2e22] bg-white/40 dark:bg-[#2a1f15]/40"
            style={{
              left: pan.x,
              top: pan.y,
              width: PAGE_WIDTH * zoom,
              height: PAGE_HEIGHT * zoom,
            }}
          >
            <span className="absolute -top-5 left-0 text-xs text-stone-500 dark:text-[#6b5d4f]">Printable page ({PAGE_WIDTH}×{PAGE_HEIGHT}px)</span>
          </div>

          {/* Objects */}
          {objects.map(o => (
            <div
              key={o.id}
              onMouseDown={e => onObjectMouseDown(e, o)}
              className={`absolute cursor-move select-none ${selectedId === o.id ? 'z-20' : 'z-10'}`}
              style={{
                left: o.x * zoom + pan.x,
                top: o.y * zoom + pan.y,
                width: o.width * zoom,
                height: o.height * zoom,
                transform: `rotate(${o.rotation}deg)`,
                transformOrigin: 'center',
              }}
            >
              <div className={`w-full h-full rounded-md flex items-center justify-center text-xs font-medium text-[#5d4e3e] dark:text-[#a89878] bg-stone-200/60 dark:bg-[#3a2e22]/60 border-2 ${selectedId === o.id ? 'border-[#c9a96e] shadow-lg' : 'border-stone-300 dark:border-[#4a3e32]'}`}>
                {o.label}
              </div>
            </div>
          ))}

          {/* Tables */}
          {tables.map(t => {
            const seats = getSeatPositions(t);
            const tGuests = guestsAtTable(t.id);
            const isFull = tGuests.length >= t.capacity;
            const isDropTarget = dropTarget === t.id;
            const isPreview = autoArrangePreview !== null;
            const previewAssign = autoArrangePreview;
            return (
              <div
                key={t.id}
                onMouseDown={e => onTableMouseDown(e, t)}
                onDragOver={e => onTableDragOver(e, t.id)}
                onDragLeave={() => setDropTarget(null)}
                onDrop={e => onTableDrop(e, t.id)}
                className={`absolute cursor-move select-none ${selectedId === t.id ? 'z-20' : 'z-10'} ${isDropTarget ? 'ring-2 ring-[#c9a96e] ring-offset-2 ring-offset-transparent' : ''}`}
                style={{
                  left: t.x * zoom + pan.x,
                  top: t.y * zoom + pan.y,
                  width: t.width * zoom,
                  height: t.height * zoom,
                }}
              >
                {/* Table shape */}
                <div
                  className={`absolute inset-0 flex items-center justify-center font-serif text-sm font-medium border-2 transition-shadow ${selectedId === t.id ? 'border-[#c9a96e] shadow-lg' : 'border-[#c9a96e]/60'} ${isFull ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-white dark:bg-[#2a1f15]'} ${isPreview ? 'opacity-60' : ''}`}
                  style={{
                    borderRadius: t.shape === 'round' ? '50%' : '8px',
                    transform: `rotate(${t.rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  <div className="text-center pointer-events-none">
                    <div className="text-[#2a1f15] dark:text-[#e8dcc8]">{t.label}</div>
                    <div className={`text-xs ${isFull ? 'text-rose-500 dark:text-rose-400' : 'text-[#6b5d4f] dark:text-[#a89878]'}`}>{tGuests.length}/{t.capacity}</div>
                  </div>
                </div>

                {/* Seats */}
                {seats.map((s, i) => {
                  const occupant = seatableGuests.find(g => assignedMap[g.id]?.tableId === t.id && assignedMap[g.id]?.seat === i);
                  const previewOccupant = previewAssign ? seatableGuests.find(g => previewAssign[g.id]?.tableId === t.id && previewAssign[g.id]?.seat === i) : null;
                  const showOccupant = autoArrangePreview ? previewOccupant : occupant;
                  return (
                    <div
                      key={i}
                      onDrop={e => onSeatDrop(e, t.id, i)}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                      className="absolute flex items-center justify-center rounded-full border transition-colors"
                      style={{
                        left: s.x * zoom - 10,
                        top: s.y * zoom - 10,
                        width: 20,
                        height: 20,
                        background: showOccupant ? (MEAL_COLORS[showOccupant.meal_choice] || '#c9a96e') : '#f5f0ea',
                        borderColor: showOccupant ? (MEAL_COLORS[showOccupant.meal_choice] || '#c9a96e') : '#c9a96e',
                        borderWidth: showOccupant ? 2 : 1,
                      }}
                      title={showOccupant ? `${showOccupant.first_name} ${showOccupant.last_name}${showOccupant.meal_choice ? ` — ${showOccupant.meal_choice}` : ''}${showOccupant.dietary_restrictions ? ` — ${showOccupant.dietary_restrictions}` : ''}` : `Seat ${i + 1}`}
                    >
                      {showOccupant && (
                        <span className="text-[8px] text-white font-bold">{showOccupant.first_name.charAt(0)}{showOccupant.last_name.charAt(0)}</span>
                      )}
                    </div>
                  );
                })}

                {/* Rotation handle */}
                {selectedId === t.id && (
                  <div
                    onMouseDown={e => onRotateMouseDown(e, t.id)}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#c9a96e] rounded-full cursor-grab border-2 border-white shadow"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Canvas toolbar */}
        <div className="absolute top-3 left-3 z-40 flex items-center gap-1.5 bg-white/90 dark:bg-[#2a1f15]/90 backdrop-blur rounded-lg shadow-sm border border-stone-200 dark:border-[#3a2e22] px-2 py-1.5">
          <button onClick={zoomOut} className="p-1 hover:bg-stone-100 dark:hover:bg-white/10 rounded text-[#5d4e3e] dark:text-[#a89878]" title="Zoom out">−</button>
          <span className="text-xs text-[#5d4e3e] dark:text-[#a89878] w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="p-1 hover:bg-stone-100 dark:hover:bg-white/10 rounded text-[#5d4e3e] dark:text-[#a89878]" title="Zoom in">+</button>
          <div className="w-px h-5 bg-stone-200 dark:bg-[#3a2e22] mx-1" />
          <button onClick={fitToScreen} className="p-1 hover:bg-stone-100 dark:hover:bg-white/10 rounded text-[#5d4e3e] dark:text-[#a89878] text-xs" title="Fit to screen">Fit</button>
          <button onClick={() => setShowGrid(g => !g)} className={`p-1 rounded text-xs ${showGrid ? 'bg-[#c9a96e]/10 text-[#8a6d3b] dark:text-[#c9a96e]' : 'text-[#5d4e3e] dark:text-[#a89878] hover:bg-stone-100 dark:hover:bg-white/10'}`} title="Toggle grid">Grid</button>
        </div>

        {/* Add menu */}
        <div className="absolute top-3 right-3">
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-stone-200 p-2 w-48 z-30">
              <div className="text-xs text-[#6b5d4f] uppercase tracking-wider px-2 py-1">Tables</div>
              {(['round', 'rectangle', 'head', 'sweetheart'] as TableShape[]).map(s => (
                <button key={s} onClick={() => addTable(s)} className="w-full text-left px-2 py-1.5 hover:bg-stone-50 rounded text-sm text-[#2a1f15] capitalize">{s === 'head' ? 'Head Table' : s === 'sweetheart' ? 'Sweetheart Table' : `Table ${s}`}</button>
              ))}
              <div className="text-xs text-[#6b5d4f] uppercase tracking-wider px-2 py-1 mt-1">Objects</div>
              {(['dance_floor', 'bar', 'stage', 'cake_table', 'dj'] as ObjectType[]).map(s => (
                <button key={s} onClick={() => addObject(s)} className="w-full text-left px-2 py-1.5 hover:bg-stone-50 rounded text-sm text-[#2a1f15] capitalize">{s === 'dj' ? 'DJ Booth' : s === 'dance_floor' ? 'Dance Floor' : s === 'cake_table' ? 'Cake Table' : s.replace('_', ' ')}</button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 bg-[#8a6d3b] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#7a6030] transition-colors shadow-sm"
          >
            + Add
          </button>
        </div>

        {/* Bottom toolbar — z-50 so it sits above all canvas elements and captures clicks */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/90 dark:bg-[#2a1f15]/95 backdrop-blur rounded-lg shadow-lg border border-stone-200 dark:border-[#3a2e22] px-3 py-1.5">
          <button onClick={undo} disabled={undoStack.length === 0} className="text-xs text-[#5d4e3e] dark:text-[#a89878] px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-30" title="Undo">↶ Undo</button>
          <button onClick={redo} disabled={redoStack.length === 0} className="text-xs text-[#5d4e3e] dark:text-[#a89878] px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-30" title="Redo">↷ Redo</button>
          <div className="w-px h-5 bg-stone-200 dark:bg-[#3a2e22]" />
          <button onClick={duplicateSelected} disabled={!selectedId} className="text-xs text-[#5d4e3e] dark:text-[#a89878] px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-30" title="Duplicate">Duplicate</button>
          <button onClick={deleteSelected} disabled={!selectedId} className="text-xs text-rose-500 dark:text-rose-400 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30" title="Delete">Delete</button>
          <div className="w-px h-5 bg-stone-200 dark:bg-[#3a2e22]" />
          <button onClick={() => setShowRulesPanel(true)} className="text-xs text-[#5d4e3e] dark:text-[#a89878] px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-white/10 flex items-center gap-1" title="Seating rules">
            <span className={`w-2 h-2 rounded-full ${conflictWarnings.length > 0 ? 'bg-rose-500' : 'bg-emerald-400'}`} />
            Rules ({rules.length})
          </button>
          <button onClick={autoArrange} disabled={tables.length === 0 || seatableGuests.length === 0} className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] dark:text-[#c9a96e] px-2 py-1 rounded hover:bg-[#c9a96e]/20 disabled:opacity-30" title="Auto-arrange">Auto-arrange</button>
          <button onClick={exportPDF} className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-800/40 dark:text-sky-300 px-2 py-1 rounded hover:bg-sky-200 dark:hover:bg-sky-800/60" title="Export PDF">Export PDF</button>
        </div>

        {/* Conflict warnings */}
        {conflictWarnings.length > 0 && (
          <div className="absolute bottom-16 left-3 z-30 max-w-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg p-3 shadow-sm">
            <div className="text-xs font-medium text-rose-800 mb-1">⚠ Seating conflicts</div>
            {conflictWarnings.map((w, i) => (
              <div key={i} className="text-xs text-rose-600 mt-1">{w}</div>
            ))}
          </div>
        )}

        {/* Auto-arrange preview bar */}
        {autoArrangePreview && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-[#1a1510] text-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-3">
            <span className="text-sm">Auto-arrange preview</span>
            <button onClick={acceptAutoArrange} className="bg-emerald-500 text-white text-xs px-3 py-1 rounded hover:bg-emerald-600">Accept</button>
            <button onClick={discardAutoArrange} className="bg-white/10 text-white text-xs px-3 py-1 rounded hover:bg-white/20">Discard</button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg" style={{ top: autoArrangePreview ? '60px' : '12px' }}>
            {toast}
          </div>
        )}
      </div>

      {/* Right: Property panel (only when something is selected) */}
      {(selectedTable || selectedObject) && (
        <div className="w-56 flex-shrink-0 bg-white dark:bg-[#2a1f15] border-l border-stone-200 dark:border-[#3a2e22] p-4 overflow-y-auto">
          {selectedTable && (
            <div className="space-y-3">
              <h3 className="text-[#2a1f15] font-serif text-sm font-medium">Table properties</h3>
              <div>
                <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Label</label>
                <input
                  value={selectedTable.label}
                  onChange={e => updateSelectedTable({ label: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
                />
              </div>
              <div>
                <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Shape</label>
                <select
                  value={selectedTable.shape}
                  onChange={e => {
                    const shape = e.target.value as TableShape;
                    const d = SHAPE_DEFAULTS[shape];
                    updateSelectedTable({ shape, width: d.width, height: d.height });
                  }}
                  className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
                >
                  <option value="round">Round</option>
                  <option value="rectangle">Rectangle</option>
                  <option value="head">Head Table</option>
                  <option value="sweetheart">Sweetheart</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Capacity</label>
                <input
                  type="number" min="1" max="50"
                  value={selectedTable.capacity}
                  onChange={e => updateSelectedTable({ capacity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
                />
              </div>
              <div>
                <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Table number</label>
                <input
                  type="number" min="1"
                  value={selectedTable.table_number}
                  onChange={e => updateSelectedTable({ table_number: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Width</label>
                  <input type="number" value={selectedTable.width} onChange={e => updateSelectedTable({ width: Math.max(40, parseInt(e.target.value) || 40) })} className="w-full border border-stone-200 rounded-lg px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Height</label>
                  <input type="number" value={selectedTable.height} onChange={e => updateSelectedTable({ height: Math.max(40, parseInt(e.target.value) || 40) })} className="w-full border border-stone-200 rounded-lg px-2 py-1 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Rotation: {selectedTable.rotation}°</label>
                <input type="range" min="0" max="360" value={selectedTable.rotation} onChange={e => updateSelectedTable({ rotation: parseInt(e.target.value) })} className="w-full accent-[#c9a96e]" />
              </div>
            </div>
          )}
          {selectedObject && (
            <div className="space-y-3">
              <h3 className="text-[#2a1f15] font-serif text-sm font-medium">Object properties</h3>
              <div>
                <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Label</label>
                <input value={selectedObject.label} onChange={e => updateSelectedObject({ label: e.target.value })} className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Type</label>
                <select value={selectedObject.object_type} onChange={e => updateSelectedObject({ object_type: e.target.value as ObjectType })} className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40">
                  <option value="dance_floor">Dance Floor</option>
                  <option value="bar">Bar</option>
                  <option value="stage">Stage</option>
                  <option value="cake_table">Cake Table</option>
                  <option value="dj">DJ Booth</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Width</label><input type="number" value={selectedObject.width} onChange={e => updateSelectedObject({ width: Math.max(40, parseInt(e.target.value) || 40) })} className="w-full border border-stone-200 rounded-lg px-2 py-1 text-sm" /></div>
                <div><label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Height</label><input type="number" value={selectedObject.height} onChange={e => updateSelectedObject({ height: Math.max(40, parseInt(e.target.value) || 40) })} className="w-full border border-stone-200 rounded-lg px-2 py-1 text-sm" /></div>
              </div>
              <div><label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1">Rotation: {selectedObject.rotation}°</label><input type="range" min="0" max="360" value={selectedObject.rotation} onChange={e => updateSelectedObject({ rotation: parseInt(e.target.value) })} className="w-full accent-[#c9a96e]" /></div>
            </div>
          )}
        </div>
      )}

      {/* Rules panel */}
      {showRulesPanel && (
        <RulesPanel
          rules={rules}
          guests={guests}
          households={households}
          confirmedGuests={seatableGuests}
          onClose={() => setShowRulesPanel(false)}
          onAddRule={addRule}
          onDeleteRule={deleteRule}
        />
      )}
    </div>
  );
}

// ===== Rules Panel =====

function RulesPanel({ rules, guests, households, confirmedGuests, onClose, onAddRule, onDeleteRule }: {
  rules: SeatingRule[];
  guests: Guest[];
  households: Household[];
  confirmedGuests: Guest[];
  onClose: () => void;
  onAddRule: (rule: Omit<SeatingRule, 'id' | 'wedding_id'>) => void;
  onDeleteRule: (id: string) => void;
}) {
  const [ruleType, setRuleType] = useState<'together' | 'apart'>('together');
  const [scope, setScope] = useState<'guest' | 'household'>('guest');
  const [guestA, setGuestA] = useState('');
  const [guestB, setGuestB] = useState('');
  const [householdA, setHouseholdA] = useState('');
  const [householdB, setHouseholdB] = useState('');

  function submit() {
    if (scope === 'guest' && guestA && guestB && guestA !== guestB) {
      onAddRule({ rule_type: ruleType, scope, guest_a_id: guestA, guest_b_id: guestB, household_a_id: null, household_b_id: null });
      setGuestA(''); setGuestB('');
    } else if (scope === 'household' && householdA && householdB && householdA !== householdB) {
      onAddRule({ rule_type: ruleType, scope, guest_a_id: null, guest_b_id: null, household_a_id: householdA, household_b_id: householdB });
      setHouseholdA(''); setHouseholdB('');
    }
  }

  function ruleLabel(r: SeatingRule): string {
    if (r.scope === 'guest') {
      const a = guests.find(g => g.id === r.guest_a_id);
      const b = guests.find(g => g.id === r.guest_b_id);
      return `${a?.first_name} ${a?.last_name} ↔ ${b?.first_name} ${b?.last_name}`;
    }
    const ha = households.find(h => h.id === r.household_a_id);
    const hb = households.find(h => h.id === r.household_b_id);
    return `${ha?.name || '?'} ↔ ${hb?.name || '?'}`;
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#2a1f15] font-serif text-lg">Seating Rules</h3>
          <button onClick={onClose} className="text-[#6b5d4f] hover:text-[#2a1f15]">✕</button>
        </div>

        {/* Add rule form */}
        <div className="space-y-3 mb-4 border border-stone-200 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRuleType('together')} className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${ruleType === 'together' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-[#6b5d4f]'}`}>Seat together</button>
            <button onClick={() => setRuleType('apart')} className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${ruleType === 'apart' ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-stone-200 text-[#6b5d4f]'}`}>Keep apart</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setScope('guest')} className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${scope === 'guest' ? 'border-[#c9a96e] bg-[#c9a96e]/10 text-[#8a6d3b]' : 'border-stone-200 text-[#6b5d4f]'}`}>Per guest</button>
            <button onClick={() => setScope('household')} className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${scope === 'household' ? 'border-[#c9a96e] bg-[#c9a96e]/10 text-[#8a6d3b]' : 'border-stone-200 text-[#6b5d4f]'}`}>Per household</button>
          </div>
          {scope === 'guest' ? (
            <>
              <select value={guestA} onChange={e => setGuestA(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">First guest…</option>
                {confirmedGuests.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>)}
              </select>
              <select value={guestB} onChange={e => setGuestB(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Second guest…</option>
                {confirmedGuests.map(g => <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>)}
              </select>
            </>
          ) : (
            <>
              <select value={householdA} onChange={e => setHouseholdA(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">First household…</option>
                {households.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <select value={householdB} onChange={e => setHouseholdB(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Second household…</option>
                {households.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </>
          )}
          <button onClick={submit} className="w-full bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors">Add rule</button>
        </div>

        {/* Existing rules */}
        <div className="space-y-2">
          {rules.length === 0 && <p className="text-sm text-[#6b5d4f] text-center py-4">No rules yet. Add rules above to guide auto-arrange and get conflict warnings.</p>}
          {rules.map(r => (
            <div key={r.id} className={`flex items-center justify-between border rounded-lg px-3 py-2 ${r.rule_type === 'together' ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
              <div>
                <div className="text-sm text-[#2a1f15]">{ruleLabel(r)}</div>
                <div className={`text-xs ${r.rule_type === 'together' ? 'text-emerald-600' : 'text-rose-500'}`}>{r.rule_type === 'together' ? 'Seat together' : 'Keep apart'} · {r.scope}</div>
              </div>
              <button onClick={() => onDeleteRule(r.id)} className="text-stone-300 hover:text-rose-500 transition-colors">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
