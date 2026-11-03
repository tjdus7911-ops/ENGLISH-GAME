import type { DecorationId, DiscoveryState, RewardTransaction, UserCharacter, VillageProgress } from '../types';
import type { ConceptMastery } from '../learning/mastery';

export const DISCOVERY_COST = 20;
export const LV2_XP = 40;
export const LV2_MIN_REVIEW_DAYS = 2;
export const LV2_MIN_ACCURACY = 0.7;

export interface GameState {
  pointsEarned: number;
  pointsSpent: number;
  characters: Record<string, UserCharacter>;
  partnerId: string | null;
  ledger: Record<string, RewardTransaction>;
  discovery: DiscoveryState;
  village: VillageProgress;
}

export const initialGameState = (): GameState => ({
  pointsEarned: 0,
  pointsSpent: 0,
  characters: {},
  partnerId: null,
  ledger: {},
  discovery: { pendingCharacterId: null, requireRestudy: false, attempts: 0 },
  village: { unlocked: [], seen: [] },
});

export const availablePoints = (s: GameState) => s.pointsEarned - s.pointsSpent;

/** 고유 이벤트 id 기반 보상 지급. 같은 eventId 는 두 번 지급하지 않는다. */
export function grantReward(s: GameState, tx: RewardTransaction): { state: GameState; granted: boolean } {
  if (s.ledger[tx.eventId]) return { state: s, granted: false };
  let next: GameState = { ...s, ledger: { ...s.ledger, [tx.eventId]: tx } };
  if (tx.type === 'discovery-points') next = { ...next, pointsEarned: next.pointsEarned + tx.amount };
  if (tx.type === 'growth-xp' && tx.characterId && next.characters[tx.characterId]) {
    const c = next.characters[tx.characterId];
    next = { ...next, characters: { ...next.characters, [c.id]: { ...c, xp: c.xp + tx.amount } } };
  }
  return { state: next, granted: true };
}

export function acquireCharacter(s: GameState, id: string, today: string, eventId: string, reason: string, at: number): { state: GameState; acquired: boolean } {
  if (s.characters[id]) return { state: s, acquired: false }; // 중복 획득 방지
  const { state, granted } = grantReward(s, { eventId, type: 'character', amount: 1, characterId: id, reason, at });
  if (!granted) return { state: s, acquired: false };
  const uc: UserCharacter = { id, acquiredOn: today, level: 1, xp: 0 };
  return {
    state: { ...state, characters: { ...state.characters, [id]: uc }, partnerId: state.partnerId ?? id }, // 최초 획득 시 자동 파트너
    acquired: true,
  };
}

export function setPartner(s: GameState, id: string): { state: GameState; ok: boolean } {
  if (!s.characters[id]) return { state: s, ok: false }; // 미보유 캐릭터 지정 불가
  return { state: { ...s, partnerId: id }, ok: true };
}

// ── 발견 ──
export interface DiscoveryContext {
  studiedToday: boolean;
  /** 오늘 학습한 개념 (발견 캐릭터 우선순위) */
  studiedConcepts: string[];
  commonPool: { id: string; conceptId: string }[];
}

export type DiscoveryAvailability =
  | { ok: true; characterId: string }
  | { ok: false; reason: 'no-study' | 'points' | 'restudy' | 'all-collected'; need?: number };

export function discoveryAvailability(s: GameState, ctx: DiscoveryContext): DiscoveryAvailability {
  const remaining = ctx.commonPool.filter((c) => !s.characters[c.id]);
  if (remaining.length === 0) return { ok: false, reason: 'all-collected' };
  if (s.discovery.requireRestudy) return { ok: false, reason: 'restudy' };
  if (!ctx.studiedToday) return { ok: false, reason: 'no-study' };
  const pts = availablePoints(s);
  if (pts < DISCOVERY_COST) return { ok: false, reason: 'points', need: DISCOVERY_COST - pts };
  if (s.discovery.pendingCharacterId && remaining.some((c) => c.id === s.discovery.pendingCharacterId)) {
    return { ok: true, characterId: s.discovery.pendingCharacterId };
  }
  const preferred = remaining.find((c) => ctx.studiedConcepts.includes(c.conceptId)) ?? remaining[0];
  return { ok: true, characterId: preferred.id };
}

export const DISCOVERY_PASS = 2; // 3문제 중 2문제 이상

