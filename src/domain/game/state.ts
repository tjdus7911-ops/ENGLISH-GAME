import type { DecorationId, DiscoveryState, RewardTransaction, UserCharacter, VillageProgress } from '../types';
import type { ConceptMastery } from '../learning/mastery';

export const LV2_XP = 60;
export const LV2_MIN_REVIEW_DAYS = 2;
export const LV2_MIN_ACCURACY = 0.7;

/** 별(★) 거래 — 지급(+)/소비(-) 모두 기록. eventId 가 같으면 한 번만 처리 */
export interface StarTx { eventId: string; amount: number; reason: string; at: number }

export interface GameState {
  stars: Record<string, StarTx>;
  characters: Record<string, UserCharacter>;
  partnerId: string | null;
  /** 성장 XP·캐릭터 획득 등 별 이외의 보상 기록 (중복 방지 키) */
  ledger: Record<string, RewardTransaction>;
  discovery: DiscoveryState;
  village: VillageProgress;
}

export const initialGameState = (): GameState => ({
  stars: {},
  characters: {},
  partnerId: null,
  ledger: {},
  discovery: { unlocked: [], restudy: {}, attempts: 0 },
  village: { unlocked: [], seen: [], level: 1 },
});

// ── 별 ──
export const starBalance = (s: { stars: Record<string, StarTx> }) => Object.values(s.stars).reduce((a, t) => a + t.amount, 0);
export const starsEarned = (s: { stars: Record<string, StarTx> }) => Object.values(s.stars).filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);

export function earnStars(s: GameState, eventId: string, amount: number, reason: string, at: number): { state: GameState; granted: boolean } {
  if (amount <= 0 || s.stars[eventId]) return { state: s, granted: false };
  return { state: { ...s, stars: { ...s.stars, [eventId]: { eventId, amount, reason, at } } }, granted: true };
}

/** 별 소비. 잔액이 부족하면 실패 (잔액 음수 불가) */
export function spendStars(s: GameState, eventId: string, amount: number, reason: string, at: number): { state: GameState; ok: boolean; error?: 'insufficient' | 'duplicate' } {
  if (s.stars[eventId]) return { state: s, ok: false, error: 'duplicate' };
  if (amount < 0 || starBalance(s) < amount) return { state: s, ok: false, error: 'insufficient' };
  return { state: { ...s, stars: { ...s.stars, [eventId]: { eventId, amount: -amount, reason, at } } }, ok: true };
}

