/** 퀘스트 정의·진행·보상 수령 (순수 함수) */
import { addDays, diffDays } from '../date';

export type QuestType = 'daily' | 'weekly' | 'achievement' | 'space';
export type QuestStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'claimed';

/** 퀘스트 진행 계산용 스냅샷 (실제 학습·게임 기록에서 계산) */
export interface QuestContext {
  date: string;
  weekStart: string;
  today: { words: number; wordQuizDone: boolean; grammarLessons: number; listening: number; speakingSentences: number; reviewDone: boolean; reviewDue: number; expressions: number };
  week: { studyDays: number; grammarUnits: number; listeningSpeaking: number };
  totals: { studySessions: number; unitTestsPassed: number; charactersOwned: number; evolved: number; purchases: number; decorateCount: number; gardenOpen: boolean; gardenEligible: boolean };
}

export interface QuestDef {
  id: string;
  type: QuestType;
  title: string;
  target: number;
  stars: number;
  items?: string[]; // 보상 아이템 id
  xp?: number;
  progress: (c: QuestContext) => number;
  locked?: (c: QuestContext) => string | null; // 잠금 사유
  link?: string;
}

export const QUESTS: QuestDef[] = [
  // 일일 6
  { id: 'd-words', type: 'daily', title: '영단어 10개 학습 및 확인 문제 완료', target: 10, stars: 10, progress: (c) => (c.today.wordQuizDone ? Math.min(10, c.today.words) : Math.min(9, c.today.words)), link: '/today' },
  { id: 'd-grammar', type: 'daily', title: '문법 1강 및 확인 문제 완료', target: 1, stars: 15, progress: (c) => c.today.grammarLessons, link: '/grammar' },
  { id: 'd-listening', type: 'daily', title: '듣기 수업 1개 완료', target: 1, stars: 10, progress: (c) => c.today.listening, link: '/listening' },
  { id: 'd-speaking', type: 'daily', title: '말하기 5문장 연습', target: 5, stars: 10, progress: (c) => c.today.speakingSentences, link: '/speaking' },
  { id: 'd-review', type: 'daily', title: '오늘 예정된 복습 완료', target: 1, stars: 20, progress: (c) => (c.today.reviewDone ? 1 : 0), locked: (c) => (c.today.reviewDue === 0 && !c.today.reviewDone ? '오늘 예정된 복습이 없어요' : null), link: '/review' },
  { id: 'd-expression', type: 'daily', title: '상황별 영어 표현 수업 1개 완료', target: 1, stars: 15, progress: (c) => c.today.expressions, link: '/expressions' },
  // 주간 3
  { id: 'w-days', type: 'weekly', title: '서로 다른 3일 학습', target: 3, stars: 40, xp: 15, progress: (c) => c.week.studyDays },
  { id: 'w-grammar', type: 'weekly', title: '문법 단원 3개 완료', target: 3, stars: 40, xp: 15, progress: (c) => c.week.grammarUnits },
  { id: 'w-ls', type: 'weekly', title: '듣기·말하기 수업 5개 완료', target: 5, stars: 40, xp: 15, progress: (c) => c.week.listeningSpeaking },
  // 업적 7
  { id: 'a-first-study', type: 'achievement', title: '첫 영어 학습', target: 1, stars: 10, items: ['plant-sprout'], progress: (c) => Math.min(1, c.totals.studySessions) },
  { id: 'a-first-test', type: 'achievement', title: '첫 단원 평가 통과', target: 1, stars: 20, items: ['frame-certificate'], progress: (c) => Math.min(1, c.totals.unitTestsPassed) },
  { id: 'a-first-char', type: 'achievement', title: '첫 캐릭터 획득', target: 1, stars: 15, items: ['rug-paw'], progress: (c) => Math.min(1, c.totals.charactersOwned) },
  { id: 'a-first-evolve', type: 'achievement', title: '첫 캐릭터 진화', target: 1, stars: 30, items: ['lamp-star'], progress: (c) => Math.min(1, c.totals.evolved) },
  { id: 'a-first-buy', type: 'achievement', title: '첫 가구 구매', target: 1, stars: 10, progress: (c) => Math.min(1, c.totals.purchases) },
  { id: 'a-first-deco', type: 'achievement', title: '첫 집 꾸미기', target: 1, stars: 10, items: ['wall-mint'], progress: (c) => Math.min(1, c.totals.decorateCount) },
  { id: 'a-first-garden', type: 'achievement', title: '첫 정원 개방', target: 1, stars: 30, items: ['g-arch'], progress: (c) => (c.totals.gardenOpen ? 1 : 0) },
  // 공간 개방 1
  { id: 's-garden', type: 'space', title: '비밀 정원 열기', target: 1, stars: 20, items: ['g-bed-tulip'], progress: (c) => (c.totals.gardenOpen || c.totals.gardenEligible ? 1 : 0), link: '/garden' },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** 주 시작(월요일) 날짜 키 */
export function weekStartOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일
  return addDays(date, -((dow + 6) % 7));
}
export const inWeek = (date: string, weekStart: string) => { const k = diffDays(weekStart, date); return k >= 0 && k < 7; };

export function periodKey(q: QuestDef, c: QuestContext) {
  return q.type === 'daily' ? c.date : q.type === 'weekly' ? c.weekStart : 'once';
}
export const claimKey = (q: QuestDef, c: QuestContext) => `quest:${q.id}:${periodKey(q, c)}`;

export function questStatus(q: QuestDef, c: QuestContext, claims: Record<string, unknown>): QuestStatus {
  if (claims[claimKey(q, c)]) return 'claimed';
  const p = q.progress(c);
  if (p >= q.target) return 'completed';
  if (q.locked?.(c)) return 'locked';
  if (q.type === 'space' && !c.totals.gardenEligible) return p > 0 ? 'in_progress' : 'locked';
  return p > 0 ? 'in_progress' : 'available';
}
