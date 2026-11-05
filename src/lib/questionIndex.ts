import type { Question } from '@/domain/types';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { DIALOGUES } from '@/content/dialogues';
import { READINGS, LEVEL_TEST } from '@/content/reading-leveltest';
import { EXPRESSIONS, SITUATIONS, DRAMAS } from '@/content/expressions';
import { VOCAB } from '@/content/vocab';
import { orderFromSentence, wordBlankQ, wordInContextQ, wordListenQ, wordMeaningQ, wordReverseQ } from './questions';
import { SPEAKING } from '@/content/dialogues';
import { LEVEL_BANK } from '@/content/level-bank';
import { allBookQuestions, myWordQuestion } from './libraryQuiz';
import { lookup } from './lexicon';

let idx: Record<string, Question> | null = null;
export function questionById(id: string): Question | undefined {
  if (!idx) {
    const all: Question[] = [
      ...GRAMMAR_UNITS.flatMap((u) => [...u.practice, ...u.writing, ...u.unitTest]),
      ...DIALOGUES.flatMap((d) => [...d.questions.map((q) => ({ ...q, audio: d.audio })), ...d.dictation]),
      ...SITUATIONS.flatMap((d) => [...d.questions.map((q) => ({ ...q, audio: d.audio })), ...d.dictation]),
      ...READINGS.flatMap((r) => r.questions), ...LEVEL_TEST, ...LEVEL_BANK, ...allBookQuestions(),
      ...EXPRESSIONS.flatMap((e) => [e.listening, e.writing]), ...DRAMAS.flatMap((d) => d.questions),
      ...SPEAKING.map((sp) => orderFromSentence(`rv-${sp.id}`, sp.en, sp.ko, sp.grammarId)),
      ...VOCAB.flatMap((v) => [wordMeaningQ(v), wordReverseQ(v), wordBlankQ(v), wordListenQ(v), wordInContextQ(v)].filter((q): q is Question => !!q)),
    ];
    idx = Object.fromEntries(all.map((q) => [q.id, q]));
  }
  if (!idx[id] && id.startsWith('mw:')) { const e = lookup(id.slice(3)); if (e) return myWordQuestion(e); }
  return idx[id];
}
