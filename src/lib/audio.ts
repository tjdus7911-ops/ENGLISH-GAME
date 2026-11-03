/**
 * 음성 재생. 앱에 포함된 mp3(합성 음성)를 재생하고, 재생이 불가능하면 기기 음성 합성(speechSynthesis)으로 대체한다.
 * 한 번에 하나만 재생 (새 재생 시 이전 재생 중지).
 */
export type PlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

let current: HTMLAudioElement | null = null;
const listeners = new Set<(s: { src: string | null; state: PlayState }) => void>();
let status: { src: string | null; state: PlayState } = { src: null, state: 'idle' };

function emit(src: string | null, state: PlayState) {
  status = { src, state };
  listeners.forEach((l) => l(status));
}
export const onPlayStatus = (l: (s: { src: string | null; state: PlayState }) => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const playStatus = () => status;

export const resolveAsset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

export function stopAudio() {
  if (current) { current.pause(); current.onended = null; current = null; }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  emit(null, 'idle');
}

export function speakFallback(text: string, rate = 1): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    speechSynthesis.speak(u);
  });
}

/** 재생 완료 시 resolve(true), 오류 시 대체 음성 시도 후 결과 */
export function playAudio(src: string, opts: { rate?: number; fallbackText?: string } = {}): Promise<boolean> {
  stopAudio();
  return new Promise((resolve) => {
    const a = new Audio(resolveAsset(src));
    current = a;
    a.playbackRate = opts.rate ?? 1;
    (a as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    emit(src, 'loading');
    a.onplaying = () => emit(src, 'playing');
    a.onpause = () => { if (current === a && !a.ended) emit(src, 'paused'); };
    a.onended = () => { if (current === a) { current = null; emit(null, 'idle'); } resolve(true); };
    a.onerror = async () => {
      if (current !== a) return resolve(false);
      current = null;
      emit(src, 'error');
      if (opts.fallbackText) {
        const ok = await speakFallback(opts.fallbackText, opts.rate);
        emit(null, ok ? 'idle' : 'error');
        return resolve(ok);
      }
      resolve(false);
    };
    a.play().catch(() => { /* onerror 에서 처리. 자동재생 차단 시 사용자가 다시 누르면 재생됨 */ if (current === a && a.paused) { emit(src, 'error'); resolve(false); } });
  });
}

export function pauseAudio() { if (current && !current.paused) current.pause(); }
export function resumeAudio() { if (current && current.paused) void current.play(); }
export function setRate(rate: number) { if (current) current.playbackRate = rate; }
export function seekAudio(t: number) { if (current) current.currentTime = t; }
export function currentAudio() { return current; }
