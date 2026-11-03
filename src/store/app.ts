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
  acquireCharacter, applyGrowth, discoveryAvailability, grantReward, growthCheck, initialGameState, markRestudied, resolveDiscovery,
  setPartner as setPartnerFn, updateVillage, type GameState,
} from '@/domain/game/state';
import { COMMON_POOL, RARE_ID, SPECIAL_ID, CHARACTER_BY_ID } from '@/content/characters';
import { GRAMMAR_UNITS } from '@/content/grammar';

export const STORE_KEY = 'english-village-v1';
export const STORE_VERSION = 2;

export const now = () => Date.now();
export const today = () => toDateKey(now());

export type Celebration =
  | { kind: 'reward'; text: string; id: string }
  | { kind: 'character'; characterId: string; id: string }
  | { kind: 'levelup'; characterId: string; id: string }
  | { kind: 'decoration'; decoration: DecorationId; id: string };

export interface Profile {
  onboarded: boolean;
  purpose: string | null;
  dailyMinutes: number;
  levelTest: { done: boolean; level: string | null; byLevel: Record<string, { correct: number; total: number }> | null; date?: string };
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
  dramasDone: Record<string, string>;
  readingsDone: Record<string, string>;
  log: StudyLogEntry[];
  reviewSkippedOn: string | null;
}

export interface AppState {
  version: number;
  profile: Profile;
  settings: Settings;
  learning: LearningState;
  game: GameState;
  celebrations: Celebration[];
  recovered: boolean;
}

const initialLearning = (): LearningState => ({
  answers: [], reviews: {}, wrongNotes: {}, learnedWords: {}, steps: {}, lectureViewed: {}, unitTests: {}, a1Exam: null,
  listeningDone: {}, speakingAttempts: [], expressionsDone: {}, savedExpressions: [], dramasDone: {}, readingsDone: {}, log: [], reviewSkippedOn: null,
});

export const initialState = (): AppState => ({
  version: STORE_VERSION,
  profile: { onboarded: false, purpose: null, dailyMinutes: 15, levelTest: { done: false, level: null, byLevel: null } },
  settings: { dailyNewWords: 10, notificationsOn: true, notifyTime: '20:00', reduceMotion: false, recordingConsent: false, speechRate: 1 },
  learning: initialLearning(),
  game: initialGameState(),
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
  return s as AppState;
}

/** 버전 마이그레이션: 누락된 필드를 기본값으로 채운다 (기존 기록 유지) */
export function migrate(persisted: unknown, fromVersion: number): AppState {
  const base = initialState();
  const s = (persisted ?? {}) as Partial<AppState>;
  const merged: AppState = {
    ...base, ...s,
    profile: { ...base.profile, ...(s.profile ?? {}), levelTest: { ...base.profile.levelTest, ...(s.profile?.levelTest ?? {}) } },
    settings: { ...base.settings, ...(s.settings ?? {}) },
    learning: { ...base.learning, ...(s.learning ?? {}) },
    game: { ...base.game, ...(s.game ?? {}), discovery: { ...base.game.discovery, ...(s.game?.discovery ?? {}) }, village: { ...base.game.village, ...(s.game?.village ?? {}) } },
    version: STORE_VERSION,
  };
  void fromVersion;
  return merged;
}

// ─────────────────────────── 파생 값 ───────────────────────────
export function studiedOn(l: LearningState, date: string) {
  return l.log.some((e) => e.date === date && e.kind !== 'level-test');
}
export function studiedConceptsOn(l: LearningState, date: string) {
  return [...new Set(l.answers.filter((a) => a.date === date && a.source !== 'level-test').map((a) => a.conceptId))];
}
export function villageStats(s: AppState) {
  return {
    studySessions: s.learning.log.filter((e) => e.kind !== 'level-test').length,
    wordsLearned: Object.keys(s.learning.learnedWords).length,
    lecturesCompleted: GRAMMAR_UNITS.filter((u) => s.learning.steps[`${u.id}:practice`]).length,
    unitTestsPassed: Object.values(s.learning.unitTests).filter((t) => t.passed).length,
    charactersOwned: Object.keys(s.game.characters).length,
  };
}
export function discoveryInfo(s: AppState) {
  const d = today();
  return discoveryAvailability(s.game, { studiedToday: studiedOn(s.learning, d), studiedConcepts: studiedConceptsOn(s.learning, d), commonPool: COMMON_POOL });
}

let seq = 0;
const cid = () => `${now().toString(36)}-${(seq++).toString(36)}`;

// ─────────────────────────── 이벤트 처리 공통 ───────────────────────────
interface StudyEvent {
  log: Omit<StudyLogEntry, 'id' | 'date' | 'at'>;
  answers?: Omit<UserAnswer, 'id' | 'date' | 'at'>[];
  reviewsToCreate?: { kind: ReviewKind; refId: string; conceptId: string }[];
  rewards?: { eventId: string; points?: number; xp?: number; reason: string }[];
  /** 학습 상태 업데이트 */
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
      // 다른 날 다시 맞히거나 복습에서 맞히면 해결 처리 (기록은 남김)
      wrongNotes[a.questionId] = { ...prev, resolved: true };
    }
  }
  return { ...l, answers: [...l.answers, ...answers].slice(-5000), wrongNotes };
}