export function resolveDiscovery(
  s: GameState,
  characterId: string,
  correct: number,
  today: string,
  at: number,
): { state: GameState; success: boolean } {
  if (correct >= DISCOVERY_PASS) {
    const r = acquireCharacter(s, characterId, today, `discover:${characterId}`, '발견 퀴즈 통과', at);
    if (!r.acquired) return { state: s, success: false };
    return {
      state: {
        ...r.state,
        pointsSpent: r.state.pointsSpent + DISCOVERY_COST,
        discovery: { pendingCharacterId: null, requireRestudy: false, attempts: 0 },
      },
      success: true,
    };
  }
  return {
    state: { ...s, discovery: { pendingCharacterId: characterId, requireRestudy: true, lastFailedOn: today, attempts: s.discovery.attempts + 1 } },
    success: false,
  };
}

/** 재학습(새 학습 이벤트) 완료 시 재도전 허용 */
export const markRestudied = (s: GameState): GameState =>
  s.discovery.requireRestudy ? { ...s, discovery: { ...s.discovery, requireRestudy: false } } : s;

// ── 성장 ──
export interface GrowthCheck {
  eligible: boolean;
  xpOk: boolean;
  reviewDaysOk: boolean;
  accuracyOk: boolean;
  xp: number;
  reviewDays: number;
  accuracy: number | null;
}

export function growthCheck(uc: UserCharacter | undefined, conceptMastery: ConceptMastery | undefined): GrowthCheck {
  const xp = uc?.xp ?? 0;
  const reviewDays = conceptMastery?.reviewDays ?? 0;
  const accuracy = conceptMastery ? conceptMastery.recentAccuracy : null;
  const xpOk = xp >= LV2_XP;
  const reviewDaysOk = reviewDays >= LV2_MIN_REVIEW_DAYS;
  const accuracyOk = accuracy !== null && accuracy >= LV2_MIN_ACCURACY;
  return { eligible: !!uc && uc.level === 1 && xpOk && reviewDaysOk && accuracyOk, xpOk, reviewDaysOk, accuracyOk, xp, reviewDays, accuracy };
}

export function applyGrowth(s: GameState, characterId: string, check: GrowthCheck, today: string): { state: GameState; grew: boolean } {
  const uc = s.characters[characterId];
  if (!uc || !check.eligible) return { state: s, grew: false };
  return { state: { ...s, characters: { ...s.characters, [characterId]: { ...uc, level: 2, leveledUpOn: today } } }, grew: true };
}

// ── 마을 ──
export interface VillageStats {
  studySessions: number;
  wordsLearned: number;
  lecturesCompleted: number;
  unitTestsPassed: number;
  charactersOwned: number;
}

export const DECORATION_RULES: { id: DecorationId; label: string; rule: string; test: (v: VillageStats) => boolean }[] = [
  { id: 'flowers', label: '꽃밭', rule: '첫 학습 완료', test: (v) => v.studySessions >= 1 },
  { id: 'residents', label: '마을 주민', rule: '첫 캐릭터 획득', test: (v) => v.charactersOwned >= 1 },
  { id: 'tree', label: '큰 나무', rule: '영단어 30개 학습', test: (v) => v.wordsLearned >= 30 },
  { id: 'library-banner', label: '도서관 장식', rule: '문법 강의 1개 완료', test: (v) => v.lecturesCompleted >= 1 },
  { id: 'garden', label: '정원 확장', rule: '단원 평가 2개 통과 또는 단어 100개', test: (v) => v.unitTestsPassed >= 2 || v.wordsLearned >= 100 },
  { id: 'pond-bridge', label: '연못 다리', rule: '캐릭터 3마리 보유', test: (v) => v.charactersOwned >= 3 },
];

/** 장식은 한 번 해금되면 유지 (단조 증가) */
export function updateVillage(s: GameState, stats: VillageStats): { state: GameState; newlyUnlocked: DecorationId[] } {
  const newly = DECORATION_RULES.filter((r) => r.test(stats) && !s.village.unlocked.includes(r.id)).map((r) => r.id);
  if (!newly.length) return { state: s, newlyUnlocked: [] };
  return { state: { ...s, village: { ...s.village, unlocked: [...s.village.unlocked, ...newly] } }, newlyUnlocked: newly };
}

export const villageStage = (s: GameState) => s.village.unlocked.length; // 0..6
