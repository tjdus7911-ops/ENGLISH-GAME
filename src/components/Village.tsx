import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DecorationId } from '@/domain/types';
import { CHARACTER_BY_ID } from '@/content/characters';
import { useApp } from '@/store/app';
import { cx } from '@/lib/cx';
import { CharacterArt, GuideArt } from './CharacterArt';

/** 2D 아이소메트릭 '시작의 숲' — SVG 배경 + 터치 가능한 건물 4개 + 이동 영역이 제한된 캐릭터 */
const W = 400;
const Y0 = 92; // 위쪽 빈 하늘 잘라내기
const H = 300;

// 등각 투영 상자: (x,y)=바닥 앞 꼭짓점, w=오른쪽 방향 폭, d=왼쪽 방향 깊이, h=높이
function IsoBox({ x, y, w, d, h, top, left, right }: { x: number; y: number; w: number; d: number; h: number; top: string; left: string; right: string }) {
  const k = 0.5;
  const A = [x, y], B = [x + w, y - w * k], C = [x + w - d, y - w * k - d * k], D = [x - d, y - d * k];
  const up = (p: number[]) => [p[0], p[1] - h];
  const pts = (...ps: number[][]) => ps.map((p) => p.join(',')).join(' ');
  return (
    <g>
      <polygon points={pts(D, A, up(A), up(D))} fill={left} />
      <polygon points={pts(A, B, up(B), up(A))} fill={right} />
      <polygon points={pts(up(A), up(B), up(C), up(D))} fill={top} />
    </g>
  );
}

function Roof({ x, y, w, d, h, rise, color, side }: { x: number; y: number; w: number; d: number; h: number; rise: number; color: string; side: string }) {
  const k = 0.5;
  const A = [x, y - h], B = [x + w, y - w * k - h], C = [x + w - d, y - w * k - d * k - h], D = [x - d, y - d * k - h];
  const midAD = [(A[0] + D[0]) / 2, (A[1] + D[1]) / 2 - rise];
  const midBC = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2 - rise];
  const pts = (...ps: number[][]) => ps.map((p) => p.join(',')).join(' ');
  return (
    <g>
      <polygon points={pts(D, A, midAD)} fill={side} />
      <polygon points={pts(A, B, midBC, midAD)} fill={color} />
    </g>
  );
}

function Tree({ x, y, s = 1, c = '#7CC06A' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="12" ry="4" fill="#000" opacity="0.1" />
      <rect x="-2.5" y="-14" width="5" height="16" rx="2" fill="#9A6B45" />
      <circle cx="0" cy="-24" r="14" fill={c} /><circle cx="-8" cy="-18" r="9" fill={c} /><circle cx="9" cy="-18" r="9" fill={c} />
      <circle cx="-4" cy="-28" r="4" fill="#fff" opacity="0.25" />
    </g>
  );
}

function Flowers({ x, y }: { x: number; y: number }) {
  const cols = ['#FF9AA8', '#FFD25E', '#B9A3F2', '#FFFFFF', '#FF9AA8'];
  return <g>{cols.map((c, i) => <circle key={i} cx={x + (i % 3) * 7 - 7} cy={y + Math.floor(i / 3) * 5} r="2.6" fill={c} stroke="#5E9C47" strokeWidth="0.6" />)}</g>;
}

type BuildingId = 'home' | 'library' | 'forest' | 'exam';
const BUILDINGS: { id: BuildingId; label: string; sub: string; to: string; cx: number; cy: number; hit: [number, number, number, number] }[] = [
  { id: 'home', label: '나의 집', sub: '집 꾸미기 · 파트너', to: '/house', cx: 108, cy: 186, hit: [60, 120, 100, 96] },
  { id: 'library', label: '도서관', sub: '문법 · 독해', to: '/grammar', cx: 292, cy: 186, hit: [240, 112, 104, 104] },
  { id: 'forest', label: '단어 숲', sub: '영단어 · 복습', to: '/words', cx: 96, cy: 300, hit: [44, 236, 104, 98] },
  { id: 'exam', label: '시험장', sub: '단원 평가 · 레벨 테스트', to: '/exam', cx: 304, cy: 300, hit: [252, 236, 104, 98] },
];

