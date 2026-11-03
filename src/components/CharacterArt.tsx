import type { CharacterAnimState } from '@/domain/types';
import { CHARACTER_BY_ID } from '@/content/characters';
import { cx } from '@/lib/cx';

/**
 * 오리지널 캐릭터 SVG 에셋 (6종 × Lv.1/Lv.2 = 12종). 외부 이미지·기존 게임 캐릭터를 사용하지 않는다.
 * viewBox 0 0 100 100, 바닥 기준선 y=92.
 */
function Face({ cx: x = 50, cy = 58, cheek, wink = false, sleepy = false }: { cx?: number; cy?: number; cheek: string; wink?: boolean; sleepy?: boolean }) {
  return (
    <g>
      {sleepy ? (
        <>
          <path d={`M${x - 11} ${cy} q4 3 8 0`} stroke="#1F2328" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d={`M${x + 3} ${cy} q4 3 8 0`} stroke="#1F2328" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx={x - 7} cy={cy} rx="3.2" ry="4" fill="#1F2328" />
          {wink ? <path d={`M${x + 3} ${cy} q4 -3 8 0`} stroke="#1F2328" strokeWidth="2.4" fill="none" strokeLinecap="round" /> : <ellipse cx={x + 7} cy={cy} rx="3.2" ry="4" fill="#1F2328" />}
          <circle cx={x - 6} cy={cy - 1.5} r="1.1" fill="#fff" />
          {!wink && <circle cx={x + 8} cy={cy - 1.5} r="1.1" fill="#fff" />}
        </>
      )}
      <ellipse cx={x - 13} cy={cy + 6} rx="4" ry="2.4" fill={cheek} opacity="0.8" />
      <ellipse cx={x + 13} cy={cy + 6} rx="4" ry="2.4" fill={cheek} opacity="0.8" />
      <path d={`M${x - 3} ${cy + 6} q3 3 6 0`} stroke="#1F2328" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Mossy({ lv, p }: { lv: 1 | 2; p: { body: string; accent: string; cheek: string } }) {
  return (
    <g>
      <ellipse cx="50" cy="92" rx="26" ry="4" fill="#000" opacity="0.08" />
      <circle cx="27" cy="38" r="9" fill={p.accent} /><circle cx="73" cy="38" r="9" fill={p.accent} />
      <circle cx="27" cy="38" r="4.5" fill={p.body} /><circle cx="73" cy="38" r="4.5" fill={p.body} />
      <path d="M18 70 Q18 34 50 34 Q82 34 82 70 Q82 92 50 92 Q18 92 18 70Z" fill={p.body} />
      <path d="M30 86 q20 8 40 0" stroke={p.accent} strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
      <ellipse cx="50" cy="76" rx="14" ry="10" fill="#E8F6D9" opacity="0.8" />
      <Face cheek={p.cheek} />
      <path d="M50 34 q-2 -10 -10 -12 q8 -2 10 6 q2 -10 11 -9 q-8 4 -11 15" fill="#5E9C47" />
      {lv === 2 && (
        <g>
          <circle cx="50" cy="18" r="6" fill="#FFB7C9" /><circle cx="44" cy="22" r="5" fill="#FFB7C9" /><circle cx="56" cy="22" r="5" fill="#FFB7C9" />
          <circle cx="47" cy="27" r="5" fill="#FFB7C9" /><circle cx="53" cy="27" r="5" fill="#FFB7C9" /><circle cx="50" cy="23" r="3.6" fill="#FFE08A" />
          <circle cx="24" cy="80" r="3" fill="#FFE08A" /><circle cx="78" cy="78" r="2.5" fill="#FFB7C9" />
        </g>
      )}
    </g>
  );
}

function Plip({ lv, p }: { lv: 1 | 2; p: { body: string; accent: string; cheek: string } }) {
  return (
    <g>
      <ellipse cx="50" cy="92" rx="26" ry="4" fill="#000" opacity="0.08" />
      <path d="M50 22 C 30 46, 16 58, 18 72 C 20 88, 36 92, 50 92 C 64 92, 80 88, 82 72 C 84 58, 70 46, 50 22Z" fill={p.body} opacity="0.95" />
      <path d="M34 50 q-6 10 -4 20" stroke="#fff" strokeWidth="4" fill="none" opacity="0.7" strokeLinecap="round" />
      <circle cx="36" cy="54" r="9" fill="#fff" /><circle cx="64" cy="54" r="9" fill="#fff" />
      <Face cheek={p.cheek} cy={57} />
      <path d="M22 86 q-6 4 -2 6 q6 0 10 -4Z M78 86 q6 4 2 6 q-6 0 -10 -4Z" fill={p.accent} />
      {lv === 2 && (
        <g>
          <ellipse cx="50" cy="30" rx="24" ry="7" fill="#7CC06A" />
          <path d="M50 30 L50 23" stroke="#4E8F3E" strokeWidth="2" />
          <path d="M50 30 L66 27" stroke="#4E8F3E" strokeWidth="1.4" opacity="0.6" /><path d="M50 30 L34 27" stroke="#4E8F3E" strokeWidth="1.4" opacity="0.6" />
          <circle cx="62" cy="25" r="3.2" fill="#FFB7C9" />
        </g>
      )}
    </g>
  );
}

function Lumi({ lv, p }: { lv: 1 | 2; p: { body: string; accent: string; cheek: string } }) {
  return (
    <g>
      <ellipse cx="50" cy="92" rx="22" ry="4" fill="#000" opacity="0.08" />
      <path d="M32 58 Q32 92 50 92 Q68 92 68 58Z" fill="#FFF6E0" />
      <path d="M14 56 Q14 20 50 18 Q86 20 86 56 Q50 64 14 56Z" fill={p.body} />
      <circle cx="34" cy="36" r="5" fill="#FFF6E0" /><circle cx="58" cy="30" r="4" fill="#FFF6E0" /><circle cx="72" cy="44" r="4.5" fill="#FFF6E0" /><circle cx="46" cy="48" r="3" fill="#FFF6E0" />
      <Face cy={72} cheek={p.cheek} />
      {lv === 2 && (
        <g fill="#FFE97A">
          <circle cx="12" cy="30" r="3" /><circle cx="88" cy="26" r="3" /><circle cx="26" cy="12" r="2.4" /><circle cx="76" cy="10" r="2.4" />
          <circle cx="12" cy="30" r="7" opacity="0.25" /><circle cx="88" cy="26" r="7" opacity="0.25" />
          <path d="M14 56 Q50 66 86 56" stroke={p.accent} strokeWidth="3" fill="none" />
        </g>
      )}
    </g>
  );
}

function Cobi({ lv, p }: { lv: 1 | 2; p: { body: string; accent: string; cheek: string } }) {
  return (
    <g>
      <ellipse cx="50" cy="92" rx="28" ry="4" fill="#000" opacity="0.08" />
      {lv === 2 && (
        <g>
          <rect x="70" y="56" width="18" height="24" rx="7" fill="#B07A4C" />
          <path d="M70 62 Q79 50 88 62Z" fill="#7A5232" />
          <path d="M72 56 Q60 50 56 60" stroke="#7A5232" strokeWidth="3" fill="none" />
        </g>
      )}
      <path d="M16 74 Q14 36 50 34 Q86 36 84 74 Q82 92 50 92 Q18 92 16 74Z" fill={p.accent} />
      {[[30, 44], [44, 38], [58, 38], [72, 46], [22, 58], [78, 60], [36, 52], [64, 52]].map(([x, y], i) => (
        <path key={i} d={`M${x - 6} ${y + 4} L${x} ${y - 6} L${x + 6} ${y + 4}Z`} fill={p.body} stroke={p.accent} strokeWidth="1" />
      ))}
      <ellipse cx="50" cy="72" rx="24" ry="18" fill="#F4E3CF" />
      <Face cy={68} cheek={p.cheek} />
      <ellipse cx="50" cy="73" rx="3" ry="2.2" fill="#5A3B26" />
    </g>
  );
}

function Whisk({ lv, p }: { lv: 1 | 2; p: { body: string; accent: string; cheek: string } }) {
  const tail = (dx: number, rot: number) => (
    <g transform={`rotate(${rot} 64 78)`}>
      <circle cx={80 + dx} cy="58" r="10" fill="#fff" /><circle cx={88 + dx} cy="48" r="9" fill="#F6F0FF" /><circle cx={74 + dx} cy="50" r="8" fill="#fff" />
      <path d={`M60 82 Q${80 + dx} 80 ${82 + dx} 60`} stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <ellipse cx="46" cy="92" rx="26" ry="4" fill="#000" opacity="0.08" />
      {tail(0, 0)}
      {lv === 2 && tail(-6, -28)}
      <path d="M24 44 L30 22 L42 38Z" fill={p.body} /><path d="M68 44 L62 22 L50 38Z" fill={p.body} />
      <path d="M28 40 L31 28 L38 37Z" fill="#FFD6EA" /><path d="M64 40 L61 28 L54 37Z" fill="#FFD6EA" />
      <path d="M20 70 Q20 36 46 36 Q72 36 72 70 Q72 92 46 92 Q20 92 20 70Z" fill={p.body} />
      <path d="M30 66 Q46 84 62 66 Q62 90 46 90 Q30 90 30 66Z" fill="#fff" opacity="0.9" />
      <Face cx={46} cy={60} cheek={p.cheek} wink />
    </g>
  );
}

function Stella({ lv, p }: { lv: 1 | 2; p: { body: string; accent: string; cheek: string } }) {
  const star = (x: number, y: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
    }).join(' ');
    return <polygon points={pts} fill={p.accent} />;
  };
  return (
    <g>
      <ellipse cx="50" cy="92" rx="24" ry="4" fill="#000" opacity="0.08" />
      <path d="M36 34 Q30 18 22 12 M30 22 Q22 22 18 18" stroke="#C9A65A" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M64 34 Q70 18 78 12 M70 22 Q78 22 82 18" stroke="#C9A65A" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {star(22, 12, 5)}{star(78, 12, 5)}
      {lv === 2 && (
        <g>
          <path d="M22 12 L12 4 L4 14 M78 12 L88 4 L96 14 M18 18 L8 24 M82 18 L92 24" stroke={p.accent} strokeWidth="1.2" opacity="0.8" />
          {star(12, 4, 3.4)}{star(88, 4, 3.4)}{star(4, 14, 2.8)}{star(96, 14, 2.8)}{star(8, 24, 2.6)}{star(92, 24, 2.6)}
        </g>
      )}
      <ellipse cx="28" cy="44" rx="8" ry="5" fill={p.body} transform="rotate(-25 28 44)" /><ellipse cx="72" cy="44" rx="8" ry="5" fill={p.body} transform="rotate(25 72 44)" />
      <path d="M26 66 Q26 34 50 34 Q74 34 74 66 Q74 92 50 92 Q26 92 26 66Z" fill={p.body} />
      <circle cx="38" cy="78" r="1.6" fill="#fff" /><circle cx="62" cy="82" r="1.3" fill="#fff" /><circle cx="56" cy="44" r="1.4" fill="#fff" /><circle cx="42" cy="42" r="1" fill="#fff" />
      <ellipse cx="50" cy="72" rx="12" ry="9" fill="#8A97D6" />
      <Face cy={58} cheek={p.cheek} sleepy={false} />
    </g>
  );
}

