import { useEffect, useState } from 'react';
import { GARDEN_SLOTS, HOUSE_SLOTS, type Slot } from '@/domain/game/home';
import { FURNITURE_BY_ID } from '@/content/furniture';
import { useApp } from '@/store/app';
import { cx } from '@/lib/cx';
import { FurnitureShape } from './FurnitureArt';
import { CharacterArt } from './CharacterArt';

type Placements = Record<string, string | null | undefined>;

function SlotHit({ slot, selected, empty, onSelect, wall = false }: { slot: Slot; selected: boolean; empty: boolean; onSelect?: (id: string) => void; wall?: boolean }) {
  if (!onSelect) return null;
  const w = wall ? 52 : 60;
  const h = wall ? 40 : 56;
  const cy = slot.y - h / 2 + 8;
  return (
    <g role="button" tabIndex={0} aria-label={`${slot.label} 자리${empty ? ' (비어 있음)' : ''}`} data-testid={`slot-${slot.id}`}
      onClick={() => onSelect(slot.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(slot.id); } }} style={{ cursor: 'pointer' }}>
      {/* 터치 영역 (투명, 44px 이상) */}
      <rect x={slot.x - w / 2} y={slot.y - h + 8} width={w} height={h} rx="12" fill="rgba(255,255,255,0.001)" stroke={selected ? '#E9513B' : 'none'} strokeWidth="3" />
      {empty && <g style={{ pointerEvents: 'none' }}><circle cx={slot.x} cy={cy} r="11" fill="rgba(255,255,255,.75)" stroke="#E9513B" strokeWidth="1.5" strokeDasharray="3 2" /><text x={slot.x} y={cy + 5} textAnchor="middle" fontSize="15" fill="#E9513B" fontWeight="700">+</text></g>}
    </g>
  );
}

/** 나의 집 (아이소메트릭 방). 슬롯형 배치 */
export function HouseScene({ placements, onSelect, selected, showPartner = true }: { placements: Placements; onSelect?: (slotId: string) => void; selected?: string | null; showPartner?: boolean }) {
  const wall = FURNITURE_BY_ID[placements.wallpaper ?? 'wall-basic'];
  const floor = FURNITURE_BY_ID[placements.floor ?? 'floor-basic'];
  const partnerId = useApp((s) => s.game.partnerId);
  const level = useApp((s) => (partnerId ? s.game.characters[partnerId]?.level : 1));
  const houseLv = useApp((s) => s.home.houseLevel);
  const [wa, wb] = wall.colors;
  const [fa, fb] = floor.colors;
  const furniture = HOUSE_SLOTS.filter((s) => s.accepts !== 'wallpaper' && s.accepts !== 'floor');
  return (
    <svg viewBox="0 0 400 320" className="w-full h-auto select-none" data-testid="house-scene" data-wall={wall.itemId} data-floor={floor.itemId}>
      <defs>
        <pattern id="wp" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill={wa} />
          {wall.itemId === 'wall-flower' ? <circle cx="12" cy="12" r="3.5" fill={wb} /> : wall.itemId === 'wall-mint' ? <rect width="10" height="24" fill={wb} /> : <rect y="20" width="24" height="2" fill={wb} />}
        </pattern>
        <pattern id="fl" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
          <rect width="30" height="30" fill={fa} />
          {floor.itemId === 'floor-tile' ? <><rect width="15" height="15" fill={fb} /><rect x="15" y="15" width="15" height="15" fill={fb} /></> : <rect y="14" width="30" height="2" fill={fb} />}
        </pattern>
      </defs>
      <rect width="400" height="320" fill="#FFF6EA" />
      <polygon points="20,220 200,130 200,10 20,100" fill="url(#wp)" />
      <polygon points="200,130 380,220 380,100 200,10" fill="url(#wp)" />
      <polygon points="200,130 380,220 380,100 200,10" fill="#000" opacity=".05" />
      <polygon points="200,130 380,220 200,310 20,220" fill="url(#fl)" />
      {/* 창문 (집 Lv.2 이상이면 커튼, Lv.3 이면 정원이 보임) */}
      <g transform="translate(290 96)">
        <polygon points="-34,-6 26,24 26,-30 -34,-60" fill={houseLv >= 3 ? '#B9E08F' : '#CFE8F7'} stroke="#FFF" strokeWidth="5" />
        {houseLv >= 3 && <><circle cx="-12" cy="-6" r="6" fill="#FF9AA8" /><circle cx="6" cy="2" r="5" fill="#FFD25E" /></>}
        {houseLv >= 2 && <><polygon points="-40,-64 -26,-57 -26,-1 -40,-8" fill="#F7C6CF" /><polygon points="20,-34 32,-28 32,28 20,22" fill="#F7C6CF" /></>}
      </g>
      <polygon points="20,220 200,310 200,316 20,226" fill="#A8774C" />
      <polygon points="380,220 200,310 200,316 380,226" fill="#8A6244" />
      {furniture.map((slot) => {
        const id = placements[slot.id];
        const item = id ? FURNITURE_BY_ID[id] : null;
        return (
          <g key={slot.id}>
            {item && <g transform={`translate(${slot.x} ${slot.y})`} data-testid={`placed-${slot.id}`} data-item={item.itemId}><FurnitureShape item={item} /></g>}
            <SlotHit slot={slot} selected={selected === slot.id} empty={!item} onSelect={onSelect} wall={slot.accepts === 'frame'} />
          </g>
        );
      })}
      {onSelect && (
        <>
          <SlotHit slot={{ ...HOUSE_SLOTS[0], x: 330, y: 62 }} selected={selected === 'wallpaper'} empty={false} onSelect={() => onSelect('wallpaper')} wall />
          <SlotHit slot={{ ...HOUSE_SLOTS[1], x: 200, y: 306 }} selected={selected === 'floor'} empty={false} onSelect={() => onSelect('floor')} wall />
          <text x="330" y="76" textAnchor="middle" fontSize="10" fill="#57606A" style={{ pointerEvents: 'none' }}>벽지</text>
          <text x="200" y="300" textAnchor="middle" fontSize="10" fill="#57606A" style={{ pointerEvents: 'none' }}>바닥</text>
        </>
      )}
      {showPartner && partnerId && (
        <foreignObject x="196" y="196" width="56" height="56" style={{ pointerEvents: 'none' }}>
          <CharacterArt id={partnerId} level={(level ?? 1) as 1 | 2} state="idle" size={56} />
        </foreignObject>
      )}
    </svg>
  );
}

