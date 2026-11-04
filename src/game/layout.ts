/**
 * 장면 배치 설정 (논리 좌표 = 배경 이미지 원본 픽셀 좌표).
 * 그래픽 위치·크기·터치 영역은 여기서만 관리하고, 게임 로직(domain/)은 id 로만 참조한다.
 */
import type { DecorationId } from '@/domain/types';

export type Pt = [number, number];

export interface SceneSprite {
  id: string;
  /** 에셋 키 또는 단계별 에셋 키 */
  image: string | Record<number, string>;
  /** 기준점(발밑) 위치 */
  at: Pt;
  /** 표시 너비 (논리 단위) */
  width: number;
}

// ─────────────────────────── 마을 (1024×1280) ───────────────────────────
export const VILLAGE = {
  size: [1024, 1280] as Pt,
  background: 'village/bg',
  buildings: [
    { id: 'home', label: '나의 집', sub: '집 꾸미기 · 파트너', route: '/house', at: [240, 500] as Pt, width: 330,
      image: { 1: 'buildings/home-stage1', 3: 'buildings/home-stage3' }, hit: [[95, 470], [240, 545], [385, 470], [385, 230], [240, 165], [95, 230]] as Pt[] },
    { id: 'library', label: '도서관', sub: '문법 · 독해', route: '/grammar', at: [790, 500] as Pt, width: 340,
      image: { 1: 'buildings/library-stage1', 3: 'buildings/library-stage3' }, hit: [[640, 470], [790, 545], [940, 470], [940, 210], [790, 150], [640, 210]] as Pt[] },
    { id: 'forest', label: '단어 숲', sub: '영단어 · 복습', route: '/words', at: [240, 915] as Pt, width: 340,
      image: { 1: 'buildings/wordforest-stage1', 3: 'buildings/wordforest-stage3' }, hit: [[85, 885], [240, 960], [395, 885], [395, 620], [240, 560], [85, 620]] as Pt[] },
    { id: 'exam', label: '시험장', sub: '단원 평가 · 레벨 테스트', route: '/exam', at: [790, 915] as Pt, width: 320,
      image: { 1: 'buildings/exam-stage1', 3: 'buildings/exam-stage3' }, hit: [[650, 885], [790, 960], [930, 885], [930, 630], [790, 570], [650, 630]] as Pt[] },
  ],
  /** 캐릭터 이동 영역: 중앙 광장 + 아래쪽 공터 (건물·UI 를 가리지 않음) */
  walkArea: [[400, 560], [620, 560], [660, 690], [610, 960], [410, 960], [360, 690]] as Pt[],
  /** 마을 단계(1~3) · 장식 해금에 따라 추가되는 장식 */
  decorations: [
    { id: 'lily-1', image: 'village/deco-lilypad', at: [455, 250], width: 90, when: { level: 2 } },
    { id: 'lily-2', image: 'village/deco-lilypad', at: [560, 215], width: 70, when: { level: 2 } },
    { id: 'lamp-1', image: 'village/deco-lamp', at: [405, 545], width: 46, when: { level: 2 } },
    { id: 'lamp-2', image: 'village/deco-lamp', at: [620, 545], width: 46, when: { level: 2 } },
    { id: 'lamp-3', image: 'village/deco-lamp', at: [395, 735], width: 46, when: { level: 2 } },
    { id: 'lamp-4', image: 'village/deco-lamp', at: [630, 735], width: 46, when: { level: 2 } },
    { id: 'flowers-1', image: 'village/deco-flowerbed-round', at: [512, 430], width: 150, when: { decoration: 'flowers' } },
    { id: 'tree-1', image: 'village/deco-bigtree', at: [70, 690], width: 170, when: { decoration: 'tree' } },
    { id: 'tulips', image: 'village/deco-flowerbed-tulip', at: [512, 1010], width: 220, when: { decoration: 'garden' } },
    { id: 'bridge', image: 'village/deco-bridge', at: [500, 300], width: 190, when: { decoration: 'pond-bridge' } },
    { id: 'arch', image: 'village/deco-garden-arch', at: [512, 1110], width: 130, when: { level: 3 } },
    { id: 'blossom-1', image: 'village/deco-blossom-tree', at: [955, 700], width: 150, when: { level: 3 } },
    { id: 'fence-1', image: 'village/deco-fence', at: [330, 1060], width: 150, when: { level: 3 } },
    { id: 'fence-2', image: 'village/deco-fence', at: [700, 1060], width: 150, when: { level: 3 } },
  ] as (SceneSprite & { when: { level?: number; decoration?: DecorationId } })[],
  characterWidth: 112,
};

