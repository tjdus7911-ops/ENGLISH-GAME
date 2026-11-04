import { useEffect, useMemo, useState } from 'react';
import { assetUrl, characterKey, heightFor, anchorOf, levelScale, type CharacterPose } from '../assets';
import { HOUSE, type Pt } from '../layout';
import { useReducedMotion } from '../village/VillageScene';

type Spot = { slot: string; at: Pt; pose: CharacterPose; z?: number };

/**
 * 집 안 대표 파트너: 배치된 가구 사이를 오가며 공부(책상)·앉기(소파)·잠자기(침대).
 * 가림 처리: 기본 z = 발밑 y (가구 뒤로 가면 가려짐), 소파·침대 위는 z 를 가구보다 크게.
 * 모션 줄이기 → 러그 자리에 대기 포즈로 고정.
 */
export function HousePartner({ id, level, placements }: { id: string; level: 1 | 2; placements: Record<string, string | null | undefined> }) {
  const reduce = useReducedMotion();
  const spots = useMemo<Spot[]>(() => [
    { slot: 'rug', at: HOUSE.partnerAt, pose: 'idle' },
    ...Object.entries(HOUSE.interact).filter(([slot]) => placements[slot]).map(([slot, v]) => ({ slot, at: v.at, pose: v.pose, z: v.z })),
  ], [placements]);
  const [i, setI] = useState(0);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (reduce || spots.length < 2) { setI(0); return; }
    const t = setTimeout(() => { setMoving(true); setI((k) => (k + 1) % spots.length); }, 5200);
    return () => clearTimeout(t);
  }, [i, reduce, spots.length]);
  useEffect(() => { if (!moving) return; const t = setTimeout(() => setMoving(false), 1300); return () => clearTimeout(t); }, [moving]);
  const spot = spots[Math.min(i, spots.length - 1)];
  const pose: CharacterPose = moving ? 'walk' : spot.pose;
  const key = characterKey(id, level, pose);
  const [W, H] = HOUSE.size;
  const w = HOUSE.partnerWidth * levelScale(level);
  const h = heightFor(key, w); const [ax, ay] = anchorOf(key);
  return (
    <img src={assetUrl(key)} alt="" draggable={false} data-testid="house-partner" data-pose={pose} data-spot={spot.slot}
      className="absolute pointer-events-none"
      style={{ left: `${((spot.at[0] - w * ax) / W) * 100}%`, top: `${((spot.at[1] - h * ay) / H) * 100}%`, width: `${(w / W) * 100}%`,
        zIndex: moving ? Math.round(spot.at[1]) + 1 : spot.z ?? Math.round(spot.at[1]) + 1, transition: reduce ? undefined : 'left 1.2s ease-in-out, top 1.2s ease-in-out' }} />
  );
}
