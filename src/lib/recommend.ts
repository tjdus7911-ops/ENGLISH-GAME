/**
 * 개인 맞춤 추천: 사용자 학습 레벨 중심 + 다음 레벨 일부 (예: A2 → A2 위주, B1 1개).
 * - 날짜를 씨앗으로 매일 같은 추천을 고정(새로고침으로 바뀌지 않음), 이미 학습한 항목은 제외.
 * - 해당 레벨 콘텐츠가 아직 없으면 가장 가까운 아래 레벨로 대체하고 그 사실을 note 로 알린다(지어내지 않음).
 */
import type { AppState } from '@/store/app';
import { BOOKS, type Book } from '@/content/library';
import { EXPRESSIONS, type Expression } from '@/content/expressions';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { VOCAB } from '@/content/vocab';
import { COMMON_LEXICON } from '@/content/common-lexicon';
import { lookup, normKey, type LexEntry } from './lexicon';
import { myWordStatus, reviewQueue } from '@/domain/learning/mywords';
import { dueItems } from '@/domain/learning/srs';
import type { GrammarUnit } from '@/domain/types';

export const REC_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type RecLevel = (typeof REC_LEVELS)[number];
export const LEVEL_KO: Record<RecLevel, string> = { A1: '왕초보', A2: '초급', B1: '중급', B2: '중상급', C1: '고급' };

export const userLevel = (s: Pick<AppState, 'profile'>): RecLevel => {
  const l = s.profile.levelTest.level as RecLevel | null;
  return l && REC_LEVELS.includes(l) ? l : 'A1';
};
export const nextLevel = (l: RecLevel): RecLevel | null => REC_LEVELS[REC_LEVELS.indexOf(l) + 1] ?? null;

function seeded(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function pick<T>(arr: T[], n: number, rnd: () => number): T[] { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }

/** 레벨 l 부터 아래로 내려가며 비어 있지 않은 풀을 찾는다 */
function withFallback<T>(level: RecLevel, poolOf: (l: RecLevel) => T[]): { items: T[]; used: RecLevel } {
  for (let i = REC_LEVELS.indexOf(level); i >= 0; i--) { const p = poolOf(REC_LEVELS[i]); if (p.length) return { items: p, used: REC_LEVELS[i] }; }
  return { items: [], used: level };
}

let WORDS_BY_LEVEL: Record<string, LexEntry[]> | null = null;
function wordsByLevel() {
  if (WORDS_BY_LEVEL) return WORDS_BY_LEVEL;
  const m: Record<string, LexEntry[]> = {};
  const seen = new Set<string>();
  const add = (e: LexEntry | null) => { if (!e || e.proper || seen.has(e.key)) return; seen.add(e.key); const l = e.level === 'Pre-A1' ? 'A1' : e.level; (m[l] ??= []).push(e); };
  for (const v of VOCAB) add(lookup(v.word));
  for (const b of BOOKS) for (const w of b.words) add(lookup(w.word));
  for (const [w, , pos] of COMMON_LEXICON) if (pos !== '한' && pos !== '대' && pos !== '수' && pos !== '전' && pos !== '접') add(lookup(w));
  WORDS_BY_LEVEL = m;
  return m;
}

export interface Recommendation {
  level: RecLevel;
  words: { entry: LexEntry; level: string; stretch: boolean }[];
  grammar: { unit: GrammarUnit; note: string | null } | null;
  expressions: { e: Expression; stretch: boolean }[];
  books: { b: Book; stretch: boolean }[];
  review: { myWords: number; lessons: number };
  notes: string[];
}

export function recommend(s: AppState, date: string): Recommendation {
  const level = userLevel(s);
  const nxt = nextLevel(level);
  const rnd = seeded(`${date}:${level}`);
  const l = s.learning;
  const myKeys = new Set(Object.keys(l.myWords ?? {}));
  const learnedWords = new Set(Object.keys(l.learnedWords).map((id) => VOCAB.find((v) => v.id === id)?.word).filter(Boolean).map((w) => normKey(w!)));
  const notes: string[] = [];

  // 영단어: 내 레벨 4 + 다음 레벨 1
  const wpool = (lv: RecLevel) => (wordsByLevel()[lv] ?? []).filter((e) => !myKeys.has(e.key) && !learnedWords.has(e.key));
  const wMain = withFallback(level, wpool);
  if (wMain.used !== level) notes.push(`${level} 단어가 부족해 ${wMain.used} 단어로 대체했어요.`);
  const words = pick(wMain.items, 4, rnd).map((e) => ({ entry: e, level: wMain.used, stretch: false }));
  if (nxt) { const p = wpool(nxt); words.push(...pick(p, 1, rnd).map((e) => ({ entry: e, level: nxt, stretch: true }))); }

  // 문법: 내 레벨의 아직 끝내지 않은 강의 (없으면 아래 레벨, C1 은 B2 까지)
  const gpool = (lv: RecLevel) => GRAMMAR_UNITS.filter((u) => u.level === lv && !l.steps[`${u.id}:practice`]);
  const gMain = withFallback(level, gpool);
  const grammar = gMain.items[0] ? { unit: gMain.items[0], note: gMain.used !== level ? `${level} 문법 강의가 아직 없거나 모두 끝내서 ${gMain.used} 강의를 추천해요.` : null } : null;

  // 표현: 내 레벨 2 + 다음 레벨 1 (C1 표현은 아직 없음 → B2)
  const epool = (lv: RecLevel) => EXPRESSIONS.filter((e) => e.level === lv && !l.expressionsDone[e.id]);
  const eMain = withFallback(level, epool);
  if (eMain.used !== level) notes.push(`${level} 표현이 아직 없어 ${eMain.used} 표현을 추천해요.`);
  const expressions = pick(eMain.items, 2, rnd).map((e) => ({ e, stretch: false }));
  if (nxt) expressions.push(...pick(epool(nxt), 1, rnd).map((e) => ({ e, stretch: true })));

  // 동화책: 내 레벨 1~2 + 다음 레벨 1
  const bpool = (lv: RecLevel) => BOOKS.filter((b) => b.level === lv && !(l.books?.[b.id]?.quiz?.passed && l.books?.[b.id]?.readOn));
  const bMain = withFallback(level, bpool);
  const books = pick(bMain.items, 2, rnd).map((b) => ({ b, stretch: false }));
  if (nxt) books.push(...pick(bpool(nxt), 1, rnd).map((b) => ({ b, stretch: true })));

  const review = { myWords: reviewQueue(l.myWords ?? {}, date, 999).filter((w) => myWordStatus(w, date) === 'review').length, lessons: dueItems(l.reviews, date).length };
  return { level, words, grammar, expressions, books, review, notes };
}
