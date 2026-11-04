/**
 * 단어장(주제·난이도) 구성: 기존 VOCAB(300) + vocab-topics 태그 → 챕터(5단어)
 * 챕터는 (주제 × 난이도) 단위로 5개씩 끊는다. 같은 단어가 여러 주제 챕터에 있을 수 있고,
 * 진도는 단어 id 기준(learning.learnedWords)으로 통합 계산된다.
 */
import type { Vocabulary } from '@/domain/types';
import { VOCAB, VOCAB_BY_ID } from '@/content/vocab';
import { CHAPTER_SIZE, CORE_TOPIC, LEVELS, PRE_A1, TOPICS, TOPIC_WORDS, type TopicId, type WordLevel } from '@/content/vocab-topics';

export const wordLevel = (v: Vocabulary): WordLevel => (PRE_A1.has(v.id) ? 'pre-a1' : 'a1');
export const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.id, l])) as Record<WordLevel, (typeof LEVELS)[number]>;
export const ALL_TOPICS = [...TOPICS, CORE_TOPIC];
export const TOPIC_BY_ID = Object.fromEntries(ALL_TOPICS.map((t) => [t.id, t])) as Record<TopicId, (typeof ALL_TOPICS)[number]>;

export interface Chapter { id: string; topic: TopicId; level: WordLevel; index: number; words: Vocabulary[] }

const LEVEL_ORDER: WordLevel[] = ['pre-a1', 'a1', 'a2', 'b1', 'b2'];

export const topicWords = (t: TopicId): Vocabulary[] =>
  [...new Set(TOPIC_WORDS[t])].map((id) => VOCAB_BY_ID[id]).filter(Boolean).sort((a, b) => LEVEL_ORDER.indexOf(wordLevel(a)) - LEVEL_ORDER.indexOf(wordLevel(b)));

let cache: Chapter[] | null = null;
export function allChapters(): Chapter[] {
  if (cache) return cache;
  const out: Chapter[] = [];
  for (const t of ALL_TOPICS) {
    for (const lv of LEVEL_ORDER) {
      const ws = topicWords(t.id).filter((w) => wordLevel(w) === lv);
      for (let i = 0; i < ws.length; i += CHAPTER_SIZE) out.push({ id: `${t.id}-${lv}-${i / CHAPTER_SIZE + 1}`, topic: t.id, level: lv, index: i / CHAPTER_SIZE + 1, words: ws.slice(i, i + CHAPTER_SIZE) });
    }
  }
  return (cache = out);
}
export const chapterById = (id: string) => allChapters().find((c) => c.id === id);
export const chaptersOf = (f: { topic?: TopicId; level?: WordLevel }) => allChapters().filter((c) => (!f.topic || c.topic === f.topic) && (!f.level || c.level === f.level));

export interface Progress { total: number; learned: number; pct: number; state: 'empty' | 'new' | 'progress' | 'done' }
export function progressOf(words: Vocabulary[], learned: Record<string, string>): Progress {
  const uniq = [...new Map(words.map((w) => [w.id, w])).values()];
  const total = uniq.length;
  const n = uniq.filter((w) => learned[w.id]).length;
  return { total, learned: n, pct: total ? Math.round((n / total) * 100) : 0, state: total === 0 ? 'empty' : n === 0 ? 'new' : n >= total ? 'done' : 'progress' };
}
export const levelWords = (lv: WordLevel) => VOCAB.filter((v) => wordLevel(v) === lv);

/** 이어서 학습: 진행 중 챕터 우선 → 첫 미완료 챕터 (주제 순서, 왕초보 먼저) */
export function nextChapter(learned: Record<string, string>): Chapter | undefined {
  const chs = [...allChapters()].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  return chs.find((c) => progressOf(c.words, learned).state === 'progress') ?? chs.find((c) => progressOf(c.words, learned).state !== 'done');
}

/** 분류 검증용: 주제에 없는 단어 · 존재하지 않는 id */
export function classificationReport() {
  const tagged = new Set(Object.values(TOPIC_WORDS).flat());
  return {
    untagged: VOCAB.filter((v) => !tagged.has(v.id)).map((v) => v.id),
    unknown: [...tagged].filter((id) => !VOCAB_BY_ID[id]),
    unknownPreA1: [...PRE_A1].filter((id) => !VOCAB_BY_ID[id]),
  };
}
