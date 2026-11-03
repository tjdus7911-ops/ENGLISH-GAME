/**
 * 마이크 녹음(MediaRecorder) + 브라우저 음성 인식(Web Speech API) 래퍼.
 * - 녹음은 사용자가 동의하고 버튼을 눌렀을 때만 시작한다.
 * - 녹음 파일은 기기 메모리(Blob URL)에만 있고 서버로 전송·저장하지 않는다.
 * - 브라우저 음성 인식은 브라우저 제공자의 서버에서 처리될 수 있다(예: Chrome). 앱 정책 화면에 고지한다.
 */
type SR = { lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean; start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; };

export function getRecognitionCtor(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR; __mockSpeechRecognition?: new () => SR };
  return w.__mockSpeechRecognition ?? w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupport = () => ({
  secure: typeof window !== 'undefined' && window.isSecureContext,
  mic: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  recorder: typeof MediaRecorder !== 'undefined',
  stt: !!(typeof window !== 'undefined' && getRecognitionCtor()),
});

export type MicError = 'denied' | 'no-device' | 'insecure' | 'unsupported' | 'unknown';

export interface Session {
  stop(): void;
  result: Promise<{ transcript: string | null; sttError: string | null; audioUrl: string | null; durationMs: number }>;
}

export async function startSession(opts: { useStt: boolean; maxMs?: number; onInterim?: (t: string) => void }): Promise<{ ok: true; session: Session } | { ok: false; error: MicError }> {
  const sup = speechSupport();
  if (!sup.secure) return { ok: false, error: 'insecure' };
  if (!sup.mic) return { ok: false, error: 'unsupported' };
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const name = (e as DOMException)?.name;
    return { ok: false, error: name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'no-device' : 'unknown' };
  }
  const started = Date.now();
  const chunks: Blob[] = [];
  let recorder: MediaRecorder | null = null;
  if (sup.recorder) {
    try { recorder = new MediaRecorder(stream); recorder.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); }; recorder.start(); } catch { recorder = null; }
  }
  let transcript: string | null = null;
  let sttError: string | null = null;
  const Ctor = opts.useStt ? getRecognitionCtor() : null;
  let rec: SR | null = null;
  const sttDone = new Promise<void>((res) => {
    if (!Ctor) return res();
    try {
      rec = new Ctor();
      rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
      rec.onresult = (e) => {
        let t = '';
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        transcript = t.trim();
        opts.onInterim?.(transcript);
      };
      rec.onerror = (e) => { sttError = e.error; };
      rec.onend = () => res();
      rec.start();
    } catch (err) { sttError = String(err); res(); }
  });
  let stopped = false;
  let resolveStop!: () => void;
  const stopSignal = new Promise<void>((r) => { resolveStop = r; });
  const timer = window.setTimeout(() => session.stop(), opts.maxMs ?? 10000);
  const session: Session = {
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timer);
      try { (rec as SR | null)?.stop(); } catch { /* noop */ }
      resolveStop();
    },
    result: (async () => {
      await stopSignal;
      const recDone = new Promise<void>((res) => {
        if (!recorder || recorder.state === 'inactive') return res();
        recorder.onstop = () => res();
        try { recorder.stop(); } catch { res(); }
      });
      await Promise.race([Promise.all([recDone, sttDone]), new Promise((r) => setTimeout(r, 4000))]);
      stream.getTracks().forEach((t) => t.stop());
      const audioUrl = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })) : null;
      return { transcript, sttError, audioUrl, durationMs: Date.now() - started };
    })(),
  };
  return { ok: true, session };
}