function postProcess(s: AppState, date: string): AppState {
  // 마을 성장
  const v = updateVillage(s.game, villageStats(s));
  let next: AppState = { ...s, game: v.state };
  const cel: Celebration[] = v.newlyUnlocked.map((d) => ({ kind: 'decoration', decoration: d, id: cid() }));
  // 캐릭터 성장 판정 (보유 캐릭터 전체 — 파트너 변경과 무관하게 각자 기록 유지)
  const mastery = computeMastery(next.learning.answers);
  for (const uc of Object.values(next.game.characters)) {
    const ch = CHARACTER_BY_ID[uc.id];
    const g = applyGrowth(next.game, uc.id, growthCheck(uc, mastery[ch.conceptId]), date);
    if (g.grew) { next = { ...next, game: g.state }; cel.push({ kind: 'levelup', characterId: uc.id, id: cid() }); }
  }
  return { ...next, celebrations: [...next.celebrations, ...cel] };
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
    if (r.points) {
      const g = grantReward(game, { eventId: r.eventId, type: 'discovery-points', amount: r.points, reason: r.reason, at });
      game = g.state;
      if (g.granted) cel.push({ kind: 'reward', text: `발견 포인트 +${r.points} · ${r.reason}`, id: cid() });
    }
    const pid = game.partnerId;
    if (r.xp && pid) {
      const g = grantReward(game, { eventId: `${r.eventId}:xp`, type: 'growth-xp', amount: r.xp, characterId: pid, reason: r.reason, at });
      game = g.state;
      if (g.granted) cel.push({ kind: 'reward', text: `${CHARACTER_BY_ID[pid].name} 성장 경험치 +${r.xp}`, id: cid() });
    }
  }
  return postProcess({ ...s, learning, game, celebrations: [...s.celebrations, ...cel] }, date);
}

// ─────────────────────────── 스토어 ───────────────────────────
type Ans = Omit<UserAnswer, 'id' | 'date' | 'at'>;

export interface Actions {
  completeOnboarding: (purpose: string, minutes: number) => void;
  saveLevelTest: (level: string, byLevel: Record<string, { correct: number; total: number }>, answers: Ans[]) => void;
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
  resolveDiscoveryQuiz: (characterId: string, correct: number, answers: Ans[]) => { success: boolean };
  setPartner: (id: string) => boolean;
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

      completeOnboarding: (purpose, minutes) => set((s) => ({ profile: { ...s.profile, onboarded: true, purpose, dailyMinutes: minutes } })),

