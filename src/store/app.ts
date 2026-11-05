import { VOCAB_BY_ID } from '@/content/vocab';
import { lookup, normKey, posName } from '@/lib/lexicon';
import { BOOK_BY_ID } from '@/content/library';
import { PRE_A1 } from '@/content/vocab-topics';
import { applyMyWordResults, saveMyWord, type MyWord, type SaveInput, type WordSource } from '@/domain/learning/mywords';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type {
  DecorationId, ReviewItem, ReviewKind, Settings, SpeakingAttempt, StudyLogEntry, UserAnswer, WrongNote,
} from '@/domain/types';
import { toDateKey, isValidDateKey } from '@/domain/date';
import { applyReviewResult, createReviewItem, dueItems } from '@/domain/learning/srs';
import { computeMastery } from '@/domain/learning/mastery';
import {
  acquireCharacter, applyGrowth, discoveryAvailability, earnStars, grantReward, growthCheck, initialGameState, markRestudied, resolveDiscovery,
  setPartner as setPartnerFn, updateDiscoveries, updateVillage, type GameState,
} from '@/domain/game/state';
import {
  buyItem, commitPlacements, computeHouseLevel, grantItem, initialHomeState, spaceConditionsMet, unlockSpace,
  type HomeContext, type HomeState, type SpaceId,
} from '@/domain/game/home';
import { QUESTS, QUEST_BY_ID, claimKey, inWeek, questStatus, weekStartOf, type QuestContext } from '@/domain/game/quests';
import { COMMON_POOL, RARE_ID, SPECIAL_ID, CHARACTER_BY_ID } from '@/content/characters';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { DEFAULT_ITEMS, DEFAULT_PLACEMENTS, EVOLUTION_REWARD, FURNITURE_BY_ID } from '@/content/furniture';

export const STORE_KEY = 'english-village-v1';
export const STORE_VERSION = 4;

export const now = () => Date.now();
export const today = () => toDateKey(now());

export type Celebration =
  | { kind: 'reward'; text: string; id: string }
  | { kind: 'character'; characterId: string; id: string }
  | { kind: 'levelup'; characterId: string; id: string }
  | { kind: 'decoration'; decoration: DecorationId; id: string }
  | { kind: 'story'; storyId: string; id: string };

export interface Profile {
  onboarded: boolean;
  purpose: string | null;
  selfLevel: string | null;
  dailyMinutes: number;
  levelTest: {
    done: boolean; level: string | null; byLevel: Record<string, { correct: number; total: number }> | null; date?: string;
    /** test: 레벨 테스트 결과 · manual: 사용자가 직접 선택 · skip: 건너뜀 */
    method?: 'test' | 'manual' | 'skip';
    byArea?: Record<string, { correct: number; total: number }>;
    /** 지난 테스트 기록 (재응시 이력) */
    history?: { date: string; level: string; method: string }[];
  };
}

export interface LearningState {
  answers: UserAnswer[];
  reviews: Record<string, ReviewItem>;
  wrongNotes: Record<string, WrongNote>;
  learnedWords: Record<string, string>; // wordId → 학습일
  steps: Record<string, string>; // `${unitId}:${step}` → 완료일
  lectureViewed: Record<string, string>;
  unitTests: Record<string, { date: string; correct: number; total: number; passed: boolean }>;
  a1Exam: { date: string; correct: number; total: number; passed: boolean } | null;
  listeningDone: Record<string, string>;
  speakingAttempts: SpeakingAttempt[];
  expressionsDone: Record<string, string>;
  savedExpressions: string[];
  /** 저장한 단어 (단어 id) — 단어장 '저장한 단어' */
  savedWords: string[];
  /** 나만의 단어장 (키: 소문자 원형) — 모든 학습 영역에서 저장한 단어를 하나로 */
  myWords: Record<string, MyWord>;
  /** 동화책 진행: 마지막 페이지·읽은 최대 페이지·완료일·이해도 퀴즈 최고 기록 */
  books: Record<string, BookProgress>;
  dramasDone: Record<string, string>;
  readingsDone: Record<string, string>;
  log: StudyLogEntry[];
  reviewSkippedOn: string | null;
  studySeconds: Record<string, number>; // 날짜 → 학습 화면 체류 시간(초)
}

export interface BookProgress { page: number; maxPage: number; startedOn: string; readOn?: string; quiz?: { date: string; correct: number; total: number; passed: boolean } }

export interface AppState {
  version: number;
  profile: Profile;
  settings: Settings;
  learning: LearningState;
  game: GameState;
  home: HomeState;
  /** 퀘스트 보상 수령 기록: claimKey → 수령 시각 */
  questClaims: Record<string, number>;
  celebrations: Celebration[];
  recovered: boolean;
}

const initialLearning = (): LearningState => ({
  answers: [], reviews: {}, wrongNotes: {}, learnedWords: {}, steps: {}, lectureViewed: {}, unitTests: {}, a1Exam: null,
  listeningDone: {}, speakingAttempts: [], expressionsDone: {}, savedExpressions: [], savedWords: [], myWords: {}, books: {}, dramasDone: {}, readingsDone: {}, log: [], reviewSkippedOn: null, studySeconds: {},
});

const initialHome = (): HomeState => ({ ...initialHomeState(DEFAULT_ITEMS), placements: { house: { ...DEFAULT_PLACEMENTS }, garden: {} } });

export const initialState = (): AppState => ({
  version: STORE_VERSION,
  profile: { onboarded: false, purpose: null, selfLevel: null, dailyMinutes: 20, levelTest: { done: false, level: null, byLevel: null } },
  settings: { dailyNewWords: 10, notificationsOn: true, notifyTime: '20:00', reduceMotion: false, recordingConsent: false, speechRate: 1 },
  learning: initialLearning(),
  game: initialGameState(),
  home: initialHome(),
  questClaims: {},
  celebrations: [],
  recovered: false,
});

// ─────────────────────────── 저장소 (IndexedDB) ───────────────────────────
const idbStorage: StateStorage = {
  getItem: async (name) => {
    try { return (await idbGet<string>(name)) ?? null; } catch { return null; }
  },
  setItem: async (name, value) => { try { await idbSet(name, value); } catch { /* 저장 실패는 다음 변경 시 재시도 */ } },
  removeItem: async (name) => { try { await idbDel(name); } catch { /* noop */ } },
};

