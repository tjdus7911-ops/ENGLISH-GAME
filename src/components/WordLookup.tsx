import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { lookup, tokenize, type LexEntry } from '@/lib/lexicon';
import { speak } from '@/lib/tts';
import { playAudio } from '@/lib/audio';
import { VOCAB_BY_ID } from '@/content/vocab';
import { useApp } from '@/store/app';
import { Button, Modal, Tag } from '@/components/ui';
import { SOURCE_LABEL, type WordSource } from '@/domain/learning/mywords';
import { cx } from '@/lib/cx';

const NO_SOURCES: WordSource[] = [];

/** 문장의 단어를 하나씩 누를 수 있게 렌더링 */
export function TappableText({ text, onWord, className, active = true }: { text: string; onWord: (w: string) => void; className?: string; active?: boolean }) {
  const toks = useMemo(() => tokenize(text), [text]);
  return (
    <span className={className}>
      {toks.map((t, i) => (t.word && active ? (
        <span key={i} role="button" tabIndex={0} data-word={t.text}
          onClick={(e) => { e.stopPropagation(); onWord(t.text); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onWord(t.text); } }}
          className="cursor-pointer rounded-[4px] hover:bg-butter focus-visible:bg-butter decoration-dotted underline-offset-4 hover:underline">{t.text}</span>
      ) : <span key={i}>{t.text}</span>))}
    </span>
  );
}

/** 단어 뜻 팝업 + '내 단어장에 저장' */
export function WordPopup({ raw, context, source, refId, onClose }: { raw: string | null; context?: string; source: WordSource; refId?: string; onClose: () => void }) {
  const e: LexEntry | null = raw ? lookup(raw) : null;
  const saved = useApp((s) => (e ? !!s.learning.myWords?.[e.key] : false));
  const sources = useApp((s) => (e ? s.learning.myWords?.[e.key]?.sources : undefined)) ?? NO_SOURCES;
  const save = useApp((s) => s.saveWord);
  const [msg, setMsg] = useState<string | null>(null);
  const v = e?.vocabId ? VOCAB_BY_ID[e.vocabId] : null;
  const close = () => { setMsg(null); onClose(); };
  if (!raw) return null;
  // 3D 뒤집기 카드 같은 transform 요소 안에서도 화면 전체에 뜨도록 body 로 포털
  return createPortal(
    <Modal open={!!raw} onClose={close} label="단어 뜻">
      <div data-testid="word-popup">
        {e ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-extrabold break-words" data-testid="popup-word">{e.word}</p>
                {raw && raw.toLowerCase() !== e.word.toLowerCase() && <p className="text-xs text-ink-soft">문장 속 모양: {raw} → 기본형 {e.word}</p>}
                <div className="flex gap-1.5 mt-1 flex-wrap"><Tag>{e.pos}</Tag>{e.level !== '-' && <Tag tone="accent">{e.level}</Tag>}</div>
              </div>
              <button type="button" aria-label={`발음 듣기: ${e.word}`} className="w-12 h-12 rounded-full border border-line grid place-items-center text-lg"
                onClick={() => { if (v) void playAudio(v.audio, { fallbackText: v.word }); else void speak(e.word, 0.9); }}>🔊</button>
            </div>
            <p className="mt-3 text-lg font-bold" data-testid="popup-meaning">{e.meaning}</p>
            {v && <p className="text-sm text-ink-soft mt-1">{v.ipa} · [{v.koPron}]</p>}
            {context && <p className="mt-3 rounded-2xl bg-mist p-3 text-sm break-words">{context}</p>}
            {e.proper ? (
              <p className="mt-4 text-sm text-ink-soft">이름·고유명사는 단어장에 저장하지 않아요.</p>
            ) : (
              <div className="mt-4 grid gap-2">
                {saved ? (
                  <>
                    <p className="text-sm font-semibold text-ok" data-testid="popup-saved">★ 내 단어장에 있는 단어예요{sources.length > 0 && ` · ${sources.map((x) => SOURCE_LABEL[x]).join(', ')}`}</p>
                    {!sources.includes(source) && <Button variant="secondary" onClick={() => { save(e.word, source, refId, context); setMsg('같은 단어라 새로 만들지 않고, 저장한 곳만 추가했어요.'); }} data-testid="popup-add-source">이 곳에서도 저장</Button>}
                  </>
                ) : (
                  <Button onClick={() => { const r = save(raw!, source, refId, context); setMsg(r.ok ? '내 단어장에 저장했어요.' : '저장할 수 없는 단어예요.'); }} data-testid="popup-save">☆ 내 단어장에 저장</Button>
                )}
                {msg && <p className="text-xs text-ink-soft" role="status" data-testid="popup-msg">{msg}</p>}
                <Link to="/mywords" className="text-sm text-center font-semibold text-accent-dark underline min-h-[36px] grid place-items-center" onClick={close}>내 단어장 보기 ›</Link>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm" data-testid="popup-missing">‘{raw}’은(는) 아직 앱 사전에 없는 단어예요. 뜻을 지어내지 않도록 저장 기능을 막아 두었어요.</p>
        )}
        <Button variant="ghost" className="w-full mt-2" onClick={close}>닫기</Button>
      </div>
    </Modal>,
    document.body,
  );
}

/** 화면에서 쓰기 쉬운 묶음: open(단어, 문장) + 팝업 노드 */
export function useWordLookup(source: WordSource, refId?: string): { open: (raw: string, context?: string) => void; popup: ReactNode } {
  const [st, setSt] = useState<{ raw: string; context?: string } | null>(null);
  const open = useCallback((raw: string, context?: string) => setSt({ raw, context }), []);
  const popup = <WordPopup raw={st?.raw ?? null} context={st?.context} source={source} refId={refId} onClose={() => setSt(null)} />;
  return { open, popup };
}

/** 예문 한 줄 (영어 단어 터치 가능 + 번역) */
export function TappableExample({ en, ko, onWord, className }: { en: string; ko?: string; onWord: (w: string, ctx: string) => void; className?: string }) {
  return (
    <span className={cx('block', className)}>
      <TappableText text={en} onWord={(w) => onWord(w, en)} className="font-medium break-words" />
      {ko && <span className="block text-sm text-ink-soft mt-0.5 break-words">{ko}</span>}
    </span>
  );
}

/** 하위 컴포넌트(예문 줄 등)에서 단어 팝업을 열 수 있도록 */
export const LookupContext = createContext<((raw: string, context?: string) => void) | null>(null);
export const useLookupOpen = () => useContext(LookupContext);