const ART: Record<string, typeof Mossy> = { mossy: Mossy, plip: Plip, lumi: Lumi, cobi: Cobi, whisk: Whisk, stella: Stella };

export function CharacterArt({ id, level = 1, state = 'idle', size = 96, silhouette = false, className, title }: {
  id: string; level?: 1 | 2; state?: CharacterAnimState; size?: number; silhouette?: boolean; className?: string; title?: string;
}) {
  const ch = CHARACTER_BY_ID[id];
  if (!ch) return null;
  const Art = ART[id];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cx('char', `char-${state}`, className)} role="img" aria-label={title ?? (silhouette ? '미발견 캐릭터' : `${ch.name} Lv.${level}`)}>
      <g style={silhouette ? { filter: 'brightness(0) opacity(0.18)' } : undefined}>
        <Art lv={level} p={ch.palette} />
      </g>
    </svg>
  );
}

/** 파트너가 없을 때의 기본 안내 캐릭터: 숲지기 등불 */
export function GuideArt({ size = 80, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cx('char char-idle', className)} role="img" aria-label="숲지기 등불">
      <ellipse cx="50" cy="92" rx="20" ry="4" fill="#000" opacity="0.08" />
      <path d="M50 8 L50 18" stroke="#8A6244" strokeWidth="3" /><circle cx="50" cy="8" r="4" fill="#8A6244" />
      <rect x="30" y="18" width="40" height="8" rx="3" fill="#8A6244" />
      <path d="M32 26 L68 26 L64 84 L36 84Z" fill="#FFE9A8" stroke="#8A6244" strokeWidth="3" />
      <circle cx="50" cy="54" r="16" fill="#FFD25E" opacity="0.6" />
      <rect x="30" y="84" width="40" height="7" rx="3" fill="#8A6244" />
      <Face cy={54} cheek="#F6A7A0" />
    </svg>
  );
}
