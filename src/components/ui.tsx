import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { cx } from '@/lib/cx';
import { clearLeaveGuard, leaveGuardMessage } from '@/lib/leaveGuard';
import { onPlayStatus, playAudio, playStatus, stopAudio } from '@/lib/audio';
import { useApp } from '@/store/app';

export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 min-h-[44px] select-none',
        size === 'sm' && 'px-3 text-sm', size === 'md' && 'px-4 py-2.5', size === 'lg' && 'px-5 py-3.5 text-lg w-full',
        variant === 'primary' && 'bg-accent text-white shadow-[0_6px_16px_-8px_rgba(233,81,59,.8)] hover:bg-accent-dark',
        variant === 'secondary' && 'bg-white text-ink border border-line hover:bg-mist',
        variant === 'ghost' && 'text-ink-soft hover:bg-mist',
        variant === 'danger' && 'bg-white text-bad border border-bad/40',
        className,
      )}
    />
  );
}

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cx('rounded-card bg-white border border-line p-4', className)}>{children}</div>;
}

export function Tag({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'accent' | 'ok' | 'warn' | 'lilac' }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
      tone === 'gray' && 'bg-mist text-ink-soft', tone === 'accent' && 'bg-accent-soft text-accent-dark', tone === 'ok' && 'bg-mint text-ok', tone === 'warn' && 'bg-butter text-[#8a6100]', tone === 'lilac' && 'bg-lilac text-[#5b3fa6]')}>
      {children}
    </span>
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label ?? '진행도'}>
      <div className="h-2 rounded-full bg-mist overflow-hidden"><div className="h-full bg-accent rounded-full transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function Page({ title, back = true, children, right, className, onBack }: { title?: string; back?: boolean | string; children: ReactNode; right?: ReactNode; className?: string; onBack?: () => void }) {
  const nav = useNavigate();
  const [leaveMsg, setLeaveMsg] = useState<string | null>(null);
  useEffect(() => () => stopAudio(), []);
  const goBack = () => { if (onBack) onBack(); else if (typeof back === 'string') nav(back); else if (window.history.length > 1) nav(-1); else nav('/home'); };
  return (
    <div className={cx('min-h-[100dvh] bg-mist', className)}>
      <Modal open={!!leaveMsg} onClose={() => setLeaveMsg(null)} label="나가기 확인">
        <div className="text-center" data-testid="leave-confirm">
          <p className="font-bold text-lg">이 화면을 나갈까요?</p>
          <p className="text-sm text-ink-soft mt-1">{leaveMsg}</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="secondary" onClick={() => setLeaveMsg(null)} data-testid="leave-stay">계속하기</Button>
            <Button onClick={() => { setLeaveMsg(null); clearLeaveGuard(); goBack(); }} data-testid="leave-go">나가기</Button>
          </div>
        </div>
      </Modal>
      {title !== undefined && (
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-line">
          <div className="mx-auto max-w-[560px] flex items-center gap-1 h-14 px-2">
            {back ? (
              <button aria-label="뒤로 가기" className="w-11 h-11 grid place-items-center rounded-full hover:bg-mist text-xl"
                onClick={() => { const m = leaveGuardMessage(); if (m) setLeaveMsg(m); else goBack(); }}>
                ‹
              </button>
            ) : <span className="w-3" />}
            <h1 className="flex-1 font-bold text-[17px] truncate">{title}</h1>
            {right}
          </div>
        </header>
      )}
      <main className="mx-auto max-w-[560px] px-4 pb-28 pt-4">{children}</main>
    </div>
  );
}

export function Empty({ icon = '🌱', title, desc, action }: { icon?: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="text-4xl mb-3" aria-hidden>{icon}</div>
      <p className="font-bold">{title}</p>
      {desc && <p className="text-sm text-ink-soft mt-1">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function usePlayStatus() {
  const [s, setS] = useState(playStatus());
  useEffect(() => onPlayStatus(setS), []);
  return s;
}

/** 단어·예문 발음 듣기 버튼 */
export function AudioButton({ src, text, label = '발음 듣기', size = 'md', rate }: { src: string; text?: string; label?: string; size?: 'sm' | 'md'; rate?: number }) {
  const st = usePlayStatus();
  const speechRate = useApp((s) => s.settings.speechRate);
  const active = st.src === src && (st.state === 'playing' || st.state === 'loading');
  const err = st.src === src && st.state === 'error';
  return (
    <button
      type="button"
      aria-label={`${label}${text ? `: ${text}` : ''}`}
      onClick={(e) => { e.stopPropagation(); if (active) stopAudio(); else void playAudio(src, { rate: rate ?? speechRate, fallbackText: text }); }}
      className={cx('shrink-0 rounded-full grid place-items-center border transition', size === 'sm' ? 'w-11 h-11 text-base' : 'w-12 h-12 text-lg',
        active ? 'bg-accent text-white border-accent' : err ? 'bg-butter border-[#e8c96a]' : 'bg-white border-line hover:bg-mist')}
    >
      <span aria-hidden>{active ? '■' : err ? '!' : '🔊'}</span>
    </button>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="flex items-center justify-between mt-6 mb-2"><h2 className="font-bold text-[15px] text-ink">{children}</h2>{right}</div>;
}

export function Modal({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} className="w-full max-w-[520px] max-h-[88dvh] overflow-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 pop-in" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
