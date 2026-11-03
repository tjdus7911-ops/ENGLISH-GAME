import { adviseWorkload } from '@/domain/learning/workload';
import { computeMastery, weakConcepts } from '@/domain/learning/mastery';
import { compareWords, summarizeDiff } from '@/domain/speech/compare';
import { UnavailableAssessor } from '@/domain/speech/assessment';
import type { UserAnswer } from '@/domain/types';

describe('학습량 조절', () => {
  it('문항 수가 적으면 보류', () => expect(adviseWorkload(3, 3, 10).kind).toBe('hold'));
  it('90% 이상 증가 제안', () => expect(adviseWorkload(19, 20, 10)).toMatchObject({ kind: 'increase', suggested: 15 }));
  it('70~89% 유지', () => expect(adviseWorkload(16, 20, 10)).toMatchObject({ kind: 'keep', suggested: 10 }));
  it('50~69% 20% 감소', () => expect(adviseWorkload(12, 20, 10)).toMatchObject({ kind: 'decrease', suggested: 8, recommendReview: false }));
  it('50% 미만 40% 감소 + 복습', () => expect(adviseWorkload(5, 20, 10)).toMatchObject({ kind: 'decrease', suggested: 6, recommendReview: true }));
});

describe('숙련도/취약 개념', () => {
  const mk = (c: string, ok: boolean, date: string, source: UserAnswer['source'] = 'lesson', at = 0): UserAnswer => ({ id: Math.random() + '', questionId: 'q', conceptId: c, correct: ok, given: '', date, at, source });
  it('정답률·복습일수 계산과 취약 개념', () => {
    const m = computeMastery([
      mk('u1', true, 'd1', 'review'), mk('u1', true, 'd2', 'review'), mk('u1', false, 'd2'),
      mk('u2', false, 'd1'), mk('u2', false, 'd1'), mk('u2', true, 'd1'),
    ]);
    expect(m.u1.reviewDays).toBe(2);
    expect(m.u1.accuracy).toBeCloseTo(2 / 3);
    expect(weakConcepts(m).map((c) => c.conceptId)).toEqual(['u2', 'u1']);
  });
});

describe('말하기 STT 비교', () => {
  it('완전 일치', () => {
    const s = summarizeDiff(compareWords('I am a student.', 'i am a student'));
    expect(s.allMatched).toBe(true);
    expect(s.matched).toBe(4);
  });
  it('누락·추가·다르게 인식', () => {
    const s = summarizeDiff(compareWords('She likes green apples.', 'she like green apples very'));
    expect(s.substituted).toEqual([{ expected: 'likes', heard: 'like' }]);
    expect(s.extra).toEqual(['very']);
    const s2 = summarizeDiff(compareWords('Can you help me?', 'can help me'));
    expect(s2.missing).toEqual(['you']);
  });
  it("축약형·숫자 표기 차이는 같은 단어로 본다", () => {
    expect(summarizeDiff(compareWords("I'm 10 years old.", 'I am ten years old')).allMatched).toBe(true);
  });
  it('발음 평가는 준비 중 상태 반환 (STT로 점수 생성 안 함)', async () => {
    const r = await new UnavailableAssessor().assess();
    expect(r.status).toBe('unavailable');
  });
});
