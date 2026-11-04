import { test, expect } from 'vitest';
import { VOCAB } from '@/content/vocab';
import { allChapters, classificationReport, levelWords, progressOf, topicWords, ALL_TOPICS, nextChapter, chapterById } from '@/lib/wordbook';

test('분류: 300단어 모두 하나 이상의 주제에 포함, 잘못된 id 없음', () => {
  expect(VOCAB.length).toBe(300);
  expect(classificationReport()).toEqual({ untagged: [], unknown: [], unknownPreA1: [] });
});
test('챕터: 모든 단어가 최소 하나의 챕터로 접근 가능, 챕터는 1~5단어', () => {
  const inCh = new Set(allChapters().flatMap((c) => c.words.map((w) => w.id)));
  expect(VOCAB.filter((v) => !inCh.has(v.id))).toEqual([]);
  for (const c of allChapters()) { expect(new Set(c.words.map((w) => w.id)).size).toBe(c.words.length); expect(c.words.length).toBeGreaterThan(0); expect(c.words.length).toBeLessThanOrEqual(5); expect(chapterById(c.id)).toBe(c); }
  expect(levelWords('pre-a1').length + levelWords('a1').length).toBe(300);
  expect(levelWords('a2').length).toBe(0);
});
test('진행률: 같은 단어 학습 기록은 모든 주제에 통합 반영', () => {
  const learned = { water: '2026-11-04' }; // water: 음식 + 자연
  expect(progressOf(topicWords('food'), learned).learned).toBe(1);
  expect(progressOf(topicWords('nature'), learned).learned).toBe(1);
  expect(progressOf([], learned).state).toBe('empty');
  const first = nextChapter({})!;
  expect(first.level).toBe('pre-a1');
  const half = Object.fromEntries(first.words.slice(0, 2).map((w) => [w.id, 'd']));
  expect(nextChapter(half)!.id).toBe(first.id); // 진행 중 챕터 이어하기
});
test('분포 출력', () => {
  const rows = ALL_TOPICS.map((t) => { const ws = topicWords(t.id); return `${t.label}: ${ws.length} (왕초보 ${ws.filter((w) => levelWords('pre-a1').includes(w)).length})`; });
  console.log(rows.join('\n'), '\n왕초보', levelWords('pre-a1').length, '기초', levelWords('a1').length, '챕터', allChapters().length);
});
