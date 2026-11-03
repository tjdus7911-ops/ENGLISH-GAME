import { useState } from 'react';
import { HitPolygon, SpriteImg } from '../Stage';
import { VILLAGE, buildingImage } from '../layout';

type B = (typeof VILLAGE.buildings)[number];

/** 건물 이미지 + 이미지와 분리된 터치 다각형 + 이름표 */
export function VillageBuilding({ b, level, onEnter, reduce }: { b: B; level: number; onEnter: (route: string) => void; reduce: boolean }) {
  const [pressed, setPressed] = useState(false);
  const key = buildingImage(b, level);
  const [W, H] = VILLAGE.size;
  const go = () => { setPressed(true); window.setTimeout(() => onEnter(b.route), reduce ? 0 : 170); };
  return (
    <>
      <SpriteImg assetKey={key} at={b.at} width={b.width} size={VILLAGE.size} testId={`bimg-${b.id}`} className={`bld-img ${pressed ? 'bld-img-press' : ''}`} />
      <div className="absolute pointer-events-none" style={{ left: `${(b.at[0] / W) * 100}%`, top: `${((b.at[1] + 6) / H) * 100}%`, transform: 'translate(-50%, 0)', zIndex: 1500 }}>
        <span className="block whitespace-nowrap rounded-full bg-white/95 border border-[#E8D9BE] px-2.5 py-0.5 text-[12px] font-bold shadow-sm text-[#5A3B26]">{b.label}</span>
      </div>
      <HitPolygon points={b.hit} size={VILLAGE.size} label={`${b.label}: ${b.sub}`} onActivate={go} testId={`bld-${b.id}`} />
    </>
  );
}
