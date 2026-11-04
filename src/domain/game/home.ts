/** 집 꾸미기·정원·공간 해금 규칙 (순수 함수). 카탈로그는 src/content/furniture.ts */
import { spendStars, starBalance, type GameState } from './state';

export type SpaceId = 'house' | 'garden';
export type ItemCategory =
  | 'bed' | 'desk' | 'chair' | 'bookshelf' | 'sofa' | 'lamp' | 'rug' | 'plant' | 'frame' | 'wallpaper' | 'floor'
  | 'flowerbed' | 'tree' | 'bench' | 'fountain' | 'gardenlight' | 'path';
export type Rarity = 'basic' | 'common' | 'rare' | 'special';

export type UnlockCondition =
  | { type: 'none' }
  | { type: 'houseLevel'; level: number }
  | { type: 'reward'; label: string } // 업적·진화·공간 개방 보상으로만 획득 (판매 안 함)
  | { type: 'garden' };

export interface FurnitureItem {
  itemId: string;
  name: string;
  category: ItemCategory;
  space: SpaceId;
  rarity: Rarity;
  price: number; // 0 = 판매하지 않음(기본 지급/보상)
  unlockCondition: UnlockCondition;
  assetPath: string; // SVG 에셋 키 (src/components/FurnitureArt.tsx)
  placementSlot: ItemCategory;
  colors: string[];
}

export interface OwnedItem { itemId: string; acquiredAt: number; source: 'default' | 'purchase' | 'reward' }

export interface HomeState {
  inventory: Record<string, OwnedItem>;
  placements: Record<SpaceId, Record<string, string | null>>; // slotId → itemId
  decorateCount: number; // 배치 확정 횟수 (변경이 있을 때만)
  purchases: number;
  houseLevel: number; // 단조 증가
  spaces: Record<string, { unlockedAt: number }>; // 'garden' 등
  storiesSeen: string[];
}

export interface Slot { id: string; accepts: ItemCategory; label: string; x: number; y: number }

export const HOUSE_SLOTS: Slot[] = [
  { id: 'wallpaper', accepts: 'wallpaper', label: '벽지', x: 300, y: 70 },
  { id: 'floor', accepts: 'floor', label: '바닥', x: 200, y: 300 },
  { id: 'frame', accepts: 'frame', label: '액자', x: 100, y: 118 },
  { id: 'desk', accepts: 'desk', label: '책상', x: 140, y: 182 },
  { id: 'bookshelf', accepts: 'bookshelf', label: '책장', x: 62, y: 212 },
  { id: 'bed', accepts: 'bed', label: '침대', x: 282, y: 188 },
  { id: 'lamp', accepts: 'lamp', label: '조명', x: 352, y: 222 },
  { id: 'chair', accepts: 'chair', label: '의자', x: 168, y: 210 },
  { id: 'rug', accepts: 'rug', label: '러그', x: 205, y: 236 },
  { id: 'plant', accepts: 'plant', label: '화분', x: 108, y: 262 },
  { id: 'sofa', accepts: 'sofa', label: '소파', x: 262, y: 276 },
];

export const GARDEN_SLOTS: Slot[] = [
  { id: 'tree1', accepts: 'tree', label: '나무 1', x: 74, y: 176 },
  { id: 'tree2', accepts: 'tree', label: '나무 2', x: 326, y: 176 },
  { id: 'path1', accepts: 'path', label: '산책로 1', x: 200, y: 160 },
  { id: 'light1', accepts: 'gardenlight', label: '조명 1', x: 134, y: 168 },
  { id: 'light2', accepts: 'gardenlight', label: '조명 2', x: 266, y: 168 },
  { id: 'bed1', accepts: 'flowerbed', label: '꽃밭 1', x: 112, y: 222 },
  { id: 'fountain', accepts: 'fountain', label: '분수', x: 200, y: 226 },
  { id: 'bed2', accepts: 'flowerbed', label: '꽃밭 2', x: 288, y: 222 },
  { id: 'bench1', accepts: 'bench', label: '벤치', x: 128, y: 272 },
  { id: 'path2', accepts: 'path', label: '산책로 2', x: 272, y: 272 },
  { id: 'bed3', accepts: 'flowerbed', label: '꽃밭 3', x: 200, y: 296 },
];

export const SLOTS: Record<SpaceId, Slot[]> = { house: HOUSE_SLOTS, garden: GARDEN_SLOTS };

export interface HomeContext {
  lecturesCompleted: number; // 확인 문제까지 완료한 문법 단원 수
  unitTestsPassed: number;
  a1ExamScore: number | null; // 0~100
}

