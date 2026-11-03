import type { CSSProperties, ReactNode } from 'react';
import { anchorOf, assetUrl, heightFor } from './assets';
import type { Pt } from './layout';

/** 고정 논리 좌표 무대. 자식은 논리 좌표를 % 로 환산해 배치하므로 화면 폭에 맞춰 자동 축소된다. */
export function Stage({ size, children, className, testId, style, data }: { size: Pt; children: ReactNode; className?: string; testId?: string; style?: CSSProperties; data?: Record<string, string | number> }) {
  const attrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, String(v)]));
  return (
    <div className={`relative w-full overflow-hidden select-none ${className ?? ''}`} style={{ aspectRatio: `${size[0]} / ${size[1]}`, isolation: 'isolate', ...style }} data-testid={testId} {...attrs}>
      {children}
    </div>
  );
}

/** 기준점(발밑) 기준으로 이미지 에셋을 배치하고, y 로 깊이 정렬한다 */
export function placeStyle(key: string, at: Pt, width: number, size: Pt, z?: number): CSSProperties {
  const h = heightFor(key, width);
  const [ax, ay] = anchorOf(key);
  return {
    position: 'absolute',
    left: `${((at[0] - width * ax) / size[0]) * 100}%`,
    top: `${((at[1] - h * ay) / size[1]) * 100}%`,
    width: `${(width / size[0]) * 100}%`,
    zIndex: z ?? Math.round(at[1]),
  };
}

export function SpriteImg({ assetKey, at, width, size, z, className, alt = '', testId, style }: {
  assetKey: string; at: Pt; width: number; size: Pt; z?: number; className?: string; alt?: string; testId?: string; style?: CSSProperties;
}) {
  return (
    <img src={assetUrl(assetKey)} alt={alt} draggable={false} decoding="async" data-testid={testId} data-asset={assetKey}
      className={`pointer-events-none ${className ?? ''}`} style={{ ...placeStyle(assetKey, at, width, size, z), ...style }} />
  );
}

/** 이미지와 분리된 터치 영역 (투명 다각형) */
export function HitPolygon({ points, size, label, onActivate, testId, z = 2000 }: { points: Pt[]; size: Pt; label: string; onActivate: () => void; testId?: string; z?: number }) {
  return (
    <svg viewBox={`0 0 ${size[0]} ${size[1]}`} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: z }} aria-hidden={false}>
      <polygon points={points.map((p) => p.join(',')).join(' ')} fill="rgba(255,255,255,0.001)" role="button" tabIndex={0} aria-label={label} data-testid={testId}
        style={{ pointerEvents: 'auto', cursor: 'pointer', outline: 'none' }} className="hit-poly"
        onClick={onActivate} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } }} />
    </svg>
  );
}

export function AssetGate({ state, children, label }: { state: import('./assets').AssetState; children: ReactNode; label: string }) {
  if (state.status === 'ready') return <>{children}</>;
  if (state.status === 'loading') {
    return (
      <div className="w-full aspect-[4/5] grid place-items-center bg-[#EAF4E2]" role="status" aria-label={`${label} 불러오는 중`}>
        <div className="w-40"><div className="h-2 rounded-full bg-white overflow-hidden"><div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(state.progress * 100)}%` }} /></div>
          <p className="text-xs text-ink-soft text-center mt-2">{label} 그래픽 불러오는 중…</p></div>
      </div>
    );
  }
  return (
    <div className="w-full aspect-[4/5] grid place-items-center bg-mist p-6 text-center" role="alert" data-testid="asset-error">
      <div><p className="font-bold">{label} 그래픽을 불러오지 못했어요</p><p className="text-xs text-ink-soft mt-1">네트워크 상태를 확인해 주세요.</p>
        <button className="mt-3 rounded-2xl bg-accent text-white px-4 min-h-[44px] font-semibold" onClick={state.retry}>다시 시도</button></div>
    </div>
  );
}
