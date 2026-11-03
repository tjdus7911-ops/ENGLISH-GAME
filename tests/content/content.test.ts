import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  audioRegistry, CHARACTERS, CURRICULUM, DIALOGUES, DRAMAS, EXPRESSIONS, GRAMMAR_BY_ID, GRAMMAR_UNITS, LEVEL_TEST, READINGS, SITUATIONS, SPEAKING, VOCAB,
} from '@/content';
import { gradeAnswer, gradeOrder } from '@/domain/learning/grading';
import type { Question } from '@/domain/types';

const allQuestions: Question[] = [
  ...GRAMMAR_UNITS.flatMap((u) => [...u.practice, ...u.writing, ...u.unitTest]),
  ...DIALOGUES.flatMap((d) => [...d.questions, ...d.dictation]),
  ...SITUATIONS.flatMap((d) => [...d.questions, ...d.dictation]),
  ...READINGS.flatMap((r) => r.questions),
  ...LEVEL_TEST,
  ...EXPRESSIONS.flatMap((e) => [e.listening, e.writing]),
  ...DRAMAS.flatMap((d) => d.questions),
];

function validateQuestion(q: Question) {
  expect(q.explanation.trim().length, `${q.id} 해설`).toBeGreaterThan(0);
  expect(q.answers.length, `${q.id} 정답`).toBeGreaterThan(0);
  if (q.type === 'mc' || q.type === 'translate') {
    expect(q.choices && q.choices.length >= 2, `${q.id} 선택지`).toBe(true);
    expect(new Set(q.choices).size, `${q.id} 선택지 중복`).toBe(q.choices!.length);
    expect(q.choices, `${q.id} 정답이 선택지에 있음`).toContain(q.answers[0]);
    // 정답 이외 선택지는 오답으로 채점되어야 함 (복수 정답 오류 방지)
    for (const c of q.choices!) if (!q.answers.includes(c)) expect(gradeAnswer(q, c), `${q.id} 오답 선택지 "${c}"`).toBe(false);
  }
  if (q.type === 'order') {
    expect(gradeOrder(q, q.tokens!), `${q.id} 조각 순서대로 합치면 정답`).toBe(true);
  }
  if (q.type === 'blank' || q.type === 'dictation') expect(q.sentence, `${q.id} 빈칸`).toContain('___');
  for (const a of q.answers) expect(gradeAnswer(q, a), `${q.id} 정답 "${a}" 자기 채점`).toBe(true);
}

describe('A1 문법 콘텐츠 (정량 기준)', () => {
  it('A1 문법 단원 최소 10개', () => expect(GRAMMAR_UNITS.filter((u) => u.level === 'A1')).toHaveLength(10));
  it.each(GRAMMAR_UNITS.map((u) => [u.id, u] as const))('%s: 예문 ≥5, 연습문제 ≥15, 영작, 단원 평가, 필수 요소', (_id, u) => {
    expect(u.examples.length).toBeGreaterThanOrEqual(5);
    expect(u.practice.length).toBeGreaterThanOrEqual(15);
    expect(u.writing.length).toBeGreaterThanOrEqual(3);
    expect(u.unitTest.length).toBeGreaterThanOrEqual(8);
    expect(u.goal.length).toBeGreaterThan(0);
    expect(u.easy.length).toBeGreaterThan(20);
    expect(u.detail.length).toBeGreaterThan(50);
    expect(u.structure.length).toBeGreaterThan(0);
    expect(u.compare.examples.length).toBeGreaterThan(0);
    expect(u.mistakes.length).toBeGreaterThanOrEqual(3);
    expect(u.helpTips.length).toBeGreaterThan(0);
    expect(u.terms.length).toBeGreaterThan(0);
    expect(u.moreExamples.length).toBeGreaterThan(0);
    for (const p of u.prerequisites) expect(GRAMMAR_BY_ID[p]).toBeDefined();
    for (const q of [...u.practice, ...u.writing, ...u.unitTest]) expect(q.conceptId).toBe(u.id);
  });
  it('전문가 검수 전 "공개 가능" 표시 0건', () => {
    const published = [...GRAMMAR_UNITS, ...DIALOGUES, ...SITUATIONS, ...EXPRESSIONS].filter((x) => x.reviewStatus === 'published' || x.reviewStatus === 'expert-reviewed');
    expect(published).toHaveLength(0);
  });
  it('A2~B2 는 준비 중', () => {
    expect(CURRICULUM.filter((c) => c.level !== 'A1').every((c) => !c.available)).toBe(true);
  });
});

describe('문항 공통 검증', () => {
  it('문항 id 중복 없음', () => {
    const ids = allQuestions.map((q) => q.id);
    expect(ids.length - new Set(ids).size).toBe(0);
  });
  it('정답·해설 등록률 100%, 정답-선택지 일치, 오답 선택지가 정답으로 채점되지 않음', () => {
    for (const q of allQuestions) validateQuestion(q);
  });
});

