/** Positionnement des blocs qui se chevauchent dans une colonne (algorithme type Google Agenda). */

export type Positioned<T> = {
  item: T;
  top: number; // minutes depuis le début de la grille
  height: number; // minutes
  col: number;
  cols: number;
};

export function layoutColumn<T>(
  items: T[],
  getRange: (t: T) => { start: number; end: number }, // minutes
  minHeight = 20,
): Positioned<T>[] {
  const sorted = items
    .map((item) => {
      const r = getRange(item);
      return { item, start: r.start, end: Math.max(r.end, r.start + minHeight) };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Positioned<T>[] = [];
  let cluster: typeof sorted = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const colEnds: number[] = [];
    const placed = cluster.map((c) => {
      let col = colEnds.findIndex((e) => e <= c.start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(c.end);
      } else {
        colEnds[col] = c.end;
      }
      return { ...c, col };
    });
    const cols = colEnds.length;
    for (const p of placed) {
      out.push({ item: p.item, top: p.start, height: p.end - p.start, col: p.col, cols });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const s of sorted) {
    if (cluster.length && s.start >= clusterEnd) flush();
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, s.end);
  }
  flush();
  return out;
}

export const STEP_MIN = 15;

export function snapMinutes(min: number, step = STEP_MIN) {
  return Math.round(min / step) * step;
}

export function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}
