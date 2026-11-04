import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { AssetGate, Stage } from '../Stage';
import { assetUrl, characterKey, heightFor, anchorOf, useAssets, levelScale } from '../assets';
import { GARDEN, itemAsset } from '../layout';
import { GardenDecoration } from './GardenDecoration';
import { SlotMarker, type SlotState } from '../SlotMarker';
import { useReducedMotion } from '../village/VillageScene';

const LABEL: Record<string, string> = { tree1: '나무 1', tree2: '나무 2', light1: '조명 1', light2: '조명 2', path1: '산책로 1', bed1: '꽃밭 1', fountain: '분수', bed2: '꽃밭 2', bench1: '벤치', path2: '산책로 2', bed3: '꽃밭 3' };

function Walker({ id, level, index }: { id: string; level: 1 | 2; index: number }) {
  const reduce = useReducedMotion();
  const [t, setT] = useState(index * 1.6);
  useEffect(() => {
    if (reduce) return;
    let raf = 0; let last = performance.now();
    const f = (now: number) => { if (!document.hidden) setT((x) => x + (now - last) / 6000); last = now; raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);
  const { cx, cy, rx, ry } = GARDEN.walkLoop;
  const x = cx + Math.cos(t) * rx; const y = cy + Math.sin(t) * ry;
  const face = -Math.sin(t) > 0 ? 1 : -1; // 진행 방향
  const step = Math.floor(t * 18) % 2;
  const key = characterKey(id, level, reduce || step === 0 ? 'idle' : 'walk');
  const w = GARDEN.characterWidth * levelScale(level); const h = heightFor(characterKey(id, level, 'idle'), w); const [ax, ay] = anchorOf(characterKey(id, level, 'idle'));
  const [W, H] = GARDEN.size;
  return (
    <img src={assetUrl(key)} alt="" draggable={false} data-testid={`garden-walker-${id}`} className="absolute pointer-events-none"
      style={{ left: `${((x - w * ax) / W) * 100}%`, top: `${((y - h * ay) / H) * 100}%`, width: `${(w / W) * 100}%`, zIndex: Math.round(y) + 1, transform: `scaleX(${face})` }} />
  );
}

export function GardenScene({ placements, mode = 'view', selected, onSelect, locked = false, slotState }: { placements: Record<string, string | null | undefined>; mode?: 'view' | 'decorate'; selected?: string | null; onSelect?: (id: string) => void; locked?: boolean; slotState?: (slotId: string) => SlotState }) {
  const chars = useApp((s) => s.game.characters);
  const owned = Object.values(chars).slice(0, 4);
  const items = Object.entries(placements).filter(([, id]) => id) as [string, string][];
  const keys = useMemo(() => [GARDEN.background, ...items.map(([, id]) => itemAsset(id, 'garden')!), ...(locked ? [] : owned.flatMap((c) => [characterKey(c.id, c.level, 'idle'), characterKey(c.id, c.level, 'walk')]))], [items, owned, locked]);
  const state = useAssets(keys);
  return (
    <AssetGate state={state} label="비밀 정원">
      <Stage size={GARDEN.size} testId="garden-scene" style={{ background: '#DDEFD2' }} data={{ mode, locked: String(locked) }}>
        <img src={assetUrl(GARDEN.background)} alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, filter: locked ? 'saturate(.35) blur(2px) brightness(1.05)' : undefined }} />
        {!locked && items.map(([slot, id]) => <GardenDecoration key={slot} slotId={slot} itemId={id} />)}
        {!locked && owned.map((uc, i) => <Walker key={uc.id} id={uc.id} level={uc.level} index={i} />)}
        {locked && <div className="absolute inset-0 grid place-items-center" style={{ zIndex: 100 }}><span className="rounded-full bg-white/90 px-4 py-2 font-bold shadow">🔒 잠긴 비밀 정원</span></div>}
        {!locked && mode === 'decorate' && onSelect && Object.entries(GARDEN.slots).map(([id, s]) => (
          <SlotMarker key={id} id={id} label={LABEL[id]} at={[s.at[0], s.at[1] - 30]} size={GARDEN.size} empty={!placements[id]} selected={selected === id} onSelect={onSelect} state={slotState?.(id)} />
        ))}
      </Stage>
    </AssetGate>
  );
}
