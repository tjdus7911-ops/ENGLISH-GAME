import type { Level, Question } from '@/domain/types';
import { tts } from '../audio';
import { ESSENTIAL } from './essential';
import { PHRASAL } from './phrasal';
import { BUSINESS, TRAVEL } from './travel-business';
import { DRAMAS, SITUATIONS } from './situations-video';

export type ExpressionCategory = 'essential' | 'travel' | 'business' | 'phrasal' | 'situation' | 'video';

export const EXPRESSION_CATEGORIES: { id: ExpressionCategory; title: string; desc: string; emoji: string; tint: string }[] = [
  { id: 'essential', title: '필수 영어회화 표현', desc: '매일 쓰는 인사·감사·대답', emoji: '💬', tint: 'bg-peach' },
  { id: 'travel', title: '여행 영어', desc: '공항·호텔·식당·쇼핑', emoji: '✈️', tint: 'bg-sky' },
  { id: 'business', title: '비즈니스 영어', desc: '회의·이메일·일정 조율', emoji: '💼', tint: 'bg-lilac' },
  { id: 'phrasal', title: '구동사 및 숙어', desc: 'pick up, a piece of cake…', emoji: '🧩', tint: 'bg-mint' },
  { id: 'situation', title: '상황별 듣기·말하기', desc: '실제 상황 대화 10편', emoji: '🎧', tint: 'bg-butter' },
  { id: 'video', title: '영상 속 영어', desc: '오리지널 미니 드라마', emoji: '🎬', tint: 'bg-accent-soft' },
];

export interface Expression {
  id: string;
  category: 'essential' | 'travel' | 'business' | 'phrasal';
  en: string;
  ko: string;
  level: Level;
  tags: string[];
  grammarId: string | null;
  keywords: string[];
  usage: string;
  similar: string;
  nuance: string;
  dialogue: { speaker: 'A' | 'B'; en: string; ko: string; audio: string }[];
  audio: string;
  listening: Question;
  writing: Question;
  conceptId: string;
  reviewStatus: 'expert-review-needed';
}

const PREFIX: Record<Expression['category'], string> = { essential: 'ess', travel: 'trv', business: 'biz', phrasal: 'phr' };

function parse(category: Expression['category'], tsv: string): Expression[] {
  const rows = tsv.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split('|'));
  const conceptId = `expr-${category}`;
  return rows.map((f, i) => {
    const [en, ko, level, tags, grammar, keywords, usage, similar, nuance, aEn, aKo, bEn, bKo, writeKo, writeAns] = f;
    const id = `${PREFIX[category]}-${String(i + 1).padStart(2, '0')}`;
    const dialogue = [
      { speaker: 'A' as const, en: aEn, ko: aKo, audio: tts(aEn, 'f2') },
      { speaker: 'B' as const, en: bEn, ko: bKo, audio: tts(bEn, 'm2') },
    ];
    // 듣기 문제: 대화를 듣고 B 의 말 뜻 고르기. 오답 선택지는 같은 카테고리 다른 대화문의 해석에서 결정적으로 선택.
    const norm = (s: string) => s.replace(/[.,!?~ ]/g, '');
    const picked: string[] = [];
    for (let k = 7; picked.length < 2 && k < 7 + rows.length; k += 5) {
      const cand = rows[(i + k) % rows.length][12];
      if (norm(cand) !== norm(bKo) && !picked.some((p) => norm(p) === norm(cand))) picked.push(cand);
    }
    const choices = [bKo, ...picked];
    const rot = i % 3;
    const ordered = [...choices.slice(rot), ...choices.slice(0, rot)];
    return {
      id, category, en, ko, level: level as Level, tags: tags.split(','), grammarId: grammar === '-' ? null : grammar,
      keywords: keywords.split(','), usage, similar, nuance, dialogue, audio: tts(en), conceptId,
      listening: {
        id: `${id}-l`, type: 'mc', prompt: '대화를 듣고, 두 번째 사람이 한 말의 뜻을 고르세요.', choices: ordered, answers: [bKo],
        explanation: `"${bEn}" = ${bKo}`, conceptId, audio: dialogue[1].audio,
      },
      writing: {
        id: `${id}-w`, type: 'writing', prompt: `"${en}"를 활용해 영어로 써 보세요.`, sentence: writeKo, answers: writeAns.split('/'),
        explanation: `예시 답: ${writeAns.split('/')[0]}`, conceptId, hint: en,
      },
      reviewStatus: 'expert-review-needed',
    };
  });
}

export const EXPRESSIONS: Expression[] = [
  ...parse('essential', ESSENTIAL),
  ...parse('travel', TRAVEL),
  ...parse('business', BUSINESS),
  ...parse('phrasal', PHRASAL),
];
export const EXPRESSION_BY_ID: Record<string, Expression> = Object.fromEntries(EXPRESSIONS.map((e) => [e.id, e]));
export { SITUATIONS, DRAMAS };
export const SITUATION_BY_ID = Object.fromEntries(SITUATIONS.map((s) => [s.id, s]));
export const DRAMA_BY_ID = Object.fromEntries(DRAMAS.map((d) => [d.id, d]));
