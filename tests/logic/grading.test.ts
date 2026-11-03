import { gradeAnswer, gradeOrder, normalizeAnswer } from '@/domain/learning/grading';
import type { Question } from '@/domain/types';

const q = (over: Partial<Question>): Question => ({ id: 'q', type: 'blank', prompt: '', answers: [], explanation: 'x', conceptId: 'a1-u02', ...over });

describe('채점', () => {
  it('객관식: 정답 선택지만 정답', () => {
    const m = q({ type: 'mc', choices: ['am', 'is', 'are'], answers: ['am'] });
    expect(gradeAnswer(m, 'am')).toBe(true);
    expect(gradeAnswer(m, 'is')).toBe(false);
    expect(gradeAnswer(m, '')).toBe(false);
  });
  it('빈칸: 대소문자·공백 무시', () => {
    const b = q({ answers: ['is'] });
    expect(gradeAnswer(b, '  IS ')).toBe(true);
    expect(gradeAnswer(b, 'are')).toBe(false);
  });
  it('단어 배열: 순서가 맞아야 정답', () => {
    const o = q({ type: 'order', tokens: ['I', 'am', 'a', 'student'], answers: ['I am a student.'] });
    expect(gradeOrder(o, ['I', 'am', 'a', 'student'])).toBe(true);
    expect(gradeOrder(o, ['am', 'I', 'a', 'student'])).toBe(false);
  });
  it('영작: 문장 끝 구두점·곡선 따옴표 무시, 축약형 동일 처리', () => {
    const w = q({ type: 'writing', answers: ["I don't like milk."] });
    expect(gradeAnswer(w, 'I do not like milk')).toBe(true);
    expect(gradeAnswer(w, 'I don’t like milk!')).toBe(true);
    expect(gradeAnswer(w, 'I not like milk.')).toBe(false);
  });
  it('복수 정답 허용', () => {
    const w = q({ type: 'writing', answers: ['She is my sister.', "She's my sister."] });
    expect(gradeAnswer(w, "she's my sister")).toBe(true);
    expect(gradeAnswer(w, 'She is my sister')).toBe(true);
    expect(gradeAnswer(w, 'He is my sister')).toBe(false);
  });
  it('can not / cannot / can\'t 동일', () => {
    expect(normalizeAnswer("I can't swim")).toBe(normalizeAnswer('I cannot swim'));
    expect(normalizeAnswer('I can not swim')).toBe(normalizeAnswer('I cannot swim'));
  });
});