// 캐릭터 이동 영역: 중앙 광장 타원 (건물·UI 를 가리지 않도록 제한)
export const WALK = { cx: 200, cy: 262, rx: 62, ry: 26 };
export function inWalkZone(x: number, y: number) {
  return ((x - WALK.cx) / WALK.rx) ** 2 + ((y - WALK.cy) / WALK.ry) ** 2 <= 1.0001;
}
function randomPoint(seed: number) {
  const a = (seed * 2.399963) % (Math.PI * 2);
  const r = Math.sqrt(((seed * 0.618034) % 1)) * 0.95;
  return { x: WALK.cx + Math.cos(a) * WALK.rx * r, y: WALK.cy + Math.sin(a) * WALK.ry * r };
}

function Walker({ id, level, partner, index, reduce }: { id: string; level: 1 | 2; partner: boolean; index: number; reduce: boolean }) {
  const [pos, setPos] = useState(() => randomPoint(index * 3.7 + 1));
  const [face, setFace] = useState(1);
  const [react, setReact] = useState(false);
  const [moving, setMoving] = useState(false);
  const step = useRef(index * 11 + 5);
  useEffect(() => {
    if (reduce) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      if (document.hidden) { t = window.setTimeout(tick, 4000); return; }
      step.current += 1;
      const n = randomPoint(step.current * 1.37 + index);
      setPos((p) => { setFace(n.x < p.x ? -1 : 1); return n; });
      setMoving(true);
      window.setTimeout(() => { if (alive) setMoving(false); }, 2200);
      t = window.setTimeout(tick, 2600 + ((step.current * 977) % 2400));
    };
    let t = window.setTimeout(tick, 900 + index * 500);
    return () => { alive = false; window.clearTimeout(t); };
  }, [reduce, index]);
  const ch = CHARACTER_BY_ID[id];
  const size = partner ? 13 : 11; // % of width
  return (
    <button
      type="button"
      data-testid={`walker-${id}`}
      data-x={pos.x.toFixed(1)} data-y={pos.y.toFixed(1)}
      aria-label={`${ch.name}${partner ? ' (대표 파트너)' : ''} — 눌러서 인사하기`}
      onClick={() => { setReact(true); window.setTimeout(() => setReact(false), 1400); }}
      className="absolute walker"
      style={{
        left: `${(pos.x / W) * 100}%`, top: `${((pos.y - Y0) / H) * 100}%`, width: `${size}%`, aspectRatio: '1',
        transform: 'translate(-50%, -88%)', transition: reduce ? 'none' : 'left 2.2s ease-in-out, top 2.2s ease-in-out', zIndex: Math.round(pos.y),
      }}
    >
      {partner && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-accent text-white rounded-full px-1.5 leading-4 whitespace-nowrap">파트너</span>}
      {react && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border border-line rounded-xl px-2 py-0.5 text-xs whitespace-nowrap pop-in">{ch.lines.greeting?.[0]?.slice(0, 18)}</span>}
      <span className={cx('block w-full h-full', !reduce && react && 'hop')} style={{ transform: `scaleX(${face})` }}>
        <CharacterArt id={id} level={level} state={react ? 'greeting' : moving ? 'walking' : 'idle'} size={100} className="w-full h-full" />
      </span>
    </button>
  );
}

export function Village() {
  const nav = useNavigate();
  const unlocked = useApp((s) => s.game.village.unlocked);
  const vlevel = useApp((s) => s.game.village.level ?? 1);
  const gardenOpen = useApp((s) => !!s.home.spaces.garden);
  const chars = useApp((s) => s.game.characters);
  const partnerId = useApp((s) => s.game.partnerId);
  const reduceSetting = useApp((s) => s.settings.reduceMotion);
  const [prefReduce, setPrefReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    setPrefReduce(m.matches);
    const h = () => setPrefReduce(m.matches);
    m.addEventListener?.('change', h);
    return () => m.removeEventListener?.('change', h);
  }, []);
  const reduce = reduceSetting || prefReduce;
  const has = (d: DecorationId) => unlocked.includes(d);
  const owned = useMemo(() => Object.values(chars).sort((a, b) => (a.id === partnerId ? -1 : b.id === partnerId ? 1 : a.acquiredOn.localeCompare(b.acquiredOn))), [chars, partnerId]);
  const [pressed, setPressed] = useState<BuildingId | null>(null);
  const go = (b: (typeof BUILDINGS)[number]) => { setPressed(b.id); window.setTimeout(() => nav(b.to), reduce ? 0 : 160); };
  const onKey = (e: KeyboardEvent, b: (typeof BUILDINGS)[number]) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(b); } };

  return (
    <div className="relative w-full select-none" style={{ aspectRatio: `${W} / ${H}` }} data-testid="village" data-stage={vlevel} data-decorations={unlocked.length}>
      <svg viewBox={`0 ${Y0} ${W} ${H}`} className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#DDF0FF" /><stop offset="1" stopColor="#FFF6EA" /></linearGradient>
        </defs>
        <rect y={Y0} width={W} height={H} fill="url(#sky)" />
        {/* 먼 숲 */}
        {[30, 70, 110, 290, 330, 370].map((x, i) => <Tree key={i} x={x} y={118 + (i % 2) * 6} s={0.9} c={i % 2 ? '#9BD27A' : '#86C46B'} />)}
        {/* 땅 */}
        <polygon points="10,250 200,145 390,250 200,355" fill="#B9E08F" />
        <polygon points="10,250 200,355 200,375 10,270" fill="#9A6B45" />
        <polygon points="390,250 200,355 200,375 390,270" fill="#7F5638" />
        <polygon points="40,250 200,162 360,250 200,338" fill="#C8EA9F" opacity="0.6" />
        {/* 길 */}
        <polygon points="200,190 250,262 200,300 150,262" fill="#F3E3C3" opacity="0.9" />
        <path d="M108 200 L160 245 M292 200 L240 245 M104 296 L158 272 M300 296 L242 272" stroke="#F3E3C3" strokeWidth="12" strokeLinecap="round" />
        {/* 연못 */}
        <ellipse cx="200" cy="176" rx="34" ry="13" fill="#8FD3F4" /><ellipse cx="192" cy="172" rx="10" ry="3" fill="#fff" opacity="0.5" />
        {has('pond-bridge') && <g><path d="M170 184 Q200 160 230 184" stroke="#B07A4C" strokeWidth="7" fill="none" /><path d="M170 184 Q200 160 230 184" stroke="#D9A574" strokeWidth="3" fill="none" /></g>}

        {/* 나의 집 */}
        <g className={cx('bld', pressed === 'home' && 'bld-press')}>
          <IsoBox x={108} y={210} w={36} d={36} h={34} top="#FFF3DF" left="#F7D9B5" right="#EFC79B" />
          <Roof x={108} y={210} w={36} d={36} h={34} rise={22} color="#E9513B" side="#C63E2B" />
          <rect x="114" y="190" width="10" height="15" rx="2" fill="#9A6B45" />
          <rect x="88" y="186" width="9" height="9" rx="1.5" fill="#8FD3F4" />
        </g>
        {/* 도서관 */}
        <g className={cx('bld', pressed === 'library' && 'bld-press')}>
          <IsoBox x={292} y={214} w={44} d={40} h={46} top="#F2EEFF" left="#DCD3F7" right="#C7BAF0" />
          <Roof x={292} y={214} w={44} d={40} h={46} rise={14} color="#7E6BC9" side="#64519F" />
          {[0, 1, 2].map((i) => <rect key={i} x={298 + i * 11} y={182 - i * 5.5} width="6" height="14" rx="1.5" fill="#FFF" opacity="0.85" />)}
          {has('library-banner') && <g><path d="M262 150 L262 128" stroke="#8A6244" strokeWidth="2" /><path d="M262 128 L282 132 L262 138Z" fill="#FFD25E" /><path d="M330 136 L330 114" stroke="#8A6244" strokeWidth="2" /><path d="M330 114 L350 118 L330 124Z" fill="#E9513B" /></g>}
        </g>
        {/* 단어 숲 */}
        <g className={cx('bld', pressed === 'forest' && 'bld-press')}>
          <Tree x={78} y={300} s={1.3} c="#5FB25C" /><Tree x={112} y={312} s={1.1} c="#7CC06A" /><Tree x={100} y={284} s={0.9} c="#9BD27A" />
          <rect x="114" y="292" width="26" height="12" rx="3" fill="#FFF6E0" stroke="#9A6B45" strokeWidth="1.5" />
          <text x="127" y="301" fontSize="7" textAnchor="middle" fill="#5A3B26" fontWeight="700">ABC</text>
        </g>
        {/* 시험장 */}
        <g className={cx('bld', pressed === 'exam' && 'bld-press')}>
          <IsoBox x={304} y={326} w={40} d={36} h={30} top="#FFF4CC" left="#FFE08A" right="#F2C55C" />
          <polygon points="304,296 344,276 308,240 268,260" fill="#F7D774" opacity="0" />
          <path d="M286 268 L304 236 L322 268" fill="#E9A23B" />
          <circle cx="304" cy="250" r="5" fill="#fff" /><path d="M301 250 l2 2 l4 -4" stroke="#E9A23B" strokeWidth="1.6" fill="none" />
        </g>

        {/* 마을 2단계: 가로등·연못 장식 */}
        {vlevel >= 2 && <g data-testid="v2">
          {[[160, 214], [240, 214], [150, 296], [250, 296]].map(([x, y], i) => <g key={i}><rect x={x - 1.5} y={y - 26} width="3" height="26" fill="#4A5A6A" /><circle cx={x} cy={y - 28} r="4.5" fill="#FFE08A" /><circle cx={x} cy={y - 28} r="9" fill="#FFE08A" opacity=".25" /></g>)}
          <ellipse cx="186" cy="180" rx="5" ry="2" fill="#7CC06A" /><ellipse cx="214" cy="174" rx="4" ry="1.6" fill="#7CC06A" /><circle cx="214" cy="173" r="1.6" fill="#FF9AA8" />
        </g>}
        {/* 마을 3단계: 정원 아치·건물 외관 변화 */}
        {vlevel >= 3 && <g data-testid="v3">
          <path d="M120 176 L120 158 Q132 146 144 158 L144 176" stroke="#FF9AA8" strokeWidth="3.5" fill="none" />
          <rect x="122" y="166" width="10" height="5" fill="#FF9AA8" /><rect x="296" y="166" width="10" height="5" fill="#FF9AA8" />
          <path d="M100 150 L100 138 L106 138 L106 146" fill="#C63E2B" />
          {[60, 340, 30, 370].map((x, i) => <Tree key={i} x={x} y={300 + (i % 2) * 10} s={0.8} c={i % 2 ? '#FFB7C9' : '#7CC06A'} />)}
          {gardenOpen && <text x="132" y="186" fontSize="7" textAnchor="middle" fill="#5A3B26" fontWeight="700">정원</text>}
        </g>}
        {/* 장식 */}
        {has('flowers') && <g><Flowers x={150} y={208} /><Flowers x={252} y={210} /><Flowers x={190} y={312} /><Flowers x={60} y={250} /></g>}
        {has('tree') && <Tree x={44} y={232} s={1.5} c="#4FA24D" />}
        {has('garden') && (
          <g>
            <polygon points="168,330 200,314 232,330 200,346" fill="#A4793F" />
            {[0, 1, 2, 3].map((i) => <circle key={i} cx={184 + i * 10} cy={330 - (i % 2) * 3} r="3.5" fill={i % 2 ? '#FF9AA8' : '#7CC06A'} />)}
            <path d="M166 331 L200 348 L234 331" stroke="#fff" strokeWidth="1.6" fill="none" strokeDasharray="3 2" />
          </g>
        )}
      </svg>

      {/* 건물 터치 영역 (독립 버튼) */}
      {BUILDINGS.map((b) => (
        <div key={b.id} role="button" tabIndex={0} aria-label={`${b.label}: ${b.sub}`} data-testid={`bld-${b.id}`}
          onClick={() => go(b)} onKeyDown={(e) => onKey(e, b)}
          className="absolute rounded-3xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-accent/60 cursor-pointer"
          style={{ left: `${(b.hit[0] / W) * 100}%`, top: `${((b.hit[1] - Y0) / H) * 100}%`, width: `${(b.hit[2] / W) * 100}%`, height: `${(b.hit[3] / H) * 100}%`, zIndex: 1 }}>
          <span className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 border border-line px-2.5 py-0.5 text-[12px] font-bold shadow-sm">{b.label}</span>
        </div>
      ))}

      {/* 캐릭터: 이동 영역(중앙 광장) 안에서만 움직임 */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        <div className="pointer-events-auto">
          {owned.map((uc, i) => <Walker key={uc.id} id={uc.id} level={uc.level} partner={uc.id === partnerId} index={i} reduce={reduce} />)}
        </div>
        {owned.length === 0 && (
          <div className="absolute pointer-events-none" style={{ left: `${(WALK.cx / W) * 100}%`, top: `${((WALK.cy - Y0) / H) * 100}%`, width: '12%', transform: 'translate(-50%,-88%)' }} data-testid="guide">
            <GuideArt size={100} className="w-full h-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
