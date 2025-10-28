const palette = [
  '#A7C7E7', '#B7E0C7', '#F7B2A1', '#CDB4DB', '#F9E79F', '#A8E6CF', '#FFD6A5',
  '#E6D5FF', '#C8F7DC', '#FAD0D0', '#BDE0FE', '#D4F4A2', '#F6E2B3', '#D1E8FF'
];

const KEY = 'lucia-color-map';
type ColorMap = Record<string, number>;

function loadMap(): ColorMap {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function saveMap(map: ColorMap) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

/** Devuelve un color pastel consistente por proyecto, asignando el índice menos usado. */
export function colorFor(projectId: string): string {
  const map = loadMap();
  if (map[projectId] !== undefined) return palette[map[projectId] % palette.length];

  // buscar índice menos usado
  const counts = Array(palette.length).fill(0);
  Object.values(map).forEach((i) => counts[i]++);
  const min = Math.min(...counts);
  const idx = counts.indexOf(min);

  map[projectId] = idx;
  saveMap(map);
  return palette[idx];
}
