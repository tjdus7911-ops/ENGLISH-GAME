import type { Pt } from './layout';

export type SlotState = 'active' | 'disabled' | undefined;

/**
 * 꾸미기 모드 전용 슬롯 표시 (UI 레이어). 일반 모드에서는 렌더링하지 않는다.
 * state: 보관함에서 가구를 고른 상태일 때 — active(배치 가능: 은은한 하이라이트) / disabled(호환 안 됨: 누를 수 없음)
 */
export function SlotMarker({ id, label, at, size, empty, selected, onSelect, state }: { id: string; label: string; at: Pt; size: Pt; empty: boolean; selected: boolean; onSelect: (id: string) => void; state?: SlotState }) {
  const disabled = state === 'disabled';
  return (
    <button type="button" data-testid={`slot-${id}`} data-state={state ?? 'normal'} disabled={disabled} aria-disabled={disabled}
      aria-label={`${label} 자리${empty ? ' (비어 있음)' : ''}${state === 'active' ? ' — 배치 가능' : disabled ? ' — 이 가구는 놓을 수 없음' : ''}`} onClick={() => !disabled && onSelect(id)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full min-w-[44px] min-h-[44px] text-[11px] font-bold shadow transition
        ${disabled ? 'bg-white/50 text-ink-faint border border-line opacity-40 shadow-none cursor-not-allowed'
          : selected ? 'bg-accent text-white ring-4 ring-accent/30'
          : state === 'active' ? 'bg-white text-ok border-2 border-ok ring-4 ring-ok/25 slot-pulse'
          : empty ? 'bg-white/85 text-accent-dark border-2 border-dashed border-accent' : 'bg-white/90 text-ink border border-line'}`}
      style={{ left: `${(at[0] / size[0]) * 100}%`, top: `${(at[1] / size[1]) * 100}%`, zIndex: 4000 }}>
      {state === 'active' ? (empty ? '＋' : '⇄') : empty ? '+' : '✎'}<span className="sr-only">{label}</span>
    </button>
  );
}
