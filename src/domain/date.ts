/** 로컬 날짜(YYYY-MM-DD) 기반 계산. 시간대 경계 문제를 피하기 위해 시각이 아닌 '달력 날짜'로 복습일을 관리한다. */
export function toDateKey(d: Date | number = Date.now()): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parse(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** 날짜 키에 n일을 더한다 (UTC 연산으로 DST 영향 제거). */
export function addDays(key: string, n: number): string {
  const { y, m, d } = parse(key);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const x = new Date(t);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
}

/** b - a (일 단위) */
export function diffDays(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

export function isValidDateKey(key: unknown): key is string {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
}
