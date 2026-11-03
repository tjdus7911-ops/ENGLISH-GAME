import type { UserAnswer } from '../types';

export interface ConceptMastery {
  conceptId: string;
  attempts: number;
  correct: number;
  accuracy: number;
  /** 최근 20개 응답 기준 정답률 */
  recentAccuracy: number;
  distinctDays: number;
  /** 복습(source=review)이 이루어진 서로 다른 날짜 수 */
  reviewDays: number;
}

export function computeMastery(answers: UserAnswer[]): Record<string, ConceptMastery> {
  const by: Record<string, UserAnswer[]> = {};
  for (const a of answers) (by[a.conceptId] ??= []).push(a);
  const out: Record<string, ConceptMastery> = {};
  for (const [conceptId, list] of Object.entries(by)) {
    const sorted = list.slice().sort((a, b) => a.at - b.at);
    const recent = sorted.slice(-20);
    const correct = list.filter((a) => a.correct).length;
    out[conceptId] = {
      conceptId,
      attempts: list.length,
      correct,
      accuracy: correct / list.length,
      recentAccuracy: recent.filter((a) => a.correct).length / recent.length,
      distinctDays: new Set(list.map((a) => a.date)).size,
      reviewDays: new Set(list.filter((a) => a.source === 'review').map((a) => a.date)).size,
    };
  }
  return out;
}

/** 취약 개념: 3회 이상 시도했고 최근 정답률 70% 미만 */
export function weakConcepts(m: Record<string, ConceptMastery>): ConceptMastery[] {
  return Object.values(m)
    .filter((c) => c.attempts >= 3 && c.recentAccuracy < 0.7)
    .sort((a, b) => a.recentAccuracy - b.recentAccuracy);
}
