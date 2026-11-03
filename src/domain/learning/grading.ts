import type { Question } from '../types';

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'cannot'],
  [/\bcan not\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\bi'm\b/g, 'i am'],
  [/\b(you|we|they)'re\b/g, '$1 are'],
  [/\b(he|she|it|that|what|who|where|there|here)'s\b/g, '$1 is'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'],
  [/\b(i|you|he|she|we|they)'ll\b/g, '$1 will'],
  [/\blet's\b/g, 'let us'],
];

/**
 * 채점용 정규화: 대소문자, 앞뒤 공백, 연속 공백, 곡선 따옴표, 문장 끝 구두점, 쉼표를 무시하고
 * 축약형(I'm ↔ I am, don't ↔ do not)을 같은 형태로 맞춘다.
 */
export function normalizeAnswer(s: string): string {
  let x = s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.,!?;:"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, rep] of CONTRACTIONS) x = x.replace(re, rep);
  return x.replace(/\s+/g, ' ').trim();
}

export function gradeAnswer(q: Question, given: string): boolean {
  if (!given || !given.trim()) return false;
  if (q.type === 'mc' || q.type === 'translate') {
    // 객관식은 선택지 문자열 그대로 비교 (정규화 후)
    return q.answers.some((a) => normalizeAnswer(a) === normalizeAnswer(given));
  }
  const g = normalizeAnswer(given);
  return q.answers.some((a) => normalizeAnswer(a) === g);
}

/** 단어 배열 문제: 선택한 조각 배열을 문장으로 합쳐 채점 */
export function gradeOrder(q: Question, picked: string[]): boolean {
  return gradeAnswer(q, picked.join(' '));
}

export function shuffle<T>(arr: T[], seed = Date.now()): T[] {
  const a = arr.slice();
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
