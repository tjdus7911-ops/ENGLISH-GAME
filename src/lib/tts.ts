/**
 * 문장 읽어 주기 (브라우저 음성 합성 Web Speech API · speechSynthesis).
 * 동화책 문장은 미리 녹음된 파일이 없으므로 기기의 영어 음성을 사용한다.
 * - 영어(en-*) 음성이 있는지 확인하고, 없거나 API 자체가 없으면 화면에 안내한다.
 * - 한 번에 하나만 재생. 재생 요청마다 토큰을 발급해 이전 순서 재생(듣기 모드)을 안전하게 취소한다.
 * 호환성: Chrome·Edge·Safari(iOS 포함)·Samsung Internet 지원. Firefox 는 OS 음성에 따라 영어 음성이 없을 수 있음.
 */
import { stopAudio } from './audio';

export type TtsSupport = 'ok' | 'no-api' | 'no-voice' | 'loading';

const api = () => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null);

let voice: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  const s = api();
  if (!s) return null;
  const vs = s.getVoices();
  const en = vs.filter((v) => /^en[-_]/i.test(v.lang) || v.lang.toLowerCase() === 'en');
  voice = en.find((v) => /en[-_]US/i.test(v.lang) && /google|samantha|natural|neural|premium|enhanced/i.test(v.name))
    ?? en.find((v) => /en[-_]US/i.test(v.lang)) ?? en.find((v) => /en[-_]GB/i.test(v.lang)) ?? en[0] ?? null;
  return voice;
}

export function ttsSupport(): TtsSupport {
  const s = api();
  if (!s) return 'no-api';
  const vs = s.getVoices();
  if (!vs.length) return 'loading'; // 일부 브라우저는 목록을 늦게 준다 (voiceschanged)
  return pickVoice() ? 'ok' : 'no-voice';
}

export function onVoicesChanged(cb: () => void): () => void {
  const s = api();
  if (!s) return () => {};
  s.addEventListener?.('voiceschanged', cb);
  const t = window.setTimeout(cb, 1500); // 이벤트가 오지 않는 브라우저 대비
  return () => { s.removeEventListener?.('voiceschanged', cb); window.clearTimeout(t); };
}

export const voiceName = () => voice?.name ?? null;

let token = 0;
export function ttsCancel() { token++; api()?.cancel(); }

/** 한 문장 읽기. 끝까지 읽으면 true, 취소·오류면 false */
export function speak(text: string, rate = 1): Promise<boolean> {
  const s = api();
  stopAudio(); // 다른 mp3 재생 중지
  const my = ++token;
  if (!s) return Promise.resolve(false);
  s.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = voice ?? pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-US';
    u.rate = rate;
    let done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok && my === token); } };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    // 일부 브라우저에서 onend 가 오지 않는 경우 대비 (글자 수 기반 상한)
    window.setTimeout(() => finish(true), Math.max(4000, (text.length * 110) / rate + 2500));
    s.speak(u);
  });
}

export const isCurrent = (t: number) => t === token;
export const currentToken = () => token;
