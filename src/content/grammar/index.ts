import type { CurriculumUnitOutline, GrammarUnit } from '@/domain/types';
import { u01, u02, u03, u04, u05 } from './units1to5';
import { u06, u07, u08, u09, u10 } from './units6to10';
import { a2u01, a2u02, a2u03, a2u04 } from './levels/a2-1';
import { a2u05, a2u06, a2u07, a2u08 } from './levels/a2-2';
import { b1u01, b1u02, b1u03, b1u04 } from './levels/b1-1';
import { b1u05, b1u06, b1u07 } from './levels/b1-2';
import { b2u01, b2u02, b2u03 } from './levels/b2-1';
import { b2u04, b2u05, b2u06 } from './levels/b2-2';

export const A1_UNITS: GrammarUnit[] = [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10];
export const GRAMMAR_UNITS: GrammarUnit[] = [...A1_UNITS, a2u01, a2u02, a2u03, a2u04, a2u05, a2u06, a2u07, a2u08,
  b1u01, b1u02, b1u03, b1u04, b1u05, b1u06, b1u07, b2u01, b2u02, b2u03, b2u04, b2u05, b2u06];
export const GRAMMAR_BY_ID: Record<string, GrammarUnit> = Object.fromEntries(GRAMMAR_UNITS.map((u) => [u.id, u]));

const outline = (level: CurriculumUnitOutline['level'], titles: string[]): CurriculumUnitOutline[] =>
  titles.map((title, i) => ({ id: `${level.toLowerCase()}-u${String(i + 1).padStart(2, '0')}`, level, title, available: false }));

/** 전체 A1~B2 커리큘럼. 작성이 끝난 단원은 available, 아직 쓰는 중인 단원은 '준비 중'. */
const PLANNED: Record<'B1' | 'B2', string[]> = {
  B1: ['현재완료', '수동태', '관계대명사', '조건문', '가정법 기초', '복합 문장: 간접의문문과 명사절', '경험과 의견 표현'],
  B2: ['가정법 심화', '분사구문', '복잡한 관계절', '조동사 + have p.p.', '논리 연결어', '간접화법과 의견문 영작'],
};
export const CURRICULUM: CurriculumUnitOutline[] = [
  ...GRAMMAR_UNITS.map((u) => ({ id: u.id, level: u.level, title: u.title, available: true })),
  ...(['B1', 'B2'] as const).flatMap((lv) => outline(lv, PLANNED[lv]).filter((o) => !GRAMMAR_BY_ID[o.id])),
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
  myword: '나만의 단어장',
  'book-A1': 'A1 동화책', 'book-A2': 'A2 동화책', 'book-B1': 'B1 동화책', 'book-B2': 'B2 동화책', 'book-C1': 'C1 동화책',
  'level-V': '레벨 테스트 · 영단어', 'level-G': '레벨 테스트 · 문법', 'level-E': '레벨 테스트 · 표현', 'level-R': '레벨 테스트 · 독해',
};
