import type { CurriculumUnitOutline, GrammarUnit } from '@/domain/types';
import { u01, u02, u03, u04, u05 } from './units1to5';
import { u06, u07, u08, u09, u10 } from './units6to10';

export const GRAMMAR_UNITS: GrammarUnit[] = [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10];
export const GRAMMAR_BY_ID: Record<string, GrammarUnit> = Object.fromEntries(GRAMMAR_UNITS.map((u) => [u.id, u]));

const outline = (level: CurriculumUnitOutline['level'], titles: string[]): CurriculumUnitOutline[] =>
  titles.map((title, i) => ({ id: `${level.toLowerCase()}-u${String(i + 1).padStart(2, '0')}`, level, title, available: false }));

/** 전체 A1~B2 커리큘럼. A1 만 실제 콘텐츠가 있고, 나머지는 '준비 중'. */
export const CURRICULUM: CurriculumUnitOutline[] = [
  ...GRAMMAR_UNITS.map((u) => ({ id: u.id, level: u.level, title: u.title, available: true })),
  ...outline('A2', ['과거시제', '미래 표현', '비교급과 최상급', '조동사', 'to부정사', '동명사', '접속사', '일상생활 표현']),
  ...outline('B1', ['현재완료', '수동태', '관계대명사', '조건문', '가정법 기초', '복합 문장', '경험과 의견 표현']),
  ...outline('B2', ['가정법 심화', '분사구문', '복잡한 관계절', '고급 어휘', '논리적 독해', '의견문 및 영작']),
];

export const conceptLabel = (id: string): string => GRAMMAR_BY_ID[id]?.title ?? EXTRA_CONCEPTS[id] ?? id;

/** 문법 단원 외 개념 (표현 학습관 등) */
export const EXTRA_CONCEPTS: Record<string, string> = {
  'expr-essential': '필수 회화 표현',
  'expr-travel': '여행 영어',
  'expr-business': '비즈니스 영어',
  'expr-phrasal': '구동사·숙어',
  'expr-situation': '상황별 듣기·말하기',
  'expr-video': '영상 속 영어',
  'reading-a1': 'A1 독해',
};
