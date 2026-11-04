import { useEffect, useRef, useState } from 'react';
import { CHARACTER_BY_ID } from '@/content/characters';
import { assetUrl, characterKey, heightFor, anchorOf, levelScale } from '../assets';
import { VILLAGE, walkPoint, type Pt } from '../layout';

/**
 * 마을 캐릭터: 이동 영역 다각형 안의 지점을 골라 걸어간다(rAF, transform 만 사용).
 * 걷는 동안 대기/걷기 이미지를 번갈아 보여 주고, 터치하면 인사 이미지 + 말풍선.
 */
export function VillageCharacter({ id, level, partner, index, reduce }: { id: string; level: 1 | 2; partner: boolean; index: number; reduce: boolean }) {
  const ch = CHARACTER_BY_ID[id];
  const [W, H] = VILLAGE.size;
  const width = (partner ? VILLAGE.characterWidth * 1.15 : VILLAGE.characterWidth) * levelScale(level);
  const [pos, setPos] = useState<Pt>(() => walkPoint(index * 7919 + 17, VILLAGE.walkArea));
  const [face, setFace] = useState(1);
  const [walking, setWalking] = useState(false);
  const [step, setStep] = useState(0);
  const [wave, setWave] = useState(false);
  const target = useRef<Pt | null>(null);
  const seed = useRef(index * 104729 + 31);

  useEffect(() => {
    if (reduce) return;
    let raf = 0; let last = performance.now(); let wait = 800 + index * 600; let alive = true;
    let cur = pos;
    const speed = 70; // 논리 px/초
    const tick = (t: number) => {
      if (!alive) return;
      const dt = Math.min(64, t - last); last = t;
      if (!document.hidden) {
        if (!target.current) {
          wait -= dt;
          if (wait <= 0) { seed.current = (seed.current * 48271) % 2147483647; target.current = walkPoint(seed.current, VILLAGE.walkArea); setWalking(true); }
        } else {
          const [tx, ty] = target.current; const dx = tx - cur[0]; const dy = ty - cur[1]; const d = Math.hypot(dx, dy);
          if (d < 2) { target.current = null; setWalking(false); wait = 1500 + ((seed.current >> 3) % 2500); }
          else { const k = Math.min(1, (speed * dt) / 1000 / d); cur = [cur[0] + dx * k, cur[1] + dy * k]; setPos(cur); setFace(dx < 0 ? -1 : 1); }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, index]);

  useEffect(() => {
    if (!walking || reduce) return;
    const h = window.setInterval(() => setStep((s) => s + 1), 260);
    return () => window.clearInterval(h);
  }, [walking, reduce]);

  const pose = wave ? 'wave' : walking && step % 2 === 1 ? 'walk' : 'idle';
  const key = characterKey(id, level, pose);
  const h = heightFor(characterKey(id, level, 'idle'), width);
  const [ax, ay] = anchorOf(characterKey(id, level, 'idle'));
  return (
    <button type="button" data-testid={`walker-${id}`} data-x={pos[0].toFixed(1)} data-y={pos[1].toFixed(1)} data-pose={pose}
      aria-label={`${ch.name}${partner ? ' (대표 파트너)' : ''} — 눌러서 인사하기`}
      onClick={() => { setWave(true); window.setTimeout(() => setWave(false), 1500); }}
      className="absolute p-0 bg-transparent border-0" style={{
        left: `${((pos[0] - width * ax) / W) * 100}%`, top: `${((pos[1] - h * ay) / H) * 100}%`, width: `${(width / W) * 100}%`, aspectRatio: `${width} / ${h}`,
        zIndex: Math.round(pos[1]) + 1,
      }}>
      {partner && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-accent text-white rounded-full px-1.5 leading-4 whitespace-nowrap">파트너</span>}
      {wave && <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white border border-line rounded-xl px-2 py-0.5 text-xs whitespace-nowrap pop-in" style={{ zIndex: 3000 }}>{ch.lines.greeting?.[0]?.slice(0, 18)}</span>}
      <span className="absolute left-[12%] right-[12%] bottom-[-2%] h-[10%] rounded-[50%] bg-black/15 blur-[2px]" />
      <img src={assetUrl(key)} alt="" draggable={false} className={`relative w-full h-full object-contain ${!reduce && !walking && !wave ? 'char-idle' : ''} ${wave && !reduce ? 'hop' : ''}`}
        style={{ transform: `scaleX(${face})` }} />
    </button>
  );
}