export const initialHomeState = (defaults: string[]): HomeState => ({
  inventory: Object.fromEntries(defaults.map((id) => [id, { itemId: id, acquiredAt: 0, source: 'default' as const }])),
  placements: { house: {}, garden: {} },
  decorateCount: 0,
  purchases: 0,
  houseLevel: 1,
  spaces: {},
  storiesSeen: [],
});

export function isItemUnlocked(item: FurnitureItem, home: HomeState): boolean {
  const c = item.unlockCondition;
  if (c.type === 'none') return true;
  if (c.type === 'houseLevel') return home.houseLevel >= c.level;
  if (c.type === 'garden') return !!home.spaces.garden;
  return false; // reward 전용
}

export type BuyError = 'owned' | 'locked' | 'not-for-sale' | 'insufficient';

/** 가구 구매: 별 소비 + 보관함 추가 (잔액 부족·미해금·중복 구매 불가) */
export function buyItem(game: GameState, home: HomeState, item: FurnitureItem, at: number): { game: GameState; home: HomeState; ok: boolean; error?: BuyError } {
  if (home.inventory[item.itemId]) return { game, home, ok: false, error: 'owned' };
  if (item.price <= 0 || item.unlockCondition.type === 'reward') return { game, home, ok: false, error: 'not-for-sale' };
  if (!isItemUnlocked(item, home)) return { game, home, ok: false, error: 'locked' };
  if (starBalance(game) < item.price) return { game, home, ok: false, error: 'insufficient' };
  const r = spendStars(game, `buy:${item.itemId}`, item.price, `${item.name} 구매`, at);
  if (!r.ok) return { game, home, ok: false, error: 'insufficient' };
  return { game: r.state, home: { ...home, inventory: { ...home.inventory, [item.itemId]: { itemId: item.itemId, acquiredAt: at, source: 'purchase' } }, purchases: home.purchases + 1 }, ok: true };
}

/** 보상 아이템 지급 (중복 없음) */
export function grantItem(home: HomeState, itemId: string, at: number): { home: HomeState; granted: boolean } {
  if (home.inventory[itemId]) return { home, granted: false };
  return { home: { ...home, inventory: { ...home.inventory, [itemId]: { itemId, acquiredAt: at, source: 'reward' } } }, granted: true };
}

export type PlaceError = 'not-owned' | 'wrong-slot' | 'unknown-slot' | 'space-locked' | 'duplicate';

/** 배치 초안 검증: 보유한 아이템만, 슬롯 종류가 맞을 때만 */
export function validatePlacement(home: HomeState, catalog: Record<string, FurnitureItem>, space: SpaceId, slotId: string, itemId: string | null): PlaceError | null {
  if (space === 'garden' && !home.spaces.garden) return 'space-locked';
  const slot = SLOTS[space].find((s) => s.id === slotId);
  if (!slot) return 'unknown-slot';
  if (itemId === null) return slot.accepts === 'wallpaper' || slot.accepts === 'floor' ? 'wrong-slot' : null; // 벽지·바닥은 비울 수 없음
  if (!home.inventory[itemId]) return 'not-owned';
  const item = catalog[itemId];
  if (!item || item.placementSlot !== slot.accepts || item.space !== space) return 'wrong-slot';
  return null;
}

/** 슬롯에 아이템 놓기(초안): 같은 아이템이 다른 슬롯에 있으면 그 슬롯은 비운다(=이동). 교체된 기존 아이템은 보관함에 남는다. */
export function placeInDraft(current: Record<string, string | null | undefined>, draft: Record<string, string | null>, slotId: string, itemId: string | null): Record<string, string | null> {
  const next = { ...draft, [slotId]: itemId };
  if (itemId) for (const [k, v] of Object.entries({ ...current, ...draft })) if (k !== slotId && v === itemId) next[k] = null;
  return next;
}

/** 미리보기 초안을 확정. 바뀐 것이 있으면 꾸미기 횟수 +1. 교체된 아이템은 보관함에 그대로 남는다. */
export function commitPlacements(home: HomeState, catalog: Record<string, FurnitureItem>, space: SpaceId, draft: Record<string, string | null>): { home: HomeState; ok: boolean; changed: boolean; error?: PlaceError } {
  for (const [slotId, itemId] of Object.entries(draft)) {
    const e = validatePlacement(home, catalog, space, slotId, itemId);
    if (e) return { home, ok: false, changed: false, error: e };
  }
  const prev = home.placements[space] ?? {};
  const next = { ...prev, ...draft };
  // 같은 가구는 1개만 보유 → 두 슬롯에 동시에 놓을 수 없다 (오류 시 기존 배치 그대로)
  const used = Object.values(next).filter((id): id is string => !!id);
  if (new Set(used).size !== used.length) return { home, ok: false, changed: false, error: 'duplicate' };
  const changed = Object.keys(next).some((k) => (prev[k] ?? null) !== (next[k] ?? null));
  if (!changed) return { home, ok: true, changed: false };
  return { home: { ...home, placements: { ...home.placements, [space]: next }, decorateCount: home.decorateCount + 1 }, ok: true, changed: true };
}

