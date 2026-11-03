import type { Pt } from './layout';

/** 꾸미기 모드 전용 슬롯 표시 (UI 레이어). 일반 모드에서는 렌더링하지 않는다 */
export function SlotMarker({ id, label, at, size, empty, selected, onSelect }: { id: string; label: string; at: Pt; size: Pt; empty: boolean; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button type="button" data-testid={`slot-${id}`} aria-label={`${label} 자리${empty ? ' (비어 있음)' : ''}`} onClick={() => onSelect(id)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full min-w-[44px] min-h-[44px] text-[11px] font-bold shadow
        ${selected ? 'bg-accent text-white ring-4 ring-accent/30' : empty ? 'bg-white/85 text-accent-dark border-2 border-dashed border-accent' : 'bg-white/90 text-ink border border-line'}`}
      style={{ left: `${(at[0] / size[0]) * 100}%`, top: `${(at[1] / size[1]) * 100}%`, zIndex: 4000 }}>
      {empty ? '+' : '✎'}<span className="sr-only">{label}</span>
    </button>
  );
}