/** 저장 데이터 검증 — 형식이 깨졌으면 null */
export function validatePersisted(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<AppState>;
  if (!s.profile || !s.learning || !s.game || !s.settings) return null;
  const l = s.learning as Partial<LearningState>;
  if (!Array.isArray(l.answers) || typeof l.reviews !== 'object' || l.reviews === null) return null;
  for (const r of Object.values(l.reviews)) if (!r || !isValidDateKey((r as ReviewItem).due)) return null;
  const g = s.game as Partial<GameState>;
  if (typeof g.characters !== 'object' || typeof g.ledger !== 'object' || !g.village || !Array.isArray(g.village.unlocked)) return null;
  if (s.home && (typeof s.home.inventory !== 'object' || typeof s.home.placements !== 'object')) return null;
  return s as AppState;
}

/** 버전 마이그레이션: 누락된 필드를 기본값으로 채우고 기존 기록은 유지 */
export function migrate(persisted: unknown, fromVersion: number): AppState {
  const base = initialState();
  const s = (persisted ?? {}) as Partial<AppState> & { game?: Partial<GameState> & { pointsEarned?: number; pointsSpent?: number; discovery?: Record<string, unknown> } };
  const oldGame = (s.game ?? {}) as Partial<GameState> & { pointsEarned?: number; pointsSpent?: number };
  // v2 → v3: 발견 포인트를 별로 이전 (잔액 그대로), 발견 상태 구조 변경
  const stars = { ...(oldGame.stars ?? {}) };
  if (fromVersion < 3 && typeof oldGame.pointsEarned === 'number') {
    const bal = (oldGame.pointsEarned ?? 0) - (oldGame.pointsSpent ?? 0);
    if (bal > 0) stars['migrate:points-v2'] = { eventId: 'migrate:points-v2', amount: bal, reason: '발견 포인트 → 별 전환', at: 0 };
  }
  const disc = oldGame.discovery as Partial<GameState['discovery']> | undefined;
  const merged: AppState = {
    ...base, ...s,
    profile: { ...base.profile, ...(s.profile ?? {}), levelTest: { ...base.profile.levelTest, ...(s.profile?.levelTest ?? {}) } },
    settings: { ...base.settings, ...(s.settings ?? {}) },
    learning: { ...base.learning, ...(s.learning ?? {}) },
    game: {
      ...base.game, ...oldGame, stars,
      discovery: { unlocked: Array.isArray(disc?.unlocked) ? disc!.unlocked : [], restudy: (disc?.restudy as Record<string, string>) ?? {}, attempts: (disc?.attempts as number) ?? 0 },
      village: { ...base.game.village, ...(oldGame.village ?? {}) },
    } as GameState,
    home: { ...base.home, ...(s.home ?? {}), placements: { ...base.home.placements, ...(s.home?.placements ?? {}) } },
    questClaims: { ...(s.questClaims ?? {}) },
    version: STORE_VERSION,
  };
  merged.learning = { ...merged.learning, myWords: merged.learning.myWords ?? {}, books: merged.learning.books ?? {}, savedWords: merged.learning.savedWords ?? [] };
  // v3 → v4: 기존 '저장한 단어'(영단어 id) → 나만의 단어장으로 이전 (기존 목록도 유지)
  if (fromVersion < 4) {
    let map = merged.learning.myWords ?? {};
    for (const id of merged.learning.savedWords ?? []) { const e = vocabEntry(id); if (e) map = saveMyWord(map, e, 'words', id, VOCAB_BY_ID[id]?.example, toDateKey(Date.now()), Date.now()).map; }
    merged.learning = { ...merged.learning, myWords: map };
  }
  delete (merged.game as unknown as Record<string, unknown>).pointsEarned;
  delete (merged.game as unknown as Record<string, unknown>).pointsSpent;
  return merged;
}

/** 앱 영단어 DB 단어 → 단어장 저장 정보 */
export function vocabEntry(id: string): SaveInput | null {
  const v = VOCAB_BY_ID[id];
  if (!v) return null;
  return { key: normKey(v.word), word: v.word, meaning: v.meaning, pos: posName(v.pos), level: PRE_A1.has(v.id) ? 'Pre-A1' : 'A1', vocabId: v.id };
}

// ─────────────────────────── 파생 값 ───────────────────────────
export function studiedOn(l: LearningState, date: string) {
  return l.log.some((e) => e.date === date && e.kind !== 'level-test');
}
export function studiedConceptsOn(l: LearningState, date: string) {
  return [...new Set(l.answers.filter((a) => a.date === date && a.source !== 'level-test').map((a) => a.conceptId))];
}
export const lecturesCompleted = (l: LearningState) => GRAMMAR_UNITS.filter((u) => l.steps[`${u.id}:practice`]).length;
export function homeContext(s: Pick<AppState, 'learning'>): HomeContext {
  const a = s.learning.a1Exam;
  return { lecturesCompleted: lecturesCompleted(s.learning), unitTestsPassed: Object.values(s.learning.unitTests).filter((t) => t.passed).length, a1ExamScore: a ? Math.round((a.correct / a.total) * 100) : null };
}
export function villageStats(s: AppState) {
  return {
    studySessions: s.learning.log.filter((e) => e.kind !== 'level-test').length,
    wordsLearned: Object.keys(s.learning.learnedWords).length,
    lecturesCompleted: lecturesCompleted(s.learning),
    unitTestsPassed: Object.values(s.learning.unitTests).filter((t) => t.passed).length,
    charactersOwned: Object.keys(s.game.characters).length,
    gardenOpen: !!s.home.spaces.garden,
  };
}
export function milestoneStats(l: LearningState) {
  return {
    wordsLearned: Object.keys(l.learnedWords).length,
    lecturesCompleted: lecturesCompleted(l),
    listeningDone: Object.keys(l.listeningDone).length,
    speakingSentences: new Set(l.speakingAttempts.map((a) => a.sentenceId)).size,
  };
}
export const discoveryInfo = (s: AppState) => discoveryAvailability(s.game, COMMON_POOL.map((c) => c.id));