/** 배치된 아이템 중 구매·보상(기본 지급 제외) 아이템 수 */
export function decoratedItemCount(home: HomeState, space: SpaceId = 'house') {
  return Object.values(home.placements[space] ?? {}).filter((id) => id && home.inventory[id] && home.inventory[id].source !== 'default').length;
}

// ── 집 성장 ──
export const HOUSE_LEVELS: { level: number; title: string; rule: string; implemented: boolean }[] = [
  { level: 1, title: '낡은 작은 방', rule: '처음 상태', implemented: true },
  { level: 2, title: '아늑한 나의 방', rule: '새 가구 3개 배치 + 문법 단원 2개 완료', implemented: true },
  { level: 3, title: '정원 개방', rule: '비밀 정원 개방', implemented: true },
  { level: 4, title: '작업실 개방', rule: '후속 업데이트 예정', implemented: false },
  { level: 5, title: '테라스 & 휴식 공간', rule: '후속 업데이트 예정', implemented: false },
];

export function computeHouseLevel(home: HomeState, ctx: HomeContext): number {
  let lv = 1;
  if (decoratedItemCount(home) >= 3 && ctx.lecturesCompleted >= 2) lv = 2;
  if (lv >= 2 && home.spaces.garden) lv = 3;
  return Math.max(home.houseLevel, lv); // 가구를 바꿔도 내려가지 않음
}

// ── 공간 해금 ──
export interface SpaceDef {
  id: string;
  name: string;
  desc: string;
  implemented: boolean;
  conditions: { label: string; test: (h: HomeState, c: HomeContext) => boolean; progress: (h: HomeState, c: HomeContext) => string }[];
}

export const SPACES: SpaceDef[] = [
  {
    id: 'garden', name: '비밀 정원', desc: '꽃밭·나무·분수로 꾸미고 캐릭터와 산책해요.', implemented: true,
    conditions: [
      { label: 'A1 문법 핵심 단원 3개 완료', test: (_h, c) => c.lecturesCompleted >= 3, progress: (_h, c) => `${Math.min(3, c.lecturesCompleted)}/3` },
      { label: '집 꾸미기 3회 이상', test: (h) => h.decorateCount >= 3, progress: (h) => `${Math.min(3, h.decorateCount)}/3` },
      { label: '집 성장 Lv.2 달성', test: (h) => h.houseLevel >= 2, progress: (h) => `Lv.${h.houseLevel}` },
    ],
  },
  {
    id: 'greenhouse', name: '온실', desc: '화분·식물로 꾸미는 공간 (후속 업데이트)', implemented: false,
    conditions: [
      { label: 'A1 문법 핵심 단원 6개 완료', test: (_h, c) => c.lecturesCompleted >= 6, progress: (_h, c) => `${Math.min(6, c.lecturesCompleted)}/6` },
      { label: '정원 장식 4개 이상 배치', test: (h) => decoratedItemCount(h, 'garden') >= 4, progress: (h) => `${Math.min(4, decoratedItemCount(h, 'garden'))}/4` },
      { label: '공간 개방 퀘스트 완료', test: () => false, progress: () => '준비 중' },
    ],
  },
  {
    id: 'lakeside', name: '호숫가', desc: '나무다리·피크닉 공간 (후속 업데이트)', implemented: false,
    conditions: [
      { label: 'A1 문법 핵심 단원 10개 완료', test: (_h, c) => c.lecturesCompleted >= 10, progress: (_h, c) => `${Math.min(10, c.lecturesCompleted)}/10` },
      { label: 'A1 종합평가 80점 이상', test: (_h, c) => (c.a1ExamScore ?? 0) >= 80, progress: (_h, c) => (c.a1ExamScore === null ? '미응시' : `${c.a1ExamScore}점`) },
    ],
  },
];

export const spaceConditionsMet = (id: string, h: HomeState, c: HomeContext) => SPACES.find((s) => s.id === id)!.conditions.every((x) => x.test(h, c));

/** 공간 개방 (조건 충족 시에만, 한 번 열리면 다시 잠기지 않음) */
export function unlockSpace(home: HomeState, id: string, ctx: HomeContext, at: number): { home: HomeState; ok: boolean } {
  const def = SPACES.find((s) => s.id === id);
  if (!def || !def.implemented || home.spaces[id] || !spaceConditionsMet(id, home, ctx)) return { home, ok: false };
  return { home: { ...home, spaces: { ...home.spaces, [id]: { unlockedAt: at } } }, ok: true };
}