export const buildingImage = (b: (typeof VILLAGE.buildings)[number], level: number) => (level >= 3 ? b.image[3] : b.image[1]);

// ─────────────────────────── 집 (1280×1024) ───────────────────────────
export const HOUSE = {
  size: [1280, 1024] as Pt,
  background: 'house/room',
  walls: {
    left: [[50, 300], [640, 25], [640, 340], [60, 640]] as Pt[],
    right: [[640, 25], [1230, 300], [1230, 640], [640, 340]] as Pt[],
    floor: [[640, 340], [1230, 640], [640, 960], [60, 640]] as Pt[],
  },
  /** 슬롯 id(도메인 HOUSE_SLOTS 와 동일) → 화면 위치·표시 너비. anchor 'center' 는 러그·액자 */
  slots: {
    frame: { at: [780, 250] as Pt, width: 130 },
    bookshelf: { at: [470, 480] as Pt, width: 170 },
    desk: { at: [300, 560] as Pt, width: 220 },
    chair: { at: [360, 640] as Pt, width: 110 },
    bed: { at: [930, 580] as Pt, width: 320 },
    lamp: { at: [1150, 650] as Pt, width: 90 },
    rug: { at: [640, 680] as Pt, width: 330 },
    plant: { at: [150, 700] as Pt, width: 110 },
    sofa: { at: [830, 820] as Pt, width: 300 },
  } as Record<string, { at: Pt; width: number }>,
  partnerAt: [560, 760] as Pt,
  partnerWidth: 130,
  /** 가구 상호작용 지점: 해당 슬롯에 가구가 있을 때만 이동. z 를 주면 가구 위에 그린다(소파·침대) */
  interact: {
    desk: { at: [330, 600] as Pt, pose: 'study' as const },
    sofa: { at: [830, 780] as Pt, pose: 'sit' as const, z: 840 },
    bed: { at: [925, 470] as Pt, pose: 'sleep' as const, z: 600 },
  } as Record<string, { at: Pt; pose: 'study' | 'sit' | 'sleep'; z?: number }>,
};

// ─────────────────────────── 정원 (1280×1024) ───────────────────────────
export const GARDEN = {
  size: [1280, 1024] as Pt,
  background: 'garden/bg',
  slots: {
    tree1: { at: [300, 360] as Pt, width: 200 },
    tree2: { at: [980, 360] as Pt, width: 200 },
    light1: { at: [470, 345] as Pt, width: 60 },
    light2: { at: [810, 345] as Pt, width: 60 },
    path1: { at: [640, 330] as Pt, width: 150 },
    bed1: { at: [250, 610] as Pt, width: 210 },
    fountain: { at: [640, 540] as Pt, width: 200 },
    bed2: { at: [1010, 620] as Pt, width: 210 },
    bench1: { at: [430, 720] as Pt, width: 170 },
    path2: { at: [850, 720] as Pt, width: 170 },
    bed3: { at: [640, 800] as Pt, width: 220 },
  } as Record<string, { at: Pt; width: number }>,
  walkLoop: { cx: 640, cy: 485, rx: 300, ry: 170 },
  characterWidth: 110,
};

/** 아이템 id → 에셋 키 (가구·정원 장식은 아이템 id 와 같은 파일명. 정원 아치는 마을 장식 재사용) */
export function itemAsset(itemId: string, space: 'house' | 'garden'): string | null {
  if (itemId.startsWith('wall-') || itemId.startsWith('floor-')) return `house/${itemId}`;
  if (itemId === 'g-arch') return 'village/deco-garden-arch';
  return space === 'garden' ? `garden/${itemId}` : `furniture/${itemId}`;
}

export function pointInPolygon([x, y]: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 이동 영역 안 임의 지점 (결정적) */
export function walkPoint(seed: number, poly: Pt[]): Pt {
  const xs = poly.map((p) => p[0]); const ys = poly.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let s = seed;
  for (let k = 0; k < 40; k++) {
    s = (s * 9301 + 49297) % 233280;
    const x = x0 + ((s / 233280) * (x1 - x0));
    s = (s * 9301 + 49297) % 233280;
    const y = y0 + ((s / 233280) * (y1 - y0));
    if (pointInPolygon([x, y], poly)) return [x, y];
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}
