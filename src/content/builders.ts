import type { Example, Question } from '@/domain/types';
import { tts } from './audio';

let ctx = 'x';
/** 이후 생성되는 문항의 개념(단원) id 설정 */
export function concept(id: string) { ctx = id; }

export const ex = (en: string, ko: string): Example => ({ en, ko, audio: tts(en) });

export function mc(id: string, prompt: string, sentence: string, choices: string[], answer: string, explanation: string, hint?: string): Question {
  return { id, type: 'mc', prompt, sentence, choices, answers: [answer], explanation, conceptId: ctx, hint };
}
export function blank(id: string, prompt: string, sentence: string, answers: string[], explanation: string, hint?: string): Question {
  return { id, type: 'blank', prompt, sentence, answers, explanation, conceptId: ctx, hint };
}
export function order(id: string, prompt: string, answer: string, explanation: string, alt: string[] = []): Question {
  const tokens = answer.replace(/[.?!]$/, '').split(' ');
  return { id, type: 'order', prompt, tokens, answers: [answer, ...alt], explanation, conceptId: ctx };
}
export function tr(id: string, sentence: string, choices: string[], answer: string, explanation: string): Question {
  return { id, type: 'translate', prompt: '알맞은 해석을 고르세요.', sentence, choices, answers: [answer], explanation, conceptId: ctx };
}
export function wr(id: string, ko: string, answers: string[], explanation: string, hint?: string): Question {
  return { id, type: 'writing', prompt: '영어로 써 보세요.', sentence: ko, answers, explanation, conceptId: ctx, hint };
}
