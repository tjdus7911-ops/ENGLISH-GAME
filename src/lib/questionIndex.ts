import type { Question } from '@/domain/types';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { DIALOGUES } from '@/content/dialogues';
import { READINGS, LEVEL_TEST } from '@/content/reading-leveltest';
import { EXPRESSIONS, SITUATIONS, DRAMAS } from '@/content/expressions';
import { VOCAB } from '@/content/vocab';
import { wordBlankQ, wordMeaningQ, wordReverseQ } from './questions';

let idx: Record<string, Question> | null = null;
export function questionById(id: string): Question | undefined {
  if (!idx) {
    const all: Question[] = [
      ...GRAMMAR_UNITS.flatMap((u) => [...u.practice, ...u.writing, ...u.unitTest]),
      ...DIALOGUES.flatMap((d) => [...d.questions.map((q) => ({ ...q, audio: d.audio })), ...d.dictation]),
      ...SITUATIONS.flatMap((d) => [...d.questions.map((q) => ({ ...q, audio: d.audio })), ...d.dictation]),
      ...READINGS.flatMap((r) => r.questions), ...LEVEL_TEST,
      ...EXPRESSIONS.flatMap((e) => [e.listening, e.writing]), ...DRAMAS.flatMap((d) => d.questions),
      ...VOCAB.flatMap((v) => [wordMeaningQ(v), wordReverseQ(v), wordBlankQ(v)].filter((q): q is Question => !!q)),
    ];
    idx = Object.fromEntries(all.map((q) => [q.id, q]));
  }
  return idx[id];
}
