import { useMemo } from 'react';
import { FURNITURE_BY_ID } from '@/content/furniture';
import { useApp } from '@/store/app';
import { AssetGate, Stage } from '../Stage';
import { assetUrl, characterKey, useAssets } from '../assets';
import { HOUSE, itemAsset, type Pt } from '../layout';
import { HouseFurniture } from './HouseFurniture';
import { SlotMarker, type SlotState } from '../SlotMarker';
import { HousePartner } from './HousePartner';

type Placements = Record<string, string | null | undefined>;
const SLOT_LABEL: Record<string, string> = { wallpaper: '벽지', floor: '바닥', frame: '액자', desk: '책상', bookshelf: '책장', bed: '침대', lamp: '조명', chair: '의자', rug: '러그', plant: '화분', sofa: '소파' };

/** 벽지·바닥 오버레이: 텍스처 이미지를 벽/바닥 다각형에 맞춰 기울여 채운다 (기본 벽지·바닥은 방 이미지 그대로) */
function Surface({ itemId, poly, skew, id }: { itemId: string; poly: Pt[]; skew: number; id: string }) {
  const key = itemAsset(itemId, 'house')!;
  const [W, H] = HOUSE.size;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5, mixBlendMode: 'multiply' }} aria-hidden>
      <defs>
        <pattern id={`p-${id}`} width="170" height="170" patternUnits="userSpaceOnUse" patternTransform={`skewY(${skew})`}>
          <image href={assetUrl(key)} width="170" height="170" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      </defs>
      <polygon points={poly.map((p) => p.join(',')).join(' ')} fill={`url(#p-${id})`} opacity="0.92" />
    </svg>
  );
}

export function HouseScene({ placements, mode = 'view', selected, onSelect, slotState }: { placements: Placements; mode?: 'view' | 'decorate'; selected?: string | null; onSelect?: (slotId: string) => void; slotState?: (slotId: string) => SlotState }) {
  const partnerId = useApp((s) => s.game.partnerId);
  const partnerLv = useApp((s) => (s.game.partnerId ? s.game.characters[s.game.partnerId]?.level ?? 1 : 1));
  const wall = placements.wallpaper ?? 'wall-basic';
  const floor = placements.floor ?? 'floor-basic';
  const furniture = Object.entries(placements).filter(([slot, id]) => id && slot !== 'wallpaper' && slot !== 'floor') as [string, string][];
  const keys = useMemo(() => [HOUSE.background, ...furniture.map(([, id]) => itemAsset(id, 'house')!), ...(wall !== 'wall-basic' ? [itemAsset(wall, 'house')!] : []), ...(floor !== 'floor-basic' ? [itemAsset(floor, 'house')!] : []),
    ...(partnerId ? (['idle', 'walk', 'study', 'sit', 'sleep'] as const).map((p) => characterKey(partnerId, partnerLv as 1 | 2, p)) : [])], [furniture, wall, floor, partnerId, partnerLv]);
  const state = useAssets(keys);
  return (
    <AssetGate state={state} label="나의 집">
      <Stage size={HOUSE.size} testId="house-scene" style={{ background: '#FDE6D6' }} data={{ wall, floor, mode }}>
        <img src={assetUrl(HOUSE.background)} alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />
        {wall !== 'wall-basic' && <><Surface id="wl" itemId={wall} poly={HOUSE.walls.left} skew={-27} /><Surface id="wr" itemId={wall} poly={HOUSE.walls.right} skew={27} /></>}
        {floor !== 'floor-basic' && <Surface id="fl" itemId={floor} poly={HOUSE.walls.floor} skew={0} />}
        {furniture.map(([slot, id]) => <HouseFurniture key={slot} slotId={slot} itemId={id} />)}
        {partnerId && <HousePartner id={partnerId} level={partnerLv as 1 | 2} placements={placements} />}
        {mode === 'decorate' && onSelect && (
          <>
            {Object.entries(HOUSE.slots).map(([id, s]) => <SlotMarker key={id} id={id} label={SLOT_LABEL[id]} at={[s.at[0], s.at[1] - (id === 'rug' || id === 'frame' ? 0 : 40)]} size={HOUSE.size} empty={!placements[id]} selected={selected === id} onSelect={onSelect} state={slotState?.(id)} />)}
            <SlotMarker id="wallpaper" label="벽지" at={[1000, 170]} size={HOUSE.size} empty={false} selected={selected === 'wallpaper'} onSelect={onSelect} state={slotState?.('wallpaper')} />
            <SlotMarker id="floor" label="바닥" at={[640, 900]} size={HOUSE.size} empty={false} selected={selected === 'floor'} onSelect={onSelect} state={slotState?.('floor')} />
          </>
        )}
      </Stage>
    </AssetGate>
  );
}

export const houseItemName = (id: string) => FURNITURE_BY_ID[id]?.name ?? id;