export function questContext(s: AppState, date = today()): QuestContext {
  const l = s.learning;
  const tl = l.log.filter((e) => e.date === date);
  const weekStart = weekStartOf(date);
  const wl = l.log.filter((e) => inWeek(e.date, weekStart) && e.kind !== 'level-test');
  const due = dueItems(l.reviews, date).length;
  const reviewedToday = tl.some((e) => e.kind === 'review');
  return {
    date, weekStart,
    today: {
      words: Object.values(l.learnedWords).filter((d) => d === date).length,
      wordQuizDone: tl.some((e) => e.kind === 'words'),
      grammarLessons: new Set(tl.filter((e) => e.kind === 'practice' && e.completed).map((e) => e.refId)).size,
      listening: new Set(tl.filter((e) => e.kind === 'listening' || e.kind === 'situation').map((e) => e.refId)).size,
      speakingSentences: new Set(l.speakingAttempts.filter((a) => a.date === date).map((a) => a.sentenceId)).size,
      reviewDone: reviewedToday && due === 0,
      reviewDue: due,
      expressions: new Set(tl.filter((e) => e.kind === 'expression' || e.kind === 'situation' || e.kind === 'video').map((e) => e.refId)).size,
    },
    week: {
      studyDays: new Set(wl.map((e) => e.date)).size,
      grammarUnits: GRAMMAR_UNITS.filter((u) => { const d = l.steps[`${u.id}:practice`]; return d && inWeek(d, weekStart); }).length,
      listeningSpeaking: wl.filter((e) => e.kind === 'listening' || e.kind === 'situation' || e.kind === 'speaking' || e.kind === 'video').length,
    },
    totals: {
      studySessions: l.log.filter((e) => e.kind !== 'level-test').length,
      unitTestsPassed: Object.values(l.unitTests).filter((t) => t.passed).length,
      charactersOwned: Object.keys(s.game.characters).length,
      evolved: Object.values(s.game.characters).filter((c) => c.level === 2).length,
      purchases: s.home.purchases,
      decorateCount: s.home.decorateCount,
      gardenOpen: !!s.home.spaces.garden,
      gardenEligible: !!s.home.spaces.garden || spaceConditionsMet('garden', s.home, homeContext(s)),
    },
  };
}

export function questList(s: AppState) {
  const c = questContext(s);
  return QUESTS.map((q) => ({ q, status: questStatus(q, c, s.questClaims), progress: Math.min(q.target, q.progress(c)), lockReason: q.locked?.(c) ?? null }));
}
export const claimableCount = (s: AppState) => questList(s).filter((x) => x.status === 'completed').length;

let seq = 0;
const cid = () => `${now().toString(36)}-${(seq++).toString(36)}`;

// ─────────────────────────── 공통 처리 ───────────────────────────
interface StudyEvent {
  log: Omit<StudyLogEntry, 'id' | 'date' | 'at'>;
  answers?: Omit<UserAnswer, 'id' | 'date' | 'at'>[];
  reviewsToCreate?: { kind: ReviewKind; refId: string; conceptId: string }[];
  /** stars: 별(단원 평가 등), xp: 대표 파트너 성장 경험치. eventId 로 중복 지급 방지 */
  rewards?: { eventId: string; stars?: number; xp?: number; reason: string }[];
  mutate?: (l: LearningState, date: string) => LearningState;
}

function applyAnswers(l: LearningState, answers: UserAnswer[]): LearningState {
  const wrongNotes = { ...l.wrongNotes };
  for (const a of answers) {
    const prev = wrongNotes[a.questionId];
    if (!a.correct) {
      wrongNotes[a.questionId] = prev
        ? { ...prev, lastWrongOn: a.date, wrongCount: prev.wrongCount + 1, lastGiven: a.given, resolved: false }
        : { questionId: a.questionId, conceptId: a.conceptId, firstWrongOn: a.date, lastWrongOn: a.date, wrongCount: 1, lastGiven: a.given, resolved: false, source: a.source };
    } else if (prev && !prev.resolved && (a.source === 'review' || a.source === 'free' || a.date !== prev.lastWrongOn)) {
      wrongNotes[a.questionId] = { ...prev, resolved: true };
    }
  }
  return { ...l, answers: [...l.answers, ...answers].slice(-5000), wrongNotes };
}

function queueStory(s: AppState, storyId: string): AppState {
  if (s.home.storiesSeen.includes(storyId)) return s;
  return { ...s, home: { ...s.home, storiesSeen: [...s.home.storiesSeen, storyId] }, celebrations: [...s.celebrations, { kind: 'story', storyId, id: cid() }] };
}

function postProcess(s: AppState, date: string): AppState {
  let next = s;
  const cel: Celebration[] = [];
  // 발견 조건 (학습 성취)
  const d = updateDiscoveries(next.game, milestoneStats(next.learning));
  next = { ...next, game: d.state };
  if (d.opened.length) next = queueStory(next, 'first-discovery');
  // 마을 성장
  const v = updateVillage(next.game, villageStats(next));
  next = { ...next, game: v.state };
  cel.push(...v.newlyUnlocked.map((x): Celebration => ({ kind: 'decoration', decoration: x, id: cid() })));
  if (v.leveledTo === 2 || (v.leveledTo === 3 && !next.home.storiesSeen.includes('village-2'))) next = queueStory(next, 'village-2');
  if (v.leveledTo === 3) next = queueStory(next, 'village-3');
  // 캐릭터 진화 (보유 캐릭터 각각 — 파트너 변경과 무관하게 기록 유지)
  const mastery = computeMastery(next.learning.answers);
  for (const uc of Object.values(next.game.characters)) {
    const ch = CHARACTER_BY_ID[uc.id];
    const g = applyGrowth(next.game, uc.id, growthCheck(uc, mastery[ch.conceptId]), date);
    if (g.grew) {
      next = { ...next, game: g.state };
      cel.push({ kind: 'levelup', characterId: uc.id, id: cid() });
      const it = grantItem(next.home, EVOLUTION_REWARD[uc.id], now()); // 진화 특별 가구
      next = { ...next, home: it.home };
      if (it.granted) cel.push({ kind: 'reward', text: `진화 선물: ${FURNITURE_BY_ID[EVOLUTION_REWARD[uc.id]].name}`, id: cid() });
      next = queueStory(next, 'first-evolution');
    }
  }
  // 집 성장
  const hl = computeHouseLevel(next.home, homeContext(next));
  if (hl > next.home.houseLevel) {
    next = { ...next, home: { ...next.home, houseLevel: hl } };
    if (hl >= 2) next = queueStory(next, 'house-lv2');
  }
  if (next.learning.log.some((e) => e.kind !== 'level-test')) next = queueStory(next, 'first-study');
  return { ...next, celebrations: [...next.celebrations, ...cel] };
}

