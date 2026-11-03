import type { FurnitureItem, ItemCategory, Rarity, SpaceId, UnlockCondition } from '@/domain/game/home';

const it = (itemId: string, name: string, category: ItemCategory, price: number, colors: string[], o: { rarity?: Rarity; unlock?: UnlockCondition; space?: SpaceId } = {}): FurnitureItem => ({
  itemId, name, category, space: o.space ?? 'house', rarity: o.rarity ?? (price === 0 ? 'basic' : 'common'), price,
  unlockCondition: o.unlock ?? { type: 'none' }, assetPath: `furniture/${category}`, placementSlot: category, colors,
});
const reward = (label: string): UnlockCondition => ({ type: 'reward', label });
const g = (itemId: string, name: string, category: ItemCategory, price: number, colors: string[], o: { rarity?: Rarity; unlock?: UnlockCondition } = {}) =>
  it(itemId, name, category, price, colors, { ...o, space: 'garden', unlock: o.unlock ?? { type: 'garden' } });

/** 집 가구 (가구 25종 · 벽지 3 · 바닥 3) + 정원 장식 13종. 모든 그림은 FurnitureArt.tsx 자체 제작 SVG */
export const FURNITURE: FurnitureItem[] = [
  // 기본 지급
  it('bed-old', '낡은 침대', 'bed', 0, ['#B8A58C', '#E6DCCB']),
  it('desk-small', '작은 책상', 'desk', 0, ['#B98B5E']),
  it('wall-basic', '기본 벽지', 'wallpaper', 0, ['#EFE6D6', '#E6DAC6']),
  it('floor-basic', '기본 마루', 'floor', 0, ['#D8B48A', '#CDA77B']),
  // 침대
  it('bed-wood', '포근한 원목 침대', 'bed', 40, ['#A8743F', '#FFF4E6', '#F6A7A0']),
  it('bed-flower', '꽃무늬 침대', 'bed', 60, ['#F7C6CF', '#FFFFFF', '#E9513B'], { unlock: { type: 'houseLevel', level: 2 } }),
  // 책상·의자
  it('desk-study', '공부 책상', 'desk', 30, ['#9A6B45', '#FFE08A']),
  it('chair-wood', '나무 의자', 'chair', 15, ['#A8743F']),
  it('chair-cushion', '쿠션 의자', 'chair', 25, ['#E9A0A0', '#A8743F']),
  // 책장
  it('shelf-small', '작은 책장', 'bookshelf', 40, ['#B07A4C', '#E9513B', '#3D6FB5', '#7CC06A']),
  it('shelf-big', '큰 책장', 'bookshelf', 70, ['#8A5A33', '#7E6BC9', '#F2C55C', '#E9513B'], { unlock: { type: 'houseLevel', level: 2 } }),
  // 소파
  it('sofa-pink', '분홍 소파', 'sofa', 50, ['#F4A6A6', '#E88B8B']),
  it('sofa-green', '숲속 초록 소파', 'sofa', 55, ['#8CC47E', '#6FA862']),
  // 조명
  it('lamp-stand', '스탠드 조명', 'lamp', 20, ['#F2C55C', '#8A6244']),
  it('lamp-mushroom', '버섯 조명', 'lamp', 35, ['#E9513B', '#FFF4E6']),
  // 러그
  it('rug-round', '동그란 러그', 'rug', 20, ['#F3C6B8', '#E8A898']),
  it('rug-check', '체크 러그', 'rug', 30, ['#BFE0F5', '#8FC1E3']),
  // 화분
  it('plant-small', '작은 화분', 'plant', 10, ['#7CC06A', '#C9785B']),
  it('plant-monstera', '몬스테라', 'plant', 25, ['#4FA24D', '#E8DCC6']),
  // 액자
  it('frame-forest', '숲 액자', 'frame', 15, ['#9BD27A', '#8A6244']),
  it('frame-sea', '바다 액자', 'frame', 20, ['#8FD3F4', '#B07A4C']),
  // 업적 보상 (판매 안 함)
  it('plant-sprout', '첫걸음 새싹 화분', 'plant', 0, ['#9BD27A', '#FFD25E'], { rarity: 'rare', unlock: reward('업적: 첫 영어 학습') }),
  it('frame-certificate', '첫 합격 상장 액자', 'frame', 0, ['#FFE08A', '#C9A65A'], { rarity: 'rare', unlock: reward('업적: 첫 단원 평가 통과') }),
  it('rug-paw', '발자국 러그', 'rug', 0, ['#FFE6D8', '#E9A23B'], { rarity: 'rare', unlock: reward('업적: 첫 캐릭터 획득') }),
  it('lamp-star', '별빛 램프', 'lamp', 0, ['#5B6BB5', '#F7D774'], { rarity: 'rare', unlock: reward('업적: 첫 캐릭터 진화') }),
  it('wall-mint', '민트 줄무늬 벽지', 'wallpaper', 0, ['#DDF3EA', '#C8EADB'], { rarity: 'rare', unlock: reward('업적: 첫 집 꾸미기') }),
  // 진화 특별 가구 (캐릭터별)
  it('sp-mossy', '모시의 이끼 쿠션 의자', 'chair', 0, ['#9BD27A', '#5E9C47'], { rarity: 'special', unlock: reward('모시 진화') }),
  it('sp-plip', '플립의 연잎 러그', 'rug', 0, ['#9FD98C', '#5FB25C'], { rarity: 'special', unlock: reward('플립 진화') }),
  it('sp-lumi', '루미의 반딧불 램프', 'lamp', 0, ['#FFE08A', '#E9A23B'], { rarity: 'special', unlock: reward('루미 진화') }),
  it('sp-cobi', '코비의 도토리 책장', 'bookshelf', 0, ['#C9A27E', '#8A6244', '#E9A23B', '#7CC06A'], { rarity: 'special', unlock: reward('코비 진화') }),
  it('sp-whisk', '위스크의 구름 소파', 'sofa', 0, ['#E9E1FA', '#D9C8F5'], { rarity: 'special', unlock: reward('위스크 진화') }),
  it('sp-stella', '스텔라의 별자리 액자', 'frame', 0, ['#2E3A7A', '#F7D774'], { rarity: 'special', unlock: reward('스텔라 진화') }),
  // 벽지·바닥
  it('wall-flower', '꽃 벽지', 'wallpaper', 35, ['#FFF1F3', '#F7C6CF']),
  it('floor-tile', '체크 타일 바닥', 'floor', 25, ['#F3EDE3', '#E1D7C6']),
  it('floor-warm', '따뜻한 원목 바닥', 'floor', 35, ['#B9875A', '#A8774C']),
  // 정원 장식 13종
  g('g-bed-tulip', '튤립 꽃밭', 'flowerbed', 0, ['#FF7F8E', '#FFD25E'], { rarity: 'rare', unlock: reward('공간 개방: 비밀 정원') }),
  g('g-bed-daisy', '데이지 꽃밭', 'flowerbed', 20, ['#FFFFFF', '#FFD25E']),
  g('g-bed-lavender', '라벤더 꽃밭', 'flowerbed', 25, ['#B9A3F2', '#8E76D6']),
  g('g-tree-cherry', '벚나무', 'tree', 40, ['#FFB7C9', '#9A6B45']),
  g('g-tree-apple', '사과나무', 'tree', 35, ['#7CC06A', '#E9513B']),
  g('g-tree-maple', '단풍나무', 'tree', 35, ['#F29A4A', '#9A6B45']),
  g('g-bench-wood', '나무 벤치', 'bench', 25, ['#B07A4C']),
  g('g-bench-white', '하얀 정원 벤치', 'bench', 30, ['#FFFFFF', '#C9CDD3']),
  g('g-fountain', '돌 분수', 'fountain', 60, ['#C9CDD3', '#8FD3F4']),
  g('g-light-lamp', '정원 가로등', 'gardenlight', 20, ['#4A5A6A', '#FFE08A']),
  g('g-light-firefly', '반딧불 랜턴', 'gardenlight', 25, ['#8A6244', '#FFE97A']),
  g('g-path-stone', '돌길', 'path', 15, ['#D9D2C4', '#C2B9A8']),
  g('g-arch', '장미 아치', 'path', 0, ['#FF9AA8', '#7CC06A'], { rarity: 'rare', unlock: reward('업적: 첫 정원 개방') }),
];

