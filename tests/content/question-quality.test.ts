import { test, expect } from 'vitest';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { DIALOGUES } from '@/content/dialogues';
import { READINGS, LEVEL_TEST } from '@/content/reading-leveltest';
import { EXPRESSIONS, SITUATIONS, DRAMAS } from '@/content/expressions';
import { VOCAB } from '@/content/vocab';
import { wordBlankQ, wordInContextQ, wordListenQ, wordMeaningQ, wordReverseQ } from '@/lib/questions';
import type { Question } from '@/domain/types';
test('모든 문제: 해설·보기 품질 (정답 포함·중복 없음·보기 3개 이상)', () => {
  const all: [string, Question][] = [
    ...GRAMMAR_UNITS.flatMap((u) => [...u.practice, ...u.writing, ...u.unitTest].map((q) => [`grammar:${u.id}`, q] as [string, Question])),
    ...DIALOGUES.flatMap((d) => [...d.questions, ...d.dictation].map((q) => ['dialogue', q] as [string, Question])),
    ...SITUATIONS.flatMap((d) => [...d.questions, ...d.dictation].map((q) => ['situation', q] as [string, Question])),
    ...READINGS.flatMap((r) => r.questions.map((q) => ['reading', q] as [string, Question])), ...LEVEL_TEST.map((q) => ['level', q] as [string, Question]),
    ...EXPRESSIONS.flatMap((e) => [e.listening, e.writing].map((q) => ['expr', q] as [string, Question])), ...DRAMAS.flatMap((d) => d.questions.map((q) => ['drama', q] as [string, Question])),
    ...VOCAB.flatMap((v) => [wordMeaningQ(v), wordReverseQ(v), wordBlankQ(v), wordListenQ(v), wordInContextQ(v)].filter((q): q is Question => !!q).map((q) => ['vocab', q] as [string, Question])),
  ];
  const issues: Record<string, string[]> = {};
  const add = (k: string, s: string) => { (issues[k] ||= []).push(s); };
  for (const [src, q] of all) {
    const ex = (q.explanation ?? '').trim();
    if (!ex) add('no-explanation', `${src} ${q.id}`);
    else if (ex.length < 6) add('short-explanation', `${src} ${q.id}: ${ex}`);
    if (q.choices) {
      if (!q.answers.some((a) => q.choices!.includes(a))) add('answer-not-in-choices', `${src} ${q.id}`);
      if (new Set(q.choices).size !== q.choices.length) add('dup-choices', `${src} ${q.id}`);
      if (q.choices.filter((c) => q.answers.includes(c)).length > 1) add('multi-correct-choices', `${src} ${q.id}`);
      if (q.choices.length < 3) add('few-choices', `${src} ${q.id} (${q.choices.length})`);
    }
    if (!q.prompt?.trim()) add('no-prompt', `${src} ${q.id}`);
  }
  expect(all.length).toBeGreaterThan(2000);
  expect(issues).toEqual({});
});