function grantPartnerXp(game: GameState, eventId: string, xp: number, reason: string, cel: Celebration[]): GameState {
  const pid = game.partnerId;
  if (!xp || !pid) return game;
  const g = grantReward(game, { eventId: `${eventId}:xp`, type: 'growth-xp', amount: xp, characterId: pid, reason, at: now() });
  if (g.granted) cel.push({ kind: 'reward', text: `${CHARACTER_BY_ID[pid].name} 성장 경험치 +${xp}`, id: cid() });
  return g.state;
}

function applyStudyEvent(s: AppState, ev: StudyEvent): AppState {
  const date = today();
  const at = now();
  let learning = s.learning;
  if (ev.answers?.length) learning = applyAnswers(learning, ev.answers.map((a) => ({ ...a, id: cid(), date, at })));
  let reviews = learning.reviews;
  for (const r of ev.reviewsToCreate ?? []) reviews = createReviewItem(reviews, r.kind, r.refId, r.conceptId, date).items;
  learning = { ...learning, reviews, log: [...learning.log, { ...ev.log, id: cid(), date, at }].slice(-3000) };
  if (ev.mutate) learning = ev.mutate(learning, date);

  let game = markRestudied(s.game); // 새 학습 이벤트 → 발견 재도전 허용
  const cel: Celebration[] = [];
  for (const r of ev.rewards ?? []) {
    if (r.stars) {
      const g = earnStars(game, r.eventId, r.stars, r.reason, at);
      game = g.state;
      if (g.granted) cel.push({ kind: 'reward', text: `★ 별 +${r.stars} · ${r.reason}`, id: cid() });
    }
    if (r.xp) game = grantPartnerXp(game, r.eventId, r.xp, r.reason, cel);
  }
  return postProcess({ ...s, learning, game, celebrations: [...s.celebrations, ...cel] }, date);
}

// ─────────────────────────── 스토어 ───────────────────────────
type Ans = Omit<UserAnswer, 'id' | 'date' | 'at'>;

export interface Actions {
  completeOnboarding: (p: { purpose: string; selfLevel: string; minutes: number; dailyNewWords: number; notifications: boolean }) => void;
  saveLevelTest: (level: string, byLevel: Record<string, { correct: number; total: number }>, answers: Ans[], byArea?: Record<string, { correct: number; total: number }>) => void;
  completeWords: (unitId: string, wordIds: string[], answers: Ans[]) => void;
  viewLecture: (unitId: string) => void;
  completePractice: (unitId: string, answers: Ans[]) => void;
  completeWriting: (unitId: string, answers: Ans[]) => void;
  completeUnitTest: (unitId: string, answers: Ans[]) => { passed: boolean };
  completeListening: (dialogueId: string, conceptId: string, title: string, answers: Ans[], kind?: 'listening' | 'situation') => void;
  completeSpeaking: (unitId: string | null, attempts: SpeakingAttempt[], conceptBySentence: Record<string, string>) => void;
  completeReading: (readingId: string, conceptId: string, title: string, answers: Ans[]) => void;
  completeExpression: (exprId: string, conceptId: string, title: string, answers: Ans[]) => void;
  completeDrama: (dramaId: string, title: string, answers: Ans[]) => void;
  completeA1Exam: (answers: Ans[]) => { passed: boolean };
  completeReview: (results: { key: string; correct: boolean; answer: Ans }[]) => void;
  freePractice: (title: string, answers: Ans[]) => void;
  skipReviewToday: () => void;
  toggleSaveExpression: (id: string) => void;
  toggleSaveWord: (id: string) => void;
  /** 문장 속 단어 저장 (중복이면 출처만 추가). 고유명사·사전에 없는 단어는 저장하지 않음 */
  saveWord: (raw: string, source: WordSource, ref?: string, context?: string) => { ok: boolean; created: boolean; key?: string };
  removeMyWord: (key: string) => void;
  setMemorized: (key: string, on: boolean) => void;
  completeMyWordReview: (results: { key: string; correct: boolean; given: string }[]) => void;
  setBookPage: (bookId: string, page: number) => void;
  completeBook: (bookId: string, answers: Ans[]) => { passed: boolean };
  setStudyLevel: (level: string, method?: 'manual' | 'skip') => void;
  /** 주제·난이도 단어장 챕터(5단어) 완료: 학습 기록은 단어 id 기준으로 통합, 첫 완료 시 별·XP 소량 */
  completeWordSet: (chapterId: string, title: string, wordIds: string[], answers: Ans[]) => void;
  resolveDiscoveryQuiz: (characterId: string, correct: number, answers: Ans[]) => { success: boolean };
  setPartner: (id: string) => boolean;
  claimQuest: (questId: string) => { ok: boolean; stars: number; items: string[] };
  buyFurniture: (itemId: string) => { ok: boolean; error?: string };
  commitDecor: (space: SpaceId, draft: Record<string, string | null>) => { ok: boolean; changed: boolean; error?: string };
  addStudyTime: (sec: number) => void;
  updateSettings: (p: Partial<Settings>) => void;
  dismissCelebration: (id: string) => void;
  markDecorationsSeen: () => void;
  resetAll: () => void;
}

const passRate = (answers: Ans[]) => (answers.length ? answers.filter((a) => a.correct).length / answers.length : 0);

