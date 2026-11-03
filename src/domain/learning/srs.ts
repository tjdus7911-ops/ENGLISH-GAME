import { addDays, diffDays } from '../date';
import type { ReviewItem, ReviewKind } from '../types';

/** 초기 복습 간격: 학습 당일, 1, 3, 7, 14, 30일 */
export const INTERVALS = [0, 1, 3, 7, 14, 30] as const;
export const MAX_STAGE = INTERVALS.length - 1;

export const reviewKey = (kind: ReviewKind, refId: string) => `${kind}:${refId}`;

/** 신규 학습 완료 시 복습 항목 생성. 이미 있으면 그대로 반환 (중복 생성 금지). */
export function createReviewItem(
  existing: Record<string, ReviewItem>,
  kind: ReviewKind,
  refId: string,
  conceptId: string,
  today: string,
): { items: Record<string, ReviewItem>; created: boolean } {
  const key = reviewKey(kind, refId);
  if (existing[key]) return { items: existing, created: false };
  const item: ReviewItem = {
    key, kind, refId, conceptId,
    stage: 0,
    due: addDays(today, INTERVALS[0]),
    createdOn: today,
    correct: 0, wrong: 0, lapses: 0, difficult: false, history: [],
  };
  return { items: { ...existing, [key]: item }, created: true };
}

/**
 * 복습 결과 반영.
 * - 정답률 ≥ 0.8 : 다음 단계로 (간격 증가)
 * - 0.5 ≤ 정답률 < 0.8 : 단계 유지, 같은 간격 다시 (최소 1일)
 * - 정답률 < 0.5 : 단계 한 칸 내림, 내일 다시. 반복 오답(lapses ≥ 2) 은 '어려운 항목'
 * - 같은 날 이미 단계를 올린 항목은 다시 올리지 않는다 (같은 문제 반복 응시로 간격을 부풀리는 것 방지)
 */
export function applyReviewResult(item: ReviewItem, accuracy: number, today: string): ReviewItem {
  const sameDayAgain = item.lastReviewedOn === today && item.history.some((h) => h.date === today && h.accuracy >= 0.8);
  let stage = item.stage;
  let due: string;
  let lapses = item.lapses;
  const correctInc = accuracy >= 0.5 ? 1 : 0;
  if (accuracy >= 0.8) {
    if (!sameDayAgain) stage = Math.min(MAX_STAGE, stage + 1);
    due = addDays(today, Math.max(1, INTERVALS[stage]));
    lapses = Math.max(0, lapses - 1);
  } else if (accuracy >= 0.5) {
    due = addDays(today, Math.max(1, INTERVALS[stage]));
  } else {
    stage = Math.max(0, stage - 1);
    due = addDays(today, 1);
    lapses += 1;
  }
  return {
    ...item,
    stage,
    due,
    lastReviewedOn: today,
    correct: item.correct + correctInc,
    wrong: item.wrong + (1 - correctInc),
    lapses,
    difficult: lapses >= 2 ? true : lapses === 0 ? false : item.difficult,
    history: [...item.history, { date: today, accuracy }].slice(-30),
  };
}

/** 오늘 복습 대상 (밀린 항목 포함). 학습 기록은 삭제하지 않는다. */
export function dueItems(items: Record<string, ReviewItem>, today: string): ReviewItem[] {
  return Object.values(items).filter((i) => diffDays(i.due, today) >= 0);
}

/**
 * 우선순위: 어려운 항목 > 많이 밀린 항목 > 낮은 단계. 많으면 batchSize 단위로 나누어 제공.
 */
export function prioritizeDue(items: ReviewItem[], today: string, batchSize = 15): ReviewItem[][] {
  const sorted = items.slice().sort((a, b) => {
    if (a.difficult !== b.difficult) return a.difficult ? -1 : 1;
    const oa = diffDays(a.due, today);
    const ob = diffDays(b.due, today);
    if (oa !== ob) return ob - oa;
    if (a.stage !== b.stage) return a.stage - b.stage;
    return a.key.localeCompare(b.key);
  });
  const batches: ReviewItem[][] = [];
  for (let i = 0; i < sorted.length; i += batchSize) batches.push(sorted.slice(i, i + batchSize));
  return batches;
}

export function countDueByKind(items: Record<string, ReviewItem>, today: string) {
  const due = dueItems(items, today);
  return {
    total: due.length,
    word: due.filter((d) => d.kind === 'word').length,
    grammar: due.filter((d) => d.kind === 'grammar').length,
    listening: due.filter((d) => d.kind === 'dialogue').length,
    speaking: due.filter((d) => d.kind === 'speaking').length,
    reading: due.filter((d) => d.kind === 'reading').length,
  };
}
