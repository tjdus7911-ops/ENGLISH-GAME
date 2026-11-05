/**
 * 나만의 단어장 — 영단어·표현·동화책·문법 예문에서 저장한 단어를 하나로 관리.
 * - 키: 소문자 원형(lemma). 같은 단어는 출처가 달라도 하나로 합치고 출처만 추가한다.
 * - 복습: 기존 SRS(0·1·3·7·14·30일) 를 그대로 사용 (applyReviewResult).
 */
import { applyReviewResult, INTERVALS } from './srs';
import { diffDays, addDays } from '../date';
import type { ReviewItem } from '../types';

export type WordSource = 'words' | 'expression' | 'book' | 'grammar';
export const SOURCE_LABEL: Record<WordSource, string> = { words: '자유학습 영단어', expression: '표현학습관', book: '영어 동화책', grammar: '문법 예문' };
export type MyWordStatus = 'new' | 'learning' | 'review' | 'memorized';
export const STATUS_LABEL: Record<MyWordStatus, string> = { new: '새로 저장', learning: '학습 중', review: '복습 필요', memorized: '암기 완료' };

export interface MyWord {
  key: string;
  word: string;
  meaning: string;
  pos: string;
  level: string;
  vocabId?: string;
  sources: WordSource[];
  /** 저장한 곳(책 id·표현 id·문법 단원 id 등) */
  refs: string[];
  /** 저장한 문장 (예문) */
  context?: string;
  savedOn: string;
  savedAt: number;
  memorizedOn: string | null;
  srs: ReviewItem;
}

export interface SaveInput { key: string; word: string; meaning: string; pos: string; level: string; vocabId?: string }

export function saveMyWord(map: Record<string, MyWord>, e: SaveInput, source: WordSource, ref: string | undefined, context: string | undefined, today: string, at: number): { map: Record<string, MyWord>; created: boolean } {
  const cur = map[e.key];
  if (cur) {
    const sources = cur.sources.includes(source) ? cur.sources : [...cur.sources, source];
    const refs = ref && !cur.refs.includes(ref) ? [...cur.refs, ref] : cur.refs;
    if (sources === cur.sources && refs === cur.refs) return { map, created: false };
    return { map: { ...map, [e.key]: { ...cur, sources, refs, vocabId: cur.vocabId ?? e.vocabId } }, created: false };
  }
  const srs: ReviewItem = { key: `myword:${e.key}`, kind: 'word', refId: e.key, conceptId: 'myword', stage: 0, due: addDays(today, INTERVALS[0]), createdOn: today, correct: 0, wrong: 0, lapses: 0, difficult: false, history: [] };
  const w: MyWord = { ...e, sources: [source], refs: ref ? [ref] : [], context, savedOn: today, savedAt: at, memorizedOn: null, srs };
  return { map: { ...map, [e.key]: w }, created: true };
}

export function myWordStatus(w: MyWord, today: string): MyWordStatus {
  if (w.memorizedOn || w.srs.stage >= 4) return 'memorized';
  if (w.srs.history.length === 0) return 'new';
  if (diffDays(w.srs.due, today) >= 0) return 'review';
  return 'learning';
}

/** 복습 퀴즈 대상: 새 단어 + 복습 필요 (암기 완료 제외). 반복 오답(difficult) → 밀린 순 → 낮은 단계 */
export function reviewQueue(map: Record<string, MyWord>, today: string, size = 10): MyWord[] {
  const cand = Object.values(map).filter((w) => { const st = myWordStatus(w, today); return st === 'new' || st === 'review'; });
  cand.sort((a, b) => (a.srs.difficult !== b.srs.difficult ? (a.srs.difficult ? -1 : 1) : diffDays(b.srs.due, today) - diffDays(a.srs.due, today) || a.srs.stage - b.srs.stage || a.savedAt - b.savedAt));
  return cand.slice(0, size);
}

/** 퀴즈 결과 반영. 같은 단어가 여러 번 나오면 정답률로 계산. 반복 오답 단어는 difficult → 다음 큐 맨 앞 */
export function applyMyWordResults(map: Record<string, MyWord>, results: { key: string; correct: boolean }[], today: string): Record<string, MyWord> {
  const by: Record<string, boolean[]> = {};
  for (const r of results) (by[r.key] ??= []).push(r.correct);
  const next = { ...map };
  for (const [k, oks] of Object.entries(by)) {
    const w = next[k];
    if (!w) continue;
    const acc = oks.filter(Boolean).length / oks.length;
    const srs = applyReviewResult(w.srs, acc, today);
    next[k] = { ...w, srs, memorizedOn: acc < 0.5 ? null : w.memorizedOn };
  }
  return next;
}