export const FURNITURE_BY_ID: Record<string, FurnitureItem> = Object.fromEntries(FURNITURE.map((f) => [f.itemId, f]));
export const DEFAULT_ITEMS = ['bed-old', 'desk-small', 'wall-basic', 'floor-basic'];
export const DEFAULT_PLACEMENTS = { bed: 'bed-old', desk: 'desk-small', wallpaper: 'wall-basic', floor: 'floor-basic' };
export const EVOLUTION_REWARD: Record<string, string> = { mossy: 'sp-mossy', plip: 'sp-plip', lumi: 'sp-lumi', cobi: 'sp-cobi', whisk: 'sp-whisk', stella: 'sp-stella' };

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  bed: '침대', desk: '책상', chair: '의자', bookshelf: '책장', sofa: '소파', lamp: '조명', rug: '러그', plant: '화분', frame: '액자', wallpaper: '벽지', floor: '바닥',
  flowerbed: '꽃밭', tree: '나무', bench: '벤치', fountain: '분수', gardenlight: '정원 조명', path: '산책로 장식',
};

export const counts = () => {
  const house = FURNITURE.filter((f) => f.space === 'house');
  return {
    furniture: house.filter((f) => f.category !== 'wallpaper' && f.category !== 'floor').length,
    wallpaper: house.filter((f) => f.category === 'wallpaper').length,
    floor: house.filter((f) => f.category === 'floor').length,
    garden: FURNITURE.filter((f) => f.space === 'garden').length,
  };
};

