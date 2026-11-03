import type { StepKind } from '@/domain/types';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { DIALOGUES, SPEAKING } from '@/content/dialogues';
import type { LearningState } from '@/store/app';

/** 추천 커리큘럼 학습 순서: 단어 → 문법 → 확인 문제 → 대화 듣기 → 따라 말하기 → 영작 → 종합 테스트 */
export const STEPS: { kind: StepKind; label: string; desc: string }[] = [
  { kind: 'words', label: '영단어', desc: '새 단어와 발음·예문' },
  { kind: 'grammar', label: '문법 강의', desc: '쉬운 설명과 예문' },
  { kind: 'practice', label: '확인 문제', desc: '단계별 연습문제' },
  { kind: 'listening', label: '대화 듣기', desc: '문법이 쓰인 실제 대화' },
  { kind: 'speaking', label: '따라 말하기', desc: '핵심 문장 3개' },
  { kind: 'writing', label: '영작', desc: '짧은 문장 써 보기' },
  { kind: 'test', label: '종합 테스트', desc: '단원 마무리 평가' },
];

export const stepPath = (unitId: string, kind: StepKind) => {
  switch (kind) {
    case 'words': return `/words/${unitId}?flow=today`;
    case 'grammar': return `/grammar/${unitId}?flow=today`;
    case 'practice': return `/grammar/${unitId}/practice?flow=today`;
    case 'listening': return `/listening/${DIALOGUES.find((d) => d.grammarId === unitId)!.id}?flow=today`;
    case 'speaking': return `/speaking/${unitId}?flow=today`;
    case 'writing': return `/grammar/${unitId}/writing?flow=today`;
    case 'test': return `/grammar/${unitId}/test?flow=today`;
  }
};

export const unitDone = (l: LearningState, unitId: string) => STEPS.every((s) => l.steps[`${unitId}:${s.kind}`]);
export const currentUnit = (l: LearningState) => GRAMMAR_UNITS.find((u) => !unitDone(l, u.id)) ?? GRAMMAR_UNITS[GRAMMAR_UNITS.length - 1];
export const nextStep = (l: LearningState, unitId: string) => STEPS.find((s) => !l.steps[`${unitId}:${s.kind}`]) ?? null;
export const speakingSet = (unitId: string) => SPEAKING.filter((s) => s.grammarId === unitId);
export const stepsDoneOn = (l: LearningState, date: string) => Object.values(l.steps).filter((d) => d === date).length;
