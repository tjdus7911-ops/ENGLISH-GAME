export type WorkloadAdvice =
  | { kind: 'hold'; reason: string; suggested: number }
  | { kind: 'increase'; reason: string; suggested: number }
  | { kind: 'keep'; reason: string; suggested: number }
  | { kind: 'decrease'; reason: string; suggested: number; recommendReview: boolean };

export const MIN_ANSWERS_FOR_ADJUST = 10;

/**
 * 학습량 자동 조절 추천.
 * ≥90% 유지/증가 제안, 70–89% 유지, 50–69% 20% 감소, <50% 40% 감소 + 복습 추천.
 * 문항 수가 적으면(10문항 미만) 조정 보류. 최종 결정은 사용자가 한다.
 */
export function adviseWorkload(correct: number, total: number, current: number): WorkloadAdvice {
  if (total < MIN_ANSWERS_FOR_ADJUST) {
    return { kind: 'hold', reason: `푼 문항이 ${total}개라 아직 판단하기 이릅니다. (${MIN_ANSWERS_FOR_ADJUST}문항 이상부터 조정)`, suggested: current };
  }
  const acc = correct / total;
  const pct = Math.round(acc * 100);
  if (acc >= 0.9) return { kind: 'increase', reason: `정답률 ${pct}% — 지금 학습량을 유지하거나 조금 늘려도 좋아요.`, suggested: Math.min(30, current + 5) };
  if (acc >= 0.7) return { kind: 'keep', reason: `정답률 ${pct}% — 지금 학습량이 잘 맞아요.`, suggested: current };
  if (acc >= 0.5) return { kind: 'decrease', reason: `정답률 ${pct}% — 신규 학습량을 20% 줄여 보세요.`, suggested: Math.max(5, Math.round(current * 0.8)), recommendReview: false };
  return { kind: 'decrease', reason: `정답률 ${pct}% — 신규 학습량을 40% 줄이고 복습을 먼저 해 보세요.`, suggested: Math.max(5, Math.round(current * 0.6)), recommendReview: true };
}
