import type { Question } from '@/domain/types';
import { BOOKS, type Book } from '@/content/library';
import { lookup, type LexEntry } from './lexicon';
import { COMMON_LEXICON } from '@/content/common-lexicon';
import { VOCAB } from '@/content/vocab';

/** 동화책 이해도 문항 → 앱 공통 문제 형식 (오답 노트·다시 풀기와 호환) */
export const bookQuestions = (b: Book): Question[] => b.quiz.map((q) => ({
  id: q.id, type: 'mc', prompt: `「${b.titleKo}」 이해도 확인`, sentence: q.q, choices: q.choices, answers: [q.choices[q.answer]], explanation: q.explain, conceptId: `book-${b.level}`,
}));
export const allBookQuestions = () => BOOKS.flatMap(bookQuestions);

function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

/** 뜻 고르기 문항 (나만의 단어장 복습). 오답 보기는 같은 품사의 다른 단어 뜻에서 결정적으로 고른다. */
let POOL: { meaning: string; pos: string }[] | null = null;
function pool() {
  if (!POOL) {
    const set = new Map<string, { meaning: string; pos: string }>();
    for (const v of VOCAB) { const e = lookup(v.word); if (e) set.set(e.meaning, { meaning: e.meaning, pos: e.pos }); }
    for (const b of BOOKS) for (const w of b.words) { const e = lookup(w.word); if (e) set.set(e.meaning, { meaning: e.meaning, pos: e.pos }); }
    for (const [w] of COMMON_LEXICON) { const e = lookup(w); if (e && !e.proper) set.set(e.meaning, { meaning: e.meaning, pos: e.pos }); }
    POOL = [...set.values()];
  }
  return POOL;
}

export function myWordQuestion(e: Pick<LexEntry, 'key' | 'word' | 'meaning' | 'pos'>, salt = ''): Question {
  const same = pool().filter((p) => p.meaning !== e.meaning && p.pos === e.pos);
  const others = (same.length >= 3 ? same : pool().filter((p) => p.meaning !== e.meaning));
  const h = hash(e.key + salt);
  const picks: string[] = [];
  for (let i = 0; picks.length < 3 && i < others.length * 2; i++) { const m = others[(h + i * 7919) % others.length].meaning; if (!picks.includes(m)) picks.push(m); }
  const choices = [...picks];
  choices.splice(h % 4, 0, e.meaning);
  return { id: `mw:${e.key}`, type: 'mc', prompt: '알맞은 뜻을 고르세요', sentence: e.word, choices, answers: [e.meaning], explanation: `${e.word} (${e.pos}) = ${e.meaning}`, conceptId: 'myword' };
}