/** 성장 스토리 (건너뛰기 가능) */
export const STORIES: Record<string, { title: string; lines: string[] }> = {
  'first-enter': { title: '시작의 숲에 온 걸 환영해', lines: ['어서 와! 여기는 영어를 공부할수록 자라는 시작의 숲이야.', '단어 숲, 도서관, 시험장, 그리고 나의 집이 있어.', '오늘의 학습을 마치면 숲 친구를 만날 수 있을지도 몰라!'] },
  'first-study': { title: '첫 학습 완료!', lines: ['첫 공부를 마쳤어! 숲에 꽃이 피기 시작했어.', '퀘스트 게시판에서 별 보상을 받아 봐.'] },
  'first-discovery': { title: '숲속에서 반짝임이…', lines: ['방금 숲에서 무언가 반짝였어!', '오늘 배운 영어로 퀴즈를 맞히면 친구가 되어 줄 거야.'] },
  'first-character': { title: '첫 친구가 생겼어', lines: ['반가워! 이제 내가 너의 대표 파트너야.', '여기가 우리가 함께 지낼 집이야! 아직 조금 허전하지?', '영어를 공부하면서 하나씩 꾸며보자!'] },
  'first-evolution': { title: '진화했어!', lines: ['꾸준히 복습해 준 덕분에 내가 성장했어!', '고마운 마음을 담아 특별 가구를 선물할게.'] },
  'first-purchase': { title: '첫 가구 구매', lines: ['새 가구다! 나의 집에서 마음에 드는 자리에 놓아 보자.'] },
  'first-decorate': { title: '방이 달라졌어', lines: ['와, 방이 훨씬 아늑해졌어!', '세 번 이상 꾸미고 문법을 더 공부하면 새로운 공간이 열릴 거야.'] },
  'house-lv2': { title: '아늑한 나의 방', lines: ['집이 Lv.2로 성장했어!', '창밖으로 작은 정원 문이 보이는 것 같아…'] },
  'garden-open': { title: '비밀 정원이 열렸어', lines: ['집 뒤에 숨어 있던 비밀 정원이 열렸어!', '첫 정원 장식으로 튤립 꽃밭을 선물할게. 함께 산책하자!'] },
  'village-2': { title: '마을이 자랐어', lines: ['마을에 꽃밭이 넓어지고 가로등이 켜졌어!'] },
  'village-3': { title: '풍성한 숲의 마을', lines: ['마을이 한층 더 풍성해졌어! 건물들도 새 단장을 했어.'] },
};
