import { useEffect, useState } from 'react';
import { assetUrl, characterKey, hasAsset, preload } from './assets';
import { useReducedMotion } from './village/VillageScene';

/**
 * 진화 연출 (총 약 1.8초, 건너뛰기 가능 · 모션 줄이기 시 결과만 표시)
 * 기본형 idle → 성장 변형(기존 시트 하단, variant) → 진화 빛(lv2-evolve) → 진화형 idle
 */
export function EvolutionSequence({ id, size = 150 }: { id: string; size?: number }) {
  const reduce = useReducedMotion();
  const frames = [characterKey(id, 1, 'idle'), `characters/${id}-variant-wave`, characterKey(id, 2, 'evolve'), characterKey(id, 2, 'idle')].filter(hasAsset);
  const [i, setI] = useState(reduce ? frames.length - 1 : 0);
  const [ready, setReady] = useState(false);
  // 프레임 이미지를 먼저 모두 불러온 뒤 시작 (불러오는 동안 빈 원이 보이던 문제)
  useEffect(() => { let alive = true; preload(frames).finally(() => alive && setReady(true)); return () => { alive = false; }; }, [frames.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready || i >= frames.length - 1) return;
    const t = setTimeout(() => setI(i + 1), i === 2 ? 750 : 550);
    return () => clearTimeout(t);
  }, [i, frames.length, ready]);
  const done = i >= frames.length - 1;
  return (
    <div className="relative grid place-items-center" style={{ width: size * 1.2, height: size * 1.2 }} data-testid="evolution-seq" data-frame={i}>
      <img key={frames[i]} src={assetUrl(frames[i])} alt="" draggable={false} className={`object-contain ${done ? 'deco-in' : 'evo-pop'}`} style={{ width: size * (done ? 1.15 : 1), height: size * (done ? 1.15 : 1) }} />
      {!done && <button type="button" className="absolute -bottom-2 right-0 text-xs font-bold text-ink-soft min-h-[44px] px-2" onClick={() => setI(frames.length - 1)} data-testid="evolution-skip">건너뛰기 ›</button>}
    </div>
  );
}