export const useApp = create<AppState & Actions & { hydrated: boolean }>()(
  persist(
    (set, get) => ({
      ...initialState(),
      hydrated: false,

      completeOnboarding: (p) => set((s) => {
        const next: AppState = {
          ...s,
          profile: { ...s.profile, onboarded: true, purpose: p.purpose, selfLevel: p.selfLevel, dailyMinutes: p.minutes },
          settings: { ...s.settings, dailyNewWords: p.dailyNewWords, notificationsOn: p.notifications },
        };
        return queueStory(next, 'first-enter');
      }),

      saveLevelTest: (level, byLevel, answers, byArea) => set((s) => {
        const date = today();
        const at = now();
        const learning = { ...s.learning, answers: [...s.learning.answers, ...answers.map((a) => ({ ...a, id: cid(), date, at }))], log: [...s.learning.log, { id: cid(), date, at, kind: 'level-test' as const, refId: 'level-test', title: '레벨 진단', correct: answers.filter((a) => a.correct).length, total: answers.length }] };
        const method = answers.length ? 'test' as const : 'skip' as const;
        const history = [...(s.profile.levelTest.history ?? []), { date, level, method }].slice(-20);
        return { learning, profile: { ...s.profile, levelTest: { ...s.profile.levelTest, done: true, level, byLevel, date, method, byArea: byArea ?? s.profile.levelTest.byArea, history } } };
      }),

      completeWords: (unitId, wordIds, answers) => set((s) => {
        const before = Object.keys(s.learning.learnedWords).length;
        const newOnes = wordIds.filter((w) => !s.learning.learnedWords[w]);
        const after = before + newOnes.length;
        const rewards: StudyEvent['rewards'] = [];
        // 신규 단어 10개마다 성장 XP (단어 누적 개수 기준 고유 이벤트 → 같은 단어 반복으로는 지급되지 않음)
        for (let k = Math.floor(before / 10) + 1; k <= Math.floor(after / 10); k++) rewards.push({ eventId: `vocab10:${k}`, xp: 5, reason: `신규 단어 ${k * 10}개 달성` });
        return applyStudyEvent(s, {
          log: { kind: 'words', refId: unitId, title: '영단어 학습', correct: answers.filter((a) => a.correct).length, total: answers.length },
          answers, rewards,
          reviewsToCreate: wordIds.map((w) => ({ kind: 'word' as const, refId: w, conceptId: unitId })),
          mutate: (l, date) => {
            const learnedWords = { ...l.learnedWords };
            for (const w of newOnes) learnedWords[w] = date;
            const steps = { ...l.steps };
            if (!steps[`${unitId}:words`]) steps[`${unitId}:words`] = date;
            return { ...l, learnedWords, steps };
          },
        });
      }),

      viewLecture: (unitId) => set((s) => (s.learning.lectureViewed[unitId] ? s : { learning: { ...s.learning, lectureViewed: { ...s.learning.lectureViewed, [unitId]: today() }, steps: { ...s.learning.steps, [`${unitId}:grammar`]: s.learning.steps[`${unitId}:grammar`] ?? today() } } })),

      completePractice: (unitId, answers) => set((s) => {
        const u = GRAMMAR_UNITS.find((x) => x.id === unitId)!;
        // 강의를 열었다는 이유만으로 완료하지 않는다: 강의 열람 + 확인 문제 전체 수행
        const done = !!s.learning.lectureViewed[unitId] && answers.length >= u.practice.length;
        return applyStudyEvent(s, {
          log: { kind: 'practice', refId: unitId, title: `${u.title} 확인 문제`, correct: answers.filter((a) => a.correct).length, total: answers.length, completed: done },
          answers,
          reviewsToCreate: done ? [{ kind: 'grammar', refId: unitId, conceptId: unitId }] : [],
          rewards: done ? [{ eventId: `grammar:${unitId}`, xp: 10, reason: `${u.title} 강의·확인 문제 완료` }] : [],
          mutate: (l, date) => (done && !l.steps[`${unitId}:practice`] ? { ...l, steps: { ...l.steps, [`${unitId}:practice`]: date } } : l),
        });
      }),

      completeWriting: (unitId, answers) => set((s) => applyStudyEvent(s, {
        log: { kind: 'writing', refId: unitId, title: '기초 영작', correct: answers.filter((a) => a.correct).length, total: answers.length },
        answers,
        mutate: (l, date) => (l.steps[`${unitId}:writing`] ? l : { ...l, steps: { ...l.steps, [`${unitId}:writing`]: date } }),
      })),

      completeUnitTest: (unitId, answers) => {
        const passed = passRate(answers) >= 0.7;
        set((s) => {
          const u = GRAMMAR_UNITS.find((x) => x.id === unitId)!;
          let next = applyStudyEvent(s, {
            log: { kind: 'test', refId: unitId, title: `${u.title} 단원 평가`, correct: answers.filter((a) => a.correct).length, total: answers.length },
            answers,
            reviewsToCreate: [{ kind: 'grammar', refId: unitId, conceptId: unitId }],
            rewards: passed ? [{ eventId: `unittest:${unitId}`, stars: 10, xp: 10, reason: `${u.title} 단원 평가 통과` }] : [],
            mutate: (l, date) => {
              const prev = l.unitTests[unitId];
              const rec = { date, correct: answers.filter((a) => a.correct).length, total: answers.length, passed };
              const unitTests = { ...l.unitTests, [unitId]: prev?.passed && !passed ? prev : rec }; // 통과 기록은 덮어쓰지 않음
              const steps = passed && !l.steps[`${unitId}:test`] ? { ...l.steps, [`${unitId}:test`]: date } : l.steps;
              return { ...l, unitTests, steps };
            },
          });
          if (passed) {
            // 단원 평가 첫 통과 → 희귀 캐릭터 확정 획득
            const r = acquireCharacter(next.game, RARE_ID, today(), 'rare:first-unit-test', '단원 평가 통과', now());
            if (r.acquired) next = postProcess(queueStory({ ...next, game: r.state, celebrations: [...next.celebrations, { kind: 'character', characterId: RARE_ID, id: cid() }] }, 'first-character'), today());
          }
          return next;
        });
        return { passed };
      },

      completeListening: (dialogueId, conceptId, title, answers, kind = 'listening') => set((s) => applyStudyEvent(s, {
        log: { kind, refId: dialogueId, title, correct: answers.filter((a) => a.correct).length, total: answers.length },
        answers,
        reviewsToCreate: [{ kind: 'dialogue', refId: dialogueId, conceptId }],
        rewards: [{ eventId: `listening:${dialogueId}`, xp: 5, reason: `${title} 듣기 완료` }],
        mutate: (l, date) => {
          const listeningDone = l.listeningDone[dialogueId] ? l.listeningDone : { ...l.listeningDone, [dialogueId]: date };
          const steps = conceptId.startsWith('a1-u') && !l.steps[`${conceptId}:listening`] ? { ...l.steps, [`${conceptId}:listening`]: date } : l.steps;
          return { ...l, listeningDone, steps };
        },
      })),

      completeSpeaking: (unitId, attempts, conceptBySentence) => set((s) => {
        const ids = [...new Set(attempts.map((a) => a.sentenceId))];
        // STT 일치도는 발음 숙련도가 아니다 → 숙련도(정답) 기록에 넣지 않고, 누락 단어가 있으면 재연습(복습) 대상으로만 등록
        const needsPractice = ids.filter((id) => {
          const last = attempts.filter((a) => a.sentenceId === id).at(-1)!;
          return last.mode === 'stt' && (last.missing.length > 0 || last.substituted.length > 0);
        });
        return applyStudyEvent(s, {
          log: { kind: 'speaking', refId: unitId ?? 'free', title: '따라 말하기', correct: 0, total: 0 },
          reviewsToCreate: needsPractice.map((id) => ({ kind: 'speaking' as const, refId: id, conceptId: conceptBySentence[id] })),
          rewards: unitId ? [{ eventId: `speaking:${unitId}`, xp: 5, reason: '따라 말하기 완료' }] : [],
          mutate: (l, date) => ({
            ...l,
            speakingAttempts: [...l.speakingAttempts, ...attempts].slice(-1000),
            steps: unitId && !l.steps[`${unitId}:speaking`] ? { ...l.steps, [`${unitId}:speaking`]: date } : l.steps,
          }),
        });
      }),

      completeReading: (readingId, conceptId, title, answers) => set((s) => applyStudyEvent(s, {
        log: { kind: 'reading', refId: readingId, title, correct: answers.filter((a) => a.correct).length, total: answers.length },
        answers,
        reviewsToCreate: [{ kind: 'reading', refId: readingId, conceptId }],
        rewards: [{ eventId: `reading:${readingId}`, xp: 5, reason: `독해 "${title}" 완료` }],
        mutate: (l, date) => (l.readingsDone[readingId] ? l : { ...l, readingsDone: { ...l.readingsDone, [readingId]: date } }),
      })),

      completeExpression: (exprId, conceptId, title, answers) => set((s) => applyStudyEvent(s, {
        log: { kind: 'expression', refId: exprId, title, correct: answers.filter((a) => a.correct).length, total: answers.length },
        answers,
        reviewsToCreate: [{ kind: 'expression', refId: exprId, conceptId }],
        rewards: [{ eventId: `expr:${exprId}`, xp: 3, reason: `표현 "${title}" 학습` }],
        mutate: (l, date) => (l.expressionsDone[exprId] ? l : { ...l, expressionsDone: { ...l.expressionsDone, [exprId]: date } }),
      })),

      completeDrama: (dramaId, title, answers) => set((s) => applyStudyEvent(s, {
        log: { kind: 'video', refId: dramaId, title, correct: answers.filter((a) => a.correct).length, total: answers.length },
        answers,
        reviewsToCreate: [{ kind: 'dialogue', refId: dramaId, conceptId: 'expr-video' }],
        rewards: [{ eventId: `drama:${dramaId}`, xp: 5, reason: `미니 드라마 "${title}" 학습` }],
        mutate: (l, date) => (l.dramasDone[dramaId] ? l : { ...l, dramasDone: { ...l.dramasDone, [dramaId]: date } }),
      })),

      completeA1Exam: (answers) => {
        const passed = passRate(answers) >= 0.8;
        set((s) => {
          let next = applyStudyEvent(s, {
            log: { kind: 'a1-exam', refId: 'a1-exam', title: 'A1 종합평가', correct: answers.filter((a) => a.correct).length, total: answers.length },
            answers,
            rewards: passed ? [{ eventId: 'a1-exam:pass', stars: 30, xp: 20, reason: 'A1 종합평가 통과' }] : [],
            mutate: (l, date) => {
              const rec = { date, correct: answers.filter((a) => a.correct).length, total: answers.length, passed };
              return { ...l, a1Exam: !l.a1Exam || rec.correct / rec.total > l.a1Exam.correct / l.a1Exam.total ? rec : l.a1Exam };
            },
          });
          if (passed) {
            const r = acquireCharacter(next.game, SPECIAL_ID, today(), 'special:a1-exam', 'A1 종합평가 통과', now());
            if (r.acquired) next = postProcess({ ...next, game: r.state, celebrations: [...next.celebrations, { kind: 'character', characterId: SPECIAL_ID, id: cid() }] }, today());
          }
          return next;
        });
        return { passed };
      },

      completeReview: (results) => set((s) => {
        const date = today();
        const byKey: Record<string, boolean[]> = {};
        for (const r of results) (byKey[r.key] ??= []).push(r.correct);
        const reviews = { ...s.learning.reviews };
        for (const [key, oks] of Object.entries(byKey)) {
          if (!reviews[key]) continue;
          reviews[key] = applyReviewResult(reviews[key], oks.filter(Boolean).length / oks.length, date);
        }
        const remaining = dueItems(reviews, date).length;
        const interim: AppState = { ...s, learning: { ...s.learning, reviews } };
        return applyStudyEvent(interim, {
          log: { kind: 'review', refId: date, title: '오늘의 복습', correct: results.filter((r) => r.correct).length, total: results.length },
          answers: results.map((r) => ({ ...r.answer, source: 'review' as const })),
          // 오늘의 복습을 모두 끝내면 하루 1회 성장 경험치 +20 (날짜 기반 고유 이벤트)
          rewards: remaining === 0 ? [{ eventId: `review:${date}`, xp: 20, reason: '오늘의 복습 완료' }] : [],
        });
      }),

      freePractice: (title, answers) => set((s) => applyStudyEvent(s, { log: { kind: 'free', refId: 'free', title, correct: answers.filter((a) => a.correct).length, total: answers.length }, answers })),

      skipReviewToday: () => set((s) => ({ learning: { ...s.learning, reviewSkippedOn: today() } })),

      toggleSaveWord: (id) => set((s) => {
        const cur = s.learning.savedWords ?? [];
        const e = vocabEntry(id);
        const on = !cur.includes(id);
        let myWords = s.learning.myWords ?? {};
        if (e) {
          if (on) myWords = saveMyWord(myWords, e, 'words', id, VOCAB_BY_ID[id]?.example, today(), now()).map;
          else if (myWords[e.key]) { const { [e.key]: _drop, ...rest } = myWords; myWords = rest; }
        }
        return { learning: { ...s.learning, savedWords: on ? [...cur, id] : cur.filter((x) => x !== id), myWords } };
      }),

      saveWord: (raw, source, ref, context) => {
        const e = lookup(raw);
        if (!e || e.proper) return { ok: false, created: false };
        let created = false;
        set((s) => {
          const r = saveMyWord(s.learning.myWords ?? {}, e, source, ref, context, today(), now());
          created = r.created;
          const savedWords = e.vocabId && !(s.learning.savedWords ?? []).includes(e.vocabId) ? [...(s.learning.savedWords ?? []), e.vocabId] : s.learning.savedWords;
          return r.map === s.learning.myWords && savedWords === s.learning.savedWords ? s : { learning: { ...s.learning, myWords: r.map, savedWords } };
        });
        return { ok: true, created, key: e.key };
      },

      removeMyWord: (key) => set((s) => {
        const w = s.learning.myWords?.[key];
        if (!w) return s;
        const { [key]: _drop, ...rest } = s.learning.myWords;
        return { learning: { ...s.learning, myWords: rest, savedWords: w.vocabId ? (s.learning.savedWords ?? []).filter((x) => x !== w.vocabId) : s.learning.savedWords } };
      }),

      setMemorized: (key, on) => set((s) => {
        const w = s.learning.myWords?.[key];
        if (!w) return s;
        return { learning: { ...s.learning, myWords: { ...s.learning.myWords, [key]: { ...w, memorizedOn: on ? today() : null } } } };
      }),

      completeMyWordReview: (results) => set((s) => {
        const date = today();
        const myWords = applyMyWordResults(s.learning.myWords ?? {}, results, date);
        const interim: AppState = { ...s, learning: { ...s.learning, myWords } };
        const correct = results.filter((r) => r.correct).length;
        // 별 보상: 하루 1회(날짜 고유 이벤트) · 5문제 이상 풀었을 때만 → 같은 날 반복 응시로는 다시 지급되지 않음
        return applyStudyEvent(interim, {
          log: { kind: 'mywords', refId: date, title: '나만의 단어장 복습', correct, total: results.length },
          answers: results.map((r) => ({ questionId: `mw:${r.key}`, conceptId: 'myword', correct: r.correct, given: r.given, source: 'review' as const })),
          rewards: results.length >= 5 ? [{ eventId: `mywords:${date}`, stars: 2, xp: 3, reason: '나만의 단어장 복습' }] : [],
        });
      }),

      setBookPage: (bookId, page) => set((s) => {
        const b = BOOK_BY_ID[bookId];
        if (!b) return s;
        const p = Math.max(0, Math.min(page, b.pages.length - 1));
        const cur = s.learning.books?.[bookId];
        const maxPage = Math.max(cur?.maxPage ?? 0, p);
        const readOn = cur?.readOn ?? (maxPage >= b.pages.length - 1 ? today() : undefined);
        if (cur && cur.page === p && cur.maxPage === maxPage && cur.readOn === readOn) return s;
        return { learning: { ...s.learning, books: { ...s.learning.books, [bookId]: { ...(cur ?? { startedOn: today() }), page: p, maxPage, readOn } } } };
      }),

      completeBook: (bookId, answers) => {
        const b = BOOK_BY_ID[bookId];
        const passed = !!b && answers.length > 0 && passRate(answers) >= 0.6;
        if (!b) return { passed };
        set((s) => {
          const cur = s.learning.books?.[bookId];
          // 끝까지 읽지 않고 퀴즈만 풀어서는 보상 없음 (마지막 페이지까지 열람 필요)
          const read = (cur?.maxPage ?? 0) >= b.pages.length - 1;
          return applyStudyEvent(s, {
            log: { kind: 'book', refId: bookId, title: `동화책 「${b.titleKo}」`, correct: answers.filter((a) => a.correct).length, total: answers.length, completed: passed && read },
            answers,
            // 책마다 1회만 (eventId = book:id) → 다시 읽거나 퀴즈를 재응시해도 별이 추가되지 않음
            rewards: passed && read ? [{ eventId: `book:${bookId}`, stars: 3, xp: 5, reason: `동화책 「${b.titleKo}」 완독` }] : [],
            mutate: (l, date) => {
              const c = l.books[bookId] ?? { page: 0, maxPage: 0, startedOn: date };
              const rec = { date, correct: answers.filter((a) => a.correct).length, total: answers.length, passed };
              const quiz = c.quiz && (c.quiz.passed && !passed || c.quiz.correct / c.quiz.total > rec.correct / rec.total) ? c.quiz : rec;
              return { ...l, books: { ...l.books, [bookId]: { ...c, quiz, readOn: c.readOn ?? (read ? date : undefined) } } };
            },
          });
        });
        return { passed };
      },

      setStudyLevel: (level, method = 'manual') => set((s) => {
        const date = today();
        const history = [...(s.profile.levelTest.history ?? []), { date, level, method }].slice(-20);
        return { profile: { ...s.profile, levelTest: { ...s.profile.levelTest, done: true, level, date, method, history, byLevel: s.profile.levelTest.byLevel ?? {} } } };
      }),

      completeWordSet: (chapterId, title, wordIds, answers) => set((s) => {
        const before = Object.keys(s.learning.learnedWords).length;
        const newOnes = wordIds.filter((w) => !s.learning.learnedWords[w]);
        const after = before + newOnes.length;
        const rewards: StudyEvent['rewards'] = [];
        for (let k = Math.floor(before / 10) + 1; k <= Math.floor(after / 10); k++) rewards.push({ eventId: `vocab10:${k}`, xp: 5, reason: `신규 단어 ${k * 10}개 달성` });
        // 챕터 첫 완료(새 단어가 1개 이상 포함된 경우만) — 같은 챕터 반복으로는 다시 지급되지 않음
        if (newOnes.length > 0) rewards.push({ eventId: `wordset:${chapterId}`, stars: 2, xp: 3, reason: `${title} 완료` });
        return applyStudyEvent(s, {
          log: { kind: 'words', refId: chapterId, title: `단어장 · ${title}`, correct: answers.filter((a) => a.correct).length, total: answers.length },
          answers, rewards,
          reviewsToCreate: wordIds.map((w) => ({ kind: 'word' as const, refId: w, conceptId: VOCAB_BY_ID[w]?.grammarId ?? 'a1-u01' })),
          mutate: (l, date) => {
            const learnedWords = { ...l.learnedWords };
            for (const w of newOnes) learnedWords[w] = date;
            return { ...l, learnedWords };
          },
        });
      }),

      toggleSaveExpression: (id) => set((s) => {
        const saved = s.learning.savedExpressions.includes(id) ? s.learning.savedExpressions.filter((x) => x !== id) : [...s.learning.savedExpressions, id];
        const concept = id.startsWith('trv') ? 'expr-travel' : id.startsWith('biz') ? 'expr-business' : id.startsWith('phr') ? 'expr-phrasal' : 'expr-essential';
        const reviews = saved.includes(id) ? createReviewItem(s.learning.reviews, 'expression', id, concept, today()).items : s.learning.reviews;
        return { learning: { ...s.learning, savedExpressions: saved, reviews } };
      }),

      resolveDiscoveryQuiz: (characterId, correct, answers) => {
        let success = false;
        set((s) => {
          const date = today();
          const at = now();
          const learning = applyAnswers(s.learning, answers.map((a) => ({ ...a, id: cid(), date, at })));
          const r = resolveDiscovery(s.game, characterId, correct, date, at);
          success = r.success;
          let next: AppState = { ...s, learning, game: r.state, celebrations: [...s.celebrations, ...(r.success ? [{ kind: 'character' as const, characterId, id: cid() }] : [])] };
          if (r.success) next = queueStory(next, 'first-character');
          return postProcess(next, date);
        });
        return { success };
      },

      setPartner: (id) => {
        const r = setPartnerFn(get().game, id);
        if (r.ok) set({ game: r.state });
        return r.ok;
      },

      claimQuest: (questId) => {
        const s = get();
        const q = QUEST_BY_ID[questId];
        const c = questContext(s);
        if (!q || questStatus(q, c, s.questClaims) !== 'completed') return { ok: false, stars: 0, items: [] };
        const key = claimKey(q, c);
        const at = now();
        let game = earnStars(s.game, key, q.stars, `퀘스트: ${q.title}`, at).state;
        let home = s.home;
        const cel: Celebration[] = [{ kind: 'reward', text: `★ 별 +${q.stars} · ${q.title}`, id: cid() }];
        const items: string[] = [];
        let next: AppState = s;
        if (q.type === 'space') {
          const u = unlockSpace(home, 'garden', homeContext(s), at);
          if (!u.ok && !home.spaces.garden) return { ok: false, stars: 0, items: [] };
          home = u.home;
        }
        for (const id of q.items ?? []) { const g = grantItem(home, id, at); home = g.home; if (g.granted) { items.push(id); cel.push({ kind: 'reward', text: `🎁 ${FURNITURE_BY_ID[id].name} 획득`, id: cid() }); } }
        if (q.xp) game = grantPartnerXp(game, key, q.xp, q.title, cel);
        next = { ...s, game, home, questClaims: { ...s.questClaims, [key]: at }, celebrations: [...s.celebrations, ...cel] };
        if (q.type === 'space') next = queueStory(next, 'garden-open');
        set(postProcess(next, today()));
        return { ok: true, stars: q.stars, items };
      },

      buyFurniture: (itemId) => {
        const s = get();
        const item = FURNITURE_BY_ID[itemId];
        if (!item) return { ok: false, error: 'unknown' };
        const r = buyItem(s.game, s.home, item, now());
        if (!r.ok) return { ok: false, error: r.error };
        let next: AppState = { ...s, game: r.game, home: r.home, celebrations: [...s.celebrations, { kind: 'reward', text: `${item.name} 구매 완료 (★ -${item.price})`, id: cid() }] };
        next = queueStory(next, 'first-purchase');
        set(next);
        return { ok: true };
      },

      commitDecor: (space, draft) => {
        const s = get();
        const r = commitPlacements(s.home, FURNITURE_BY_ID, space, draft);
        if (!r.ok) return { ok: false, changed: false, error: r.error };
        if (!r.changed) return { ok: true, changed: false };
        let next: AppState = { ...s, home: r.home };
        next = queueStory(next, 'first-decorate');
        set(postProcess(next, today()));
        return { ok: true, changed: true };
      },

      addStudyTime: (sec) => set((s) => {
        const d = today();
        return { learning: { ...s.learning, studySeconds: { ...s.learning.studySeconds, [d]: (s.learning.studySeconds[d] ?? 0) + sec } } };
      }),

      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      dismissCelebration: (id) => set((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })),
      markDecorationsSeen: () => set((s) => ({ game: { ...s.game, village: { ...s.game.village, seen: [...s.game.village.unlocked] } } })),
      resetAll: () => set({ ...initialState() }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ version: s.version, profile: s.profile, settings: s.settings, learning: s.learning, game: s.game, home: s.home, questClaims: s.questClaims, celebrations: s.celebrations }),
      migrate: (persisted, v) => migrate(persisted, v) as never,
      merge: (persisted, current) => {
        if (persisted == null) return { ...current };
        const valid = validatePersisted(persisted);
        if (!valid) {
          try { void idbSet(`${STORE_KEY}-corrupt-backup-${Date.now()}`, JSON.stringify(persisted)); } catch { /* noop */ }
          return { ...current, recovered: true };
        }
        return { ...current, ...migrate(valid, STORE_VERSION) };
      },
      onRehydrateStorage: () => () => { useApp.setState({ hydrated: true }); },
    },
  ),
);