describe('영단어', () => {
  it('A1 영단어 최소 300개, 예문·해석·발음기호·관련 문법 100%', () => {
    expect(VOCAB.length).toBeGreaterThanOrEqual(300);
    for (const v of VOCAB) {
      expect(v.example, v.id).toBeTruthy();
      expect(v.exampleKo, v.id).toBeTruthy();
      expect(v.ipa, `${v.id} IPA`).toMatch(/^\/.+\/$/);
      expect(v.koPron, v.id).toBeTruthy();
      expect(GRAMMAR_BY_ID[v.grammarId], `${v.id} grammar`).toBeDefined();
    }
    expect(new Set(VOCAB.map((v) => v.id)).size).toBe(VOCAB.length);
  });
  it('afford 는 can\'t afford to 패턴과 연결', () => {
    const a = VOCAB.find((v) => v.word === 'afford')!;
    expect(a.pattern).toContain("can't afford to");
    expect(a.grammarId).toBe('a1-u09');
  });
});

describe('듣기·말하기', () => {
  it('A1 듣기 대화 ≥10, 문제·받아쓰기·핵심 표현', () => {
    expect(DIALOGUES.filter((d) => d.level === 'A1').length).toBeGreaterThanOrEqual(10);
    for (const d of DIALOGUES) {
      expect(d.lines.length).toBeGreaterThanOrEqual(5);
      expect(d.questions.length).toBeGreaterThanOrEqual(3);
      expect(d.dictation.length).toBeGreaterThanOrEqual(1);
      expect(d.keyExpressions.length).toBeGreaterThan(0);
      expect(d.keyWords.length).toBeGreaterThan(0);
      for (const l of d.lines) expect(l.ko).toBeTruthy();
      expect(GRAMMAR_BY_ID[d.grammarId]).toBeDefined();
    }
  });
  it('받아쓰기 정답 단어가 실제 음성 문장에 들어 있음', () => {
    for (const d of [...DIALOGUES, ...SITUATIONS]) {
      for (const q of d.dictation) {
        const line = d.lines.find((l) => l.audio === q.audio)!;
        expect(line, q.id).toBeDefined();
        const filled = q.sentence!.replace('___', q.answers[0]);
        expect(line.en.replace(/[^a-z' ]/gi, '').toLowerCase()).toContain(filled.replace(/[^a-z' ]/gi, '').toLowerCase());
      }
    }
  });
  it('A1 따라 말하기 문장 ≥30', () => {
    expect(SPEAKING.length).toBeGreaterThanOrEqual(30);
    for (const s of SPEAKING) expect(GRAMMAR_BY_ID[s.grammarId]).toBeDefined();
  });
});

describe('표현 학습관', () => {
  const count = (c: string) => EXPRESSIONS.filter((e) => e.category === c).length;
  it('카테고리별 수량: 필수 50, 여행 30, 비즈니스 20, 구동사·숙어 50, 상황 10, 드라마 3', () => {
    expect(count('essential')).toBe(50);
    expect(count('travel')).toBe(30);
    expect(count('business')).toBe(20);
    expect(count('phrasal')).toBe(50);
    expect(SITUATIONS).toHaveLength(10);
    expect(DRAMAS).toHaveLength(3);
  });
  it('모든 표현에 한국어 해설·상황·비슷한 표현·뉘앙스·대화 예문', () => {
    for (const e of EXPRESSIONS) {
      for (const f of [e.ko, e.usage, e.similar, e.nuance, e.dialogue[0].ko, e.dialogue[1].ko, e.writing.sentence]) expect(f, e.id).toBeTruthy();
      expect(e.tags.length, e.id).toBeGreaterThan(0);
      if (e.grammarId) expect(GRAMMAR_BY_ID[e.grammarId], e.id).toBeDefined();
    }
    expect(new Set(EXPRESSIONS.map((e) => e.en.toLowerCase())).size).toBe(EXPRESSIONS.length);
  });
  it('영상 콘텐츠 권리 확인 기록 100% · 제3자 자료 미사용', () => {
    for (const d of DRAMAS) {
      expect(d.rights.source).toBe('self-produced');
      expect(d.rights.thirdPartyMaterial).toBe(false);
      expect(d.rights.voices).toMatch(/CC BY 4\.0/);
      if (d.video) expect(existsSync(resolve('public', d.video)), d.video).toBe(true);
    }
  });
});

describe('음성 파일', () => {
  it('콘텐츠가 참조하는 모든 음성 파일이 실제로 존재 (음성 제공률 100%)', () => {
    const paths = [...audioRegistry.keys(), ...DIALOGUES.map((d) => d.audio), ...SITUATIONS.map((d) => d.audio)];
    const missing = paths.filter((p) => !existsSync(resolve('public', p)));
    expect(missing.slice(0, 5)).toEqual([]);
    expect(paths.length).toBeGreaterThan(1000);
  });
});

describe('캐릭터', () => {
  it('6종, 희귀도 구성', () => {
    expect(CHARACTERS).toHaveLength(6);
    expect(CHARACTERS.filter((c) => c.rarity === 'common')).toHaveLength(4);
    expect(CHARACTERS.filter((c) => c.rarity === 'rare')).toHaveLength(1);
    expect(CHARACTERS.filter((c) => c.rarity === 'special')).toHaveLength(1);
    for (const c of CHARACTERS) expect(GRAMMAR_BY_ID[c.conceptId]).toBeDefined();
  });
});