      saveLevelTest: (level, byLevel, answers) => set((s) => {
        const date = today();
        const at = now();
        const learning = { ...s.learning, answers: [...s.learning.answers, ...answers.map((a) => ({ ...a, id: cid(), date, at }))], log: [...s.learning.log, { id: cid(), date, at, kind: 'level-test' as const, refId: 'level-test', title: '레벨 진단', correct: answers.filter((a) => a.correct).length, total: answers.length }] };
        return { learning, profile: { ...s.profile, levelTest: { done: true, level, byLevel, date } } };
      }),

      completeWords: (unitId, wordIds, answers) => set((s) => {
        const before = Object.keys(s.learning.learnedWords).length;
        const newOnes = wordIds.filter((w) => !s.learning.learnedWords[w]);
        const after = before + newOnes.length;
        const rewards: StudyEvent['rewards'] = [];
        // 신규 단어 10개마다 +10 (단어 누적 개수 기준 고유 이벤트 → 같은 단어 반복으로는 지급되지 않음)
        for (let k = Math.floor(before / 10) + 1; k <= Math.floor(after / 10); k++) rewards.push({ eventId: `vocab10:${k}`, points: 10, reason: `신규 단어 ${k * 10}개 달성` });
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
          log: { kind: 'practice', refId: unitId, title: `${u.title} 확인 문제`, correct: answers.filter((a) => a.correct).length, total: answers.length },
          answers,
          reviewsToCreate: done ? [{ kind: 'grammar', refId: unitId, conceptId: unitId }] : [],
          rewards: done ? [{ eventId: `grammar:${unitId}`, points: 15, reason: `${u.title} 강의·확인 문제 완료` }] : [],
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
            rewards: passed ? [{ eventId: `unittest:${unitId}`, points: 10, reason: `${u.title} 단원 평가 통과` }] : [],
            mutate: (l, date) => {
              const prev = l.unitTests[unitId];
              const rec = { date, correct: answers.filter((a) => a.correct).length, total: answers.length, passed };
              const unitTests = { ...l.unitTests, [unitId]: prev?.passed && !passed ? prev : rec }; // 통과 기록은 덮어쓰지 않음
              const steps = passed && !l.steps[`${unitId}:test`] ? { ...l.steps, [`${unitId}:test`]: date } : l.steps;
              return { ...l, unitTests, steps };
            },
          });
          if (passed) {
            // 단원 평가 통과 → 희귀 캐릭터 확정 획득 (최초 1회)
            const r = acquireCharacter(next.game, RARE_ID, today(), 'rare:first-unit-test', '단원 평가 통과', now());
            if (r.acquired) next = postProcess({ ...next, game: r.state, celebrations: [...next.celebrations, { kind: 'character', characterId: RARE_ID, id: cid() }] }, today());
          }
          return next;
        });
        return { passed };
      },

      completeListening: (dialogueId, conceptId, title, answers, kind = 'listening') => set((s) => applyStudyEvent(s, {
        log: { kind, refId: dialogueId, title, correct: answers.filter((a) => a.correct).length, total: answers.length },
        answers,
        reviewsToCreate: [{ kind: 'dialogue', refId: dialogueId, conceptId }],
        rewards: [{ eventId: `listening:${dialogueId}`, points: 5, reason: `${title} 듣기 완료` }],
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
          rewards: unitId ? [{ eventId: `speaking:${unitId}`, points: 5, reason: '따라 말하기 완료' }] : [],
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
        rewards: [{ eventId: `reading:${readingId}`, points: 5, reason: `독해 "${title}" 완료` }],
        mutate: (l, date) => (l.readingsDone[readingId] ? l : { ...l, readingsDone: { ...l.readingsDone, [readingId]: date } }),
      })),

      completeExpression: (exprId, conceptId, title, answers) => set((s) => applyStudyEvent(s, {
        log: { kind: 'expression', refId: exprId, title, correct: answers.filter((a) => a.correct).length, total: answers.length },
        answers,
        reviewsToCreate: [{ kind: 'expression', refId: exprId, conceptId }],
        rewards: [{ eventId: `expr:${exprId}`, points: 2, xp: 3, reason: `표현 "${title}" 학습` }],
        mutate: (l, date) => (l.expressionsDone[exprId] ? l : { ...l, expressionsDone: { ...l.expressionsDone, [exprId]: date } }),
      })),

      completeDrama: (dramaId, title, answers) => set((s) => applyStudyEvent(s, {
        log: { kind: 'video', refId: dramaId, title, correct: answers.filter((a) => a.correct).length, total: answers.length },
        answers,
        reviewsToCreate: [{ kind: 'dialogue', refId: dramaId, conceptId: 'expr-video' }],
        rewards: [{ eventId: `drama:${dramaId}`, points: 10, xp: 5, reason: `미니 드라마 "${title}" 학습` }],
        mutate: (l, date) => (l.dramasDone[dramaId] ? l : { ...l, dramasDone: { ...l.dramasDone, [dramaId]: date } }),
      })),

      completeA1Exam: (answers) => {
        const passed = passRate(answers) >= 0.8;
        set((s) => {
          let next = applyStudyEvent(s, {
            log: { kind: 'a1-exam', refId: 'a1-exam', title: 'A1 레벨 평가', correct: answers.filter((a) => a.correct).length, total: answers.length },
            answers,
            mutate: (l, date) => ({ ...l, a1Exam: l.a1Exam?.passed ? l.a1Exam : { date, correct: answers.filter((a) => a.correct).length, total: answers.length, passed } }),
          });
          if (passed) {
            const r = acquireCharacter(next.game, SPECIAL_ID, today(), 'special:a1-exam', 'A1 레벨 평가 통과', now());
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

      toggleSaveExpression: (id) => set((s) => {
        const saved = s.learning.savedExpressions.includes(id) ? s.learning.savedExpressions.filter((x) => x !== id) : [...s.learning.savedExpressions, id];
        // 저장한 표현은 복습 목록에도 등록
        const reviews = saved.includes(id) ? createReviewItem(s.learning.reviews, 'expression', id, id.startsWith('trv') ? 'expr-travel' : id.startsWith('biz') ? 'expr-business' : id.startsWith('phr') ? 'expr-phrasal' : 'expr-essential', today()).items : s.learning.reviews;
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
          const cel: Celebration[] = r.success ? [{ kind: 'character', characterId, id: cid() }] : [];
          return postProcess({ ...s, learning, game: r.state, celebrations: [...s.celebrations, ...cel] }, date);
        });
        return { success };
      },

      setPartner: (id) => {
        const r = setPartnerFn(get().game, id);
        if (r.ok) set({ game: r.state });
        return r.ok;
      },

      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      dismissCelebration: (id) => set((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })),
      markDecorationsSeen: () => set((s) => ({ game: { ...s.game, village: { ...s.game.village, seen: [...s.game.village.unlocked] } } })),
      resetAll: () => set({ ...initialState() }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ version: s.version, profile: s.profile, settings: s.settings, learning: s.learning, game: s.game, celebrations: s.celebrations }),
      migrate: (persisted, v) => migrate(persisted, v) as never,
      merge: (persisted, current) => {
        if (persisted == null) return { ...current };
        const valid = validatePersisted(persisted);
        if (!valid) {
          // 손상 데이터: 백업 후 초기화 (앱 비정상 종료 방지)
          try { void idbSet(`${STORE_KEY}-corrupt-backup-${Date.now()}`, JSON.stringify(persisted)); } catch { /* noop */ }
          return { ...current, recovered: true };
        }
        return { ...current, ...migrate(valid, STORE_VERSION) };
      },
      onRehydrateStorage: () => () => { useApp.setState({ hydrated: true }); },
    },
  ),
);
