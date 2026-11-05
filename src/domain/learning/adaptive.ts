/**
 * 적응형 레벨 테스트 (계단식 출제).
 * - 시작 레벨 A2. 같은 레벨에서 2문제 연속 정답 → 한 단계 위, 오답 → 한 단계 아래.
 * - 영역(영단어 → 문법 → 표현 → 독해)을 번갈아 출제, 총 24문항.
 * - 추정: 2문항 이상 푼 레벨 중 정답률 60% 이상인 가장 높은 레벨 (아래 레벨이 50% 미만이면 그 아래로 제한).
 * ※ 학습 추천을 위한 앱 내부 추정치이며 공인 CEFR 결과가 아니다.
 */
import { LEVEL_BANK, TEST_AREAS, TEST_LEVELS, type BankItem, type TestArea, type TestLevel } from '@/content/level-bank';

export const TEST_LENGTH = 24;
export interface AdaptiveState { level: number; streak: number; asked: string[]; results: { id: string; area: TestArea; level: TestLevel; correct: boolean }[] }

export const startAdaptive = (): AdaptiveState => ({ level: 1, streak: 0, asked: [], results: [] });

export function nextItem(st: AdaptiveState, bank: BankItem[] = LEVEL_BANK): BankItem | null {
  if (st.results.length >= TEST_LENGTH) return null;
  const area = TEST_AREAS[st.results.length % TEST_AREAS.length];
  const unused = bank.filter((b) => b.area === area && !st.asked.includes(b.id));
  for (const d of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
    const lv = TEST_LEVELS[st.level + d];
    if (!lv) continue;
    const c = unused.find((b) => b.level === lv);
    if (c) return c;
  }
  return null;
}

export function answerItem(st: AdaptiveState, item: BankItem, correct: boolean): AdaptiveState {
  const results = [...st.results, { id: item.id, area: item.area, level: item.level, correct }];
  const asked = [...st.asked, item.id];
  const itemLv = TEST_LEVELS.indexOf(item.level);
  let { level, streak } = st;
  if (correct) {
    streak = itemLv === level ? streak + 1 : 1;
    if (streak >= 2 && level < TEST_LEVELS.length - 1) { level += 1; streak = 0; }
  } else {
    level = Math.max(0, Math.min(level, itemLv) - 1);
    streak = 0;
  }
  return { level, streak, asked, results };
}

export function estimate(results: AdaptiveState['results']): {
  level: TestLevel;
  byLevel: Record<string, { correct: number; total: number }>;
  byArea: Record<TestArea, { correct: number; total: number }>;
} {
  const byLevel: Record<string, { correct: number; total: number }> = {};
  const byArea = Object.fromEntries(TEST_AREAS.map((a) => [a, { correct: 0, total: 0 }])) as Record<TestArea, { correct: number; total: number }>;
  for (const r of results) {
    const b = (byLevel[r.level] ??= { correct: 0, total: 0 });
    b.total++; if (r.correct) b.correct++;
    byArea[r.area].total++; if (r.correct) byArea[r.area].correct++;
  }
  let best = 0;
  for (let i = 0; i < TEST_LEVELS.length; i++) {
    const b = byLevel[TEST_LEVELS[i]];
    if (!b) continue;
    const acc = b.correct / b.total;
    if (b.total >= 2 && acc >= 0.6) best = i;
    else if (acc < 0.5 && i <= best) { best = Math.max(0, i - 1); break; }
  }
  return { level: TEST_LEVELS[best], byLevel, byArea };
}
