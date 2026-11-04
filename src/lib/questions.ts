import type { Question, ReviewItem, Vocabulary } from '@/domain/types';
import { shuffle } from '@/domain/learning/grading';
import { VOCAB, VOCAB_BY_ID, vocabForUnit } from '@/content/vocab';
import { GRAMMAR_BY_ID } from '@/content/grammar';
import { DIALOGUE_BY_ID, SPEAKING_BY_ID } from '@/content/dialogues';
import { READING_BY_ID } from '@/content/reading-leveltest';
import { EXPRESSION_BY_ID, SITUATION_BY_ID, DRAMA_BY_ID } from '@/content/expressions';

function hashSeed(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

/** 오답 보기 3개: 같은 품사 우선, 모자라면 다른 품사로 채움 (예: 조동사 can 은 같은 품사 단어가 없어 보기가 1개뿐이던 문제) */
function distractors(v: Vocabulary, distinct: (x: Vocabulary) => boolean, seed: number, samePos = true) {
  const pool = VOCAB.filter((x) => x.id !== v.id && distinct(x));
  const same = shuffle(pool.filter((x) => !samePos || x.pos === v.pos), seed).slice(0, 3);
  if (same.length >= 3) return same;
  const rest = shuffle(pool.filter((x) => !same.includes(x)), seed + 11);
  const out = [...same];
  for (const x of rest) { if (out.length >= 3) break; if (!out.some((o) => !distinct(o) || o.meaning === x.meaning || o.word === x.word)) out.push(x); }
  return out;
}

/** 단어 뜻 맞히기 (객관식) */
export function wordMeaningQ(v: Vocabulary, seed = 1): Question {
  const others = distractors(v, (x) => x.meaning !== v.meaning, hashSeed(v.id) + seed);
  const choices = shuffle([v.meaning, ...others.map((o) => o.meaning)], hashSeed(v.id + 'c') + seed);
  return { id: `wq-${v.id}`, type: 'mc', prompt: '단어의 뜻을 고르세요.', sentence: v.word, choices, answers: [v.meaning], explanation: `${v.word} (${v.pos}) = ${v.meaning}`, conceptId: v.grammarId, audio: v.audio };
}

/** 예문 빈칸 채우기 (단어 입력) */
export function wordBlankQ(v: Vocabulary): Question | null {
  const re = new RegExp(`\\b${v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (!re.test(v.example)) return null;
  return { id: `wb-${v.id}`, type: 'blank', prompt: `빈칸에 알맞은 단어를 쓰세요. (${v.meaning})`, sentence: v.example.replace(re, '___'), answers: [v.word], explanation: `${v.example} — ${v.exampleKo}`, conceptId: v.grammarId, hint: v.word[0] + '…' };
}

/** 영어 → 뜻 / 뜻 → 영어 */
export function wordReverseQ(v: Vocabulary, seed = 1): Question {
  const others = distractors(v, (x) => x.word !== v.word, hashSeed(v.id) + seed + 3);
  const choices = shuffle([v.word, ...others.map((o) => o.word)], hashSeed(v.id + 'r') + seed);
  return { id: `wr-${v.id}`, type: 'mc', prompt: '뜻에 맞는 영어 단어를 고르세요.', sentence: v.meaning, choices, answers: [v.word], explanation: `${v.meaning} = ${v.word}`, conceptId: v.grammarId };
}

/** 듣고 단어 선택하기 */
export function wordListenQ(v: Vocabulary, seed = 1): Question {
  const others = shuffle(VOCAB.filter((x) => x.id !== v.id && x.word !== v.word && x.word.length > 2), hashSeed(v.id) + seed + 7).slice(0, 3);
  const choices = shuffle([v.word, ...others.map((o) => o.word)], hashSeed(v.id + 'l') + seed);
  return { id: `wl-${v.id}`, type: 'mc', prompt: '잘 듣고 들린 단어를 고르세요.', choices, answers: [v.word], explanation: `들린 단어: ${v.word} (${v.meaning})`, conceptId: v.grammarId, audio: v.audio };
}

/** 문장 속 의미 이해: 예문을 보고 단어의 뜻 고르기 */
export function wordInContextQ(v: Vocabulary, seed = 1): Question {
  const q = wordMeaningQ(v, seed);
  return { ...q, id: `wc-${v.id}`, prompt: `문장 속 "${v.word}"의 뜻을 고르세요.`, sentence: v.example, explanation: `${v.example} — ${v.exampleKo}` };
}

/** 뜻 맞히기 · 영어 단어 맞히기 · 빈칸 · 문장 속 의미 · 듣고 고르기 순환 */
export function wordQuiz(words: Vocabulary[], seed = Date.now()): Question[] {
  return words.map((w, i) => {
    switch (i % 5) {
      case 0: return wordMeaningQ(w, seed);
      case 1: return wordReverseQ(w, seed);
      case 2: return wordBlankQ(w) ?? wordInContextQ(w, seed);
      case 3: return wordListenQ(w, seed);
      default: return wordInContextQ(w, seed);
    }
  });
}

/** 문장 → 단어 배열 문제 */
export function orderFromSentence(id: string, en: string, ko: string, conceptId: string): Question {
  const tokens = en.replace(/[.?!]$/, '').split(' ');
  return { id, type: 'order', prompt: `단어를 바르게 배열하세요. "${ko}"`, tokens, answers: [en], explanation: `${en} — ${ko}`, conceptId };
}

/**
 * 복습 항목 → 복습 문제 1개. 단계(stage)와 복습 횟수에 따라 유형을 바꿔 같은 문제 반복을 줄인다.
 * (뜻 맞히기 → 빈칸 → 배열 → 해석 → 영작 …)
 */
export function reviewQuestion(item: ReviewItem): Question | null {
  const turn = item.stage + item.history.length;
  switch (item.kind) {
    case 'word': {
      const v = VOCAB_BY_ID[item.refId];
      if (!v) return null;
      const t = turn % 3;
      if (t === 0) return wordMeaningQ(v, turn);
      if (t === 1) return wordBlankQ(v) ?? wordReverseQ(v, turn);
      return turn % 2 ? wordListenQ(v, turn) : wordReverseQ(v, turn);
    }
    case 'grammar': {
      const u = GRAMMAR_BY_ID[item.refId];
      if (!u) return null;
      const pool = [...u.practice, ...u.unitTest, ...u.writing];
      return pool[(turn * 7 + hashSeed(item.key)) % pool.length];
    }
    case 'dialogue': {
      const d = DIALOGUE_BY_ID[item.refId] ?? SITUATION_BY_ID[item.refId];
      if (d) {
        const pool = [...d.questions.map((q) => ({ ...q, audio: d.audio })), ...d.dictation];
        return pool[turn % pool.length];
      }
      const dr = DRAMA_BY_ID[item.refId];
      if (dr) return dr.questions[turn % dr.questions.length];
      return null;
    }
    case 'speaking': {
      const s = SPEAKING_BY_ID[item.refId];
      if (!s) return null;
      return { ...orderFromSentence(`rv-${s.id}`, s.en, s.ko, s.grammarId), audio: s.audio, prompt: `잘 듣고 순서대로 배열하세요. "${s.ko}"` };
    }
    case 'reading': {
      const r = READING_BY_ID[item.refId];
      return r ? r.questions[turn % r.questions.length] : null;
    }
    case 'expression': {
      const e = EXPRESSION_BY_ID[item.refId];
      if (!e) return null;
      return turn % 2 === 0 ? e.listening : e.writing;
    }
  }
  return null;
}

/** 오늘 학습 단원의 새 단어 */
export function nextNewWords(unitId: string, learned: Record<string, string>, n: number): Vocabulary[] {
  return vocabForUnit(unitId).filter((v) => !learned[v.id]).slice(0, n);
}

/** 발견 퀴즈: 오늘 학습한 개념/단어로 3문제 */
export function discoveryQuestions(todayConcepts: string[], todayWords: string[], seed: number): Question[] {
  const qs: Question[] = [];
  const words = todayWords.map((w) => VOCAB_BY_ID[w]).filter(Boolean);
  const grammarPool = todayConcepts.map((c) => GRAMMAR_BY_ID[c]).filter(Boolean).flatMap((u) => u.practice.filter((q) => q.type === 'mc' || q.type === 'translate'));
  const g = shuffle(grammarPool, seed);
  const w = shuffle(words, seed + 1);
  while (qs.length < 3 && (g.length || w.length)) {
    if (g.length && (qs.length % 2 === 0 || !w.length)) qs.push(g.shift()!);
    else if (w.length) qs.push(wordMeaningQ(w.shift()!, seed));
  }
  // 오늘 학습 내용이 부족하면 오늘 개념이 속한 단원 단어로 보충
  if (qs.length < 3) {
    const extra = shuffle(todayConcepts.flatMap((c) => vocabForUnit(c)), seed + 2);
    while (qs.length < 3 && extra.length) qs.push(wordMeaningQ(extra.shift()!, seed));
  }
  return qs.slice(0, 3);
}