/** 비밀 정원 (슬롯형 꾸미기 + 캐릭터 산책) */
export function GardenScene({ placements, onSelect, selected }: { placements: Placements; onSelect?: (slotId: string) => void; selected?: string | null }) {
  const chars = useApp((s) => s.game.characters);
  const reduce = useApp((s) => s.settings.reduceMotion);
  const owned = Object.values(chars).slice(0, 4);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const h = window.setInterval(() => { if (!document.hidden) setT((x) => x + 1); }, 2800);
    return () => window.clearInterval(h);
  }, [reduce]);
  // 산책로(분수 주위 타원) 위 위치
  const pos = (i: number) => { const a = ((t + i * 2.2) * 0.9) % (Math.PI * 2); return { x: 200 + Math.cos(a) * 70, y: 250 + Math.sin(a) * 22 }; };
  return (
    <div className="relative w-full" style={{ aspectRatio: '400 / 320' }}>
      <svg viewBox="0 0 400 320" className="absolute inset-0 w-full h-full select-none" data-testid="garden-scene">
        <rect width="400" height="320" fill="#E6F4FF" />
        {[30, 90, 310, 370].map((x, i) => <circle key={x} cx={x} cy={96 + (i % 2) * 8} r="28" fill={i % 2 ? '#9BD27A' : '#86C46B'} />)}
        <polygon points="200,120 390,215 200,310 10,215" fill="#B9E08F" />
        <polygon points="10,215 200,310 200,320 10,225" fill="#9A6B45" /><polygon points="390,215 200,310 200,320 390,225" fill="#7F5638" />
        <ellipse cx="200" cy="250" rx="86" ry="30" fill="none" stroke="#F3E3C3" strokeWidth="14" />
        {[[60, 210], [340, 210], [150, 300], [250, 300], [100, 250], [300, 250]].map(([x, y], i) => <path key={i} d={`M${x - 6} ${y} q3 -8 6 0 q3 -8 6 0`} stroke="#6FB55E" strokeWidth="2" fill="none" />)}
        <path d="M30 210 Q60 196 90 206 L90 214 Q60 204 30 218Z" fill="#7CC06A" /><path d="M310 206 Q340 196 370 210 L370 218 Q340 204 310 214Z" fill="#7CC06A" />
        {GARDEN_SLOTS.map((slot) => {
          const id = placements[slot.id];
          const item = id ? FURNITURE_BY_ID[id] : null;
          return (
            <g key={slot.id}>
              {item && <g transform={`translate(${slot.x} ${slot.y}) scale(.8)`} data-testid={`placed-${slot.id}`} data-item={item.itemId}><FurnitureShape item={item} /></g>}
              <SlotHit slot={slot} selected={selected === slot.id} empty={!item} onSelect={onSelect} />
            </g>
          );
        })}
      </svg>
      {owned.map((uc, i) => {
        const p = pos(i);
        return (
          <div key={uc.id} className={cx('absolute pointer-events-none')} data-testid={`garden-walker-${uc.id}`}
            style={{ left: `${(p.x / 400) * 100}%`, top: `${(p.y / 320) * 100}%`, width: '11%', transform: 'translate(-50%,-90%)', transition: reduce ? 'none' : 'left 2.6s linear, top 2.6s linear' }}>
            <CharacterArt id={uc.id} level={uc.level} state={reduce ? 'idle' : 'walking'} size={100} className="w-full h-auto" />
          </div>
        );
      })}
    </div>
  );
}