/** 고유 이벤트 id 기반 보상(성장 XP·캐릭터). 같은 eventId 는 두 번 지급하지 않는다. */
export function grantReward(s: GameState, tx: RewardTransaction): { state: GameState; granted: boolean } {
  if (s.ledger[tx.eventId]) return { state: s, granted: false };
  let next: GameState = { ...s, ledger: { ...s.ledger, [tx.eventId]: tx } };
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

// ── 발견 (학습 성취 기반) ──
export interface DiscoveryMilestone { characterId: string; label: string; test: (v: MilestoneStats) => boolean }
export interface MilestoneStats { wordsLearned: number; lecturesCompleted: number; listeningDone: number; speakingSentences: number }

/** 일반 캐릭터 발견 조건: 실제 학습 목표 달성 시 발견 이벤트가 열린다 */
export const DISCOVERY_MILESTONES: DiscoveryMilestone[] = [
  { characterId: 'mossy', label: '첫 영단어 10개 학습', test: (v) => v.wordsLearned >= 10 },
  { characterId: 'plip', label: '첫 문법 강의·확인 문제 완료', test: (v) => v.lecturesCompleted >= 1 },
  { characterId: 'lumi', label: '첫 듣기 수업 완료', test: (v) => v.listeningDone >= 1 },
  { characterId: 'cobi', label: '서로 다른 말하기 문장 5개 연습', test: (v) => v.speakingSentences >= 5 },
];

/** 새로 달성한 발견 조건을 열어 둔다 (한 번 열리면 유지) */
export function updateDiscoveries(s: GameState, v: MilestoneStats): { state: GameState; opened: string[] } {
  const opened = DISCOVERY_MILESTONES.filter((m) => m.test(v) && !s.discovery.unlocked.includes(m.characterId) && !s.characters[m.characterId]).map((m) => m.characterId);
  if (!opened.length) return { state: s, opened };
  return { state: { ...s, discovery: { ...s.discovery, unlocked: [...s.discovery.unlocked, ...opened] } }, opened };
}

export type DiscoveryAvailability =
  | { ok: true; characterId: string }
  | { ok: false; reason: 'none' | 'restudy' | 'all-collected'; restudyId?: string };

export function discoveryAvailability(s: GameState, commonIds: string[]): DiscoveryAvailability {
  if (commonIds.every((id) => s.characters[id])) return { ok: false, reason: 'all-collected' };
  const open = s.discovery.unlocked.filter((id) => !s.characters[id]);
  const ready = open.find((id) => !s.discovery.restudy[id]);
  if (ready) return { ok: true, characterId: ready };
  if (open.length) return { ok: false, reason: 'restudy', restudyId: open[0] };
  return { ok: false, reason: 'none' };
}

export const DISCOVERY_PASS = 2; // 3문제 중 2문제 이상

export function resolveDiscovery(s: GameState, characterId: string, correct: number, today: string, at: number): { state: GameState; success: boolean } {
  if (!s.discovery.unlocked.includes(characterId)) return { state: s, success: false };
  if (correct >= DISCOVERY_PASS) {
    const r = acquireCharacter(s, characterId, today, `discover:${characterId}`, '발견 퀴즈 통과', at);
    if (!r.acquired) return { state: s, success: false };
    const restudy = { ...r.state.discovery.restudy };
    delete restudy[characterId];
    return { state: { ...r.state, discovery: { ...r.state.discovery, restudy } }, success: true };
  }
  return { state: { ...s, discovery: { ...s.discovery, restudy: { ...s.discovery.restudy, [characterId]: today }, attempts: s.discovery.attempts + 1 } }, success: false };
}

/** 재학습(새 학습 이벤트) 완료 시 재도전 허용 */
export const markRestudied = (s: GameState): GameState =>
  Object.keys(s.discovery.restudy).length ? { ...s, discovery: { ...s.discovery, restudy: {} } } : s;

// ── 성장 ──
export interface GrowthCheck {
  eligible: boolean; xpOk: boolean; reviewDaysOk: boolean; accuracyOk: boolean; xp: number; reviewDays: number; accuracy: number | null;
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
  gardenOpen: boolean;
}

export const DECORATION_RULES: { id: DecorationId; label: string; rule: string; test: (v: VillageStats) => boolean }[] = [
  { id: 'flowers', label: '꽃밭', rule: '첫 학습 완료', test: (v) => v.studySessions >= 1 },
  { id: 'residents', label: '마을 주민', rule: '첫 캐릭터 획득', test: (v) => v.charactersOwned >= 1 },
  { id: 'tree', label: '큰 나무', rule: '영단어 30개 학습', test: (v) => v.wordsLearned >= 30 },
  { id: 'library-banner', label: '도서관 장식', rule: '문법 강의 1개 완료', test: (v) => v.lecturesCompleted >= 1 },
  { id: 'garden', label: '정원 확장', rule: '단원 평가 2개 통과 또는 단어 100개', test: (v) => v.unitTestsPassed >= 2 || v.wordsLearned >= 100 },
  { id: 'pond-bridge', label: '연못 다리', rule: '캐릭터 3마리 보유', test: (v) => v.charactersOwned >= 3 },
];

/** 마을 3단계: 누적 학습 성취 기준. 한 번 오른 단계는 내려가지 않는다 */
export const VILLAGE_LEVELS: { level: 1 | 2 | 3; title: string; desc: string; rule: string; test: (v: VillageStats) => boolean }[] = [
  { level: 1, title: '작은 숲속 마을', desc: '작은 집·기본 건물·나무와 길', rule: '처음 상태', test: () => true },
  { level: 2, title: '꽃피는 마을', desc: '꽃밭 확장·연못 장식·가로등·캐릭터 활동 증가', rule: '문법 강의 2개 + 영단어 30개', test: (v) => v.lecturesCompleted >= 2 && v.wordsLearned >= 30 },
  { level: 3, title: '풍성한 숲의 마을', desc: '정원·건물 외관 변화·풍부한 자연', rule: '비밀 정원 개방 또는 단원 평가 3개 통과', test: (v) => v.gardenOpen || v.unitTestsPassed >= 3 },
];

export function updateVillage(s: GameState, stats: VillageStats): { state: GameState; newlyUnlocked: DecorationId[]; leveledTo: number | null } {
  const newly = DECORATION_RULES.filter((r) => r.test(stats) && !s.village.unlocked.includes(r.id)).map((r) => r.id);
  const reach = Math.max(...VILLAGE_LEVELS.filter((l) => l.test(stats)).map((l) => l.level)) as 1 | 2 | 3;
  const level = Math.max(s.village.level ?? 1, reach) as 1 | 2 | 3;
  const leveledTo = level > (s.village.level ?? 1) ? level : null;
  if (!newly.length && !leveledTo) return { state: s, newlyUnlocked: [], leveledTo: null };
  return { state: { ...s, village: { ...s.village, unlocked: [...s.village.unlocked, ...newly], level } }, newlyUnlocked: newly, leveledTo };
}

export const villageStage = (s: GameState) => s.village.level ?? 1;
