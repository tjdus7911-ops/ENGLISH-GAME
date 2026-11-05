import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BOOKS, BOOK_BY_ID, BOOK_LEVELS, bookSentences, type Book, type BookLevel, type BookSentence } from '@/content/library';
import { useApp } from '@/store/app';
import { Button, Empty, Page, Progress, SectionTitle, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { TappableText, useWordLookup } from '@/components/WordLookup';
import { bookQuestions } from '@/lib/libraryQuiz';
import { lemmaCandidates, normKey, tokenize } from '@/lib/lexicon';
import { onVoicesChanged, speak, ttsCancel, ttsSupport, type TtsSupport } from '@/lib/tts';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { cx } from '@/lib/cx';

const LEVEL_NAME: Record<BookLevel, string> = { A1: '왕초보', A2: '초급', B1: '중급', B2: '중상급', C1: '고급' };
const ls = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* noop */ } } };

function BookCover({ b, size = 'md' }: { b: Book; size?: 'md' | 'lg' }) {
  return (
    <div className={cx('book-cover relative rounded-r-xl rounded-l-[4px] grid place-items-center text-center shadow-[2px_3px_0_rgba(0,0,0,0.08)] overflow-hidden', size === 'lg' ? 'w-40 h-52' : 'w-[72px] h-[96px]')} style={{ background: b.cover.color }} aria-hidden>
      <span className="absolute left-0 top-0 bottom-0 w-[6px] bg-black/10" />
      <span className={size === 'lg' ? 'text-6xl' : 'text-3xl'}>{b.cover.icon}</span>
      {size === 'lg' && <span className="absolute bottom-3 left-3 right-2 text-[13px] font-extrabold leading-tight text-ink">{b.title}</span>}
    </div>
  );
}

function bookState(b: Book, p: ReturnType<typeof useBooks>[string] | undefined) {
  if (!p) return { label: '새 책', tone: 'gray' as const, pct: 0 };
  const pct = Math.round(((p.maxPage + 1) / b.pages.length) * 100);
  if (p.quiz?.passed && p.readOn) return { label: '완독', tone: 'ok' as const, pct: 100 };
  if (p.readOn) return { label: '퀴즈 남음', tone: 'warn' as const, pct };
  return { label: `${p.page + 1}/${b.pages.length}쪽`, tone: 'accent' as const, pct };
}
const NO_BOOKS = {};
const useBooks = () => useApp((s) => s.learning.books) ?? (NO_BOOKS as NonNullable<ReturnType<typeof useApp.getState>['learning']['books']>);

// ───────────────────────── 도서관 (동화책 · 문법) ─────────────────────────
export function LibraryHub() {
  const books = useBooks();
  const lv = useApp((s) => s.profile.levelTest.level);
  const reading = BOOKS.filter((b) => books[b.id] && !(books[b.id].quiz?.passed && books[b.id].readOn)).sort((a, b) => (books[b.id].startedOn > books[a.id].startedOn ? 1 : -1));
  const done = BOOKS.filter((b) => books[b.id]?.quiz?.passed && books[b.id]?.readOn).length;
  const gDone = useApp((s) => GRAMMAR_UNITS.filter((u) => s.learning.steps[`${u.id}:practice`]).length);
  return (
    <Page title="도서관" back="/home">
      <div className="grid grid-cols-2 gap-2">
        <Link to="/library/books" className="rounded-card bg-[#FFF8EC] border border-[#EED9B5] p-4 min-h-[128px]" data-testid="lib-books">
          <p className="text-3xl" aria-hidden>📚</p>
          <p className="font-extrabold mt-1">영어 동화책 읽기</p>
          <p className="text-xs text-ink-soft mt-0.5">{BOOKS.length}권 · 완독 {done}권</p>
        </Link>
        <Link to="/grammar" className="rounded-card bg-sky border border-[#C9DCF2] p-4 min-h-[128px]" data-testid="lib-grammar">
          <p className="text-3xl" aria-hidden>📘</p>
          <p className="font-extrabold mt-1">문법 공부</p>
          <p className="text-xs text-ink-soft mt-0.5">{GRAMMAR_UNITS.length}강 · 완료 {gDone}강</p>
        </Link>
      </div>
      {reading.length > 0 && (
        <>
          <SectionTitle>이어 읽기</SectionTitle>
          <div className="grid gap-2">{reading.slice(0, 3).map((b) => <ShelfRow key={b.id} b={b} />)}</div>
        </>
      )}
      <SectionTitle right={<Link to="/library/books" className="text-sm text-accent-dark font-semibold">전체 ›</Link>}>내 수준 추천{lv ? ` · ${lv}` : ''}</SectionTitle>
      <div className="grid gap-2">{BOOKS.filter((b) => b.level === (lv ?? 'A1') && !books[b.id]?.readOn).slice(0, 3).map((b) => <ShelfRow key={b.id} b={b} />)}</div>
    </Page>
  );
}

function ShelfRow({ b }: { b: Book }) {
  const p = useBooks()[b.id];
  const st = bookState(b, p);
  return (
    <Link to={`/library/book/${b.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[112px]" data-testid={`book-${b.id}`}>
      <BookCover b={b} />
      <span className="flex-1 min-w-0">
        <span className="flex gap-1.5 flex-wrap"><Tag tone="accent">{b.level} {LEVEL_NAME[b.level]}</Tag><Tag tone={st.tone}>{st.label}</Tag></span>
        <span className="block font-bold mt-1 break-words">{b.title}</span>
        <span className="block text-xs text-ink-soft">{b.titleKo} · {b.pages.length}쪽 · {b.source === 'pd' ? '고전 다시 쓰기' : '창작 동화'}</span>
        <span className="block mt-1.5"><Progress value={st.pct} max={100} label={`${b.title} 진행률`} /></span>
      </span>
    </Link>
  );
}

export function BookShelf() {
  const [sp, setSp] = useSearchParams();
  const myLv = useApp((s) => s.profile.levelTest.level);
  const lv = (sp.get('lv') as BookLevel | 'all' | null) ?? (BOOK_LEVELS.includes(myLv as BookLevel) ? (myLv as BookLevel) : 'all');
  const list = lv === 'all' ? BOOKS : BOOKS.filter((b) => b.level === lv);
  return (
    <Page title="영어 동화책" back="/library">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="레벨">
        {(['all', ...BOOK_LEVELS] as const).map((l) => (
          <button key={l} role="tab" aria-selected={lv === l} onClick={() => setSp({ lv: l }, { replace: true })} data-testid={`shelf-lv-${l}`}
            className={cx('shrink-0 rounded-full px-3 min-h-[40px] text-sm font-semibold border', lv === l ? 'bg-ink text-white border-ink' : 'bg-white border-line')}>
            {l === 'all' ? `전체 ${BOOKS.length}` : `${l} ${BOOKS.filter((b) => b.level === l).length}`}
          </button>
        ))}
      </div>
      <div className="grid gap-2 mt-3" data-testid="shelf-list">{list.map((b) => <ShelfRow key={b.id} b={b} />)}</div>
      <p className="text-[11px] text-ink-faint mt-4 leading-relaxed">모든 책은 이 앱을 위해 새로 쓴 창작 동화이거나, 저작권 보호기간이 끝난 공유저작물(이솝 우화·그림 형제·안데르센·오 헨리·민화)을 쉬운 영어로 새로 다시 쓴 이야기예요. 원작 문장을 그대로 옮기지 않았어요.</p>
    </Page>
  );
}

// ───────────────────────── 책 읽기 ─────────────────────────
type Mode = 'read' | 'listen' | 'study';
const MODE_LABEL: Record<Mode, string> = { read: '직접 읽기', listen: '듣기', study: '영어 공부' };
const RATES = [0.75, 1, 1.25] as const;

function useTts(): TtsSupport {
  const [s, setS] = useState<TtsSupport>(() => ttsSupport());
  useEffect(() => onVoicesChanged(() => setS(ttsSupport())), []);
  return s;
}

export function BookReader() {
  const { id = '' } = useParams();
  const b = BOOK_BY_ID[id];
  if (!b) return <Page title="동화책"><Empty title="책을 찾을 수 없어요" /></Page>;
  return <ReaderInner key={b.id} b={b} />;
}

function ReaderInner({ b }: { b: Book }) {
  const nav = useNavigate();
  const prog = useApp((s) => s.learning.books?.[b.id]);
  const setPageStore = useApp((s) => s.setBookPage);
  const complete = useApp((s) => s.completeBook);
  const [phase, setPhase] = useState<'cover' | 'read' | 'quiz' | 'result'>('cover');
  const [page, setPage] = useState(prog?.page ?? 0);
  const [mode, setMode] = useState<Mode>(() => (ls.get('reader-mode') as Mode) || 'read');
  const [showKo, setShowKo] = useState(() => ls.get('reader-ko') !== '0');
  const [rate, setRate] = useState<number>(() => Number(ls.get('reader-rate')) || 1);
  const [autoPage, setAutoPage] = useState(() => ls.get('reader-auto') !== '0');
  const [repeat, setRepeat] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rs, setRs] = useState<QResult[]>([]);
  const [turn, setTurn] = useState<'next' | 'prev' | null>(null);
  const tts = useTts();
  const canSpeak = tts === 'ok' || tts === 'loading';
  const seq = useRef(0);
  const opts = useRef({ rate, repeat, autoPage, mode });
  opts.current = { rate, repeat, autoPage, mode };
  const { open, popup } = useWordLookup('book', b.id);

  useEffect(() => { ls.set('reader-mode', mode); }, [mode]);
  useEffect(() => { ls.set('reader-ko', showKo ? '1' : '0'); }, [showKo]);
  useEffect(() => { ls.set('reader-rate', String(rate)); }, [rate]);
  useEffect(() => { ls.set('reader-auto', autoPage ? '1' : '0'); }, [autoPage]);
  useEffect(() => () => { seq.current++; ttsCancel(); }, []);
  useEffect(() => { if (phase === 'read') setPageStore(b.id, page); }, [phase, page, b.id, setPageStore]);

  const stop = () => { seq.current++; ttsCancel(); setPlaying(false); };

  /** 한 문장(반복 켜면 끌 때까지 반복) */
  async function sayLoop(s: BookSentence, my: number): Promise<boolean> {
    setActive(s.id);
    do {
      const ok = await speak(s.en, opts.current.rate);
      if (my !== seq.current) return false;
      if (!ok) return false;
    } while (opts.current.repeat);
    return true;
  }

  async function playOne(s: BookSentence) {
    stop();
    const my = ++seq.current;
    setPlaying(true);
    await sayLoop(s, my);
    if (my === seq.current) setPlaying(false);
  }

  /** 듣기 모드·페이지 전체 듣기: 페이지 p 의 i번째 문장부터 차례대로. 자동 넘김이 켜져 있으면 다음 페이지로 이어서 */
  async function playFrom(p: number, i: number, continuePages: boolean) {
    stop();
    const my = ++seq.current;
    setPlaying(true);
    let pg = p, idx = i;
    while (my === seq.current) {
      const ss = b.pages[pg].sentences;
      for (; idx < ss.length; idx++) {
        const ok = await sayLoop(ss[idx], my);
        if (!ok || my !== seq.current) return;
        await new Promise((r) => setTimeout(r, 350));
        if (my !== seq.current) return;
      }
      if (continuePages && opts.current.autoPage && pg < b.pages.length - 1) {
        pg += 1; idx = 0;
        setTurn('next'); setPage(pg);
        await new Promise((r) => setTimeout(r, 700));
        continue;
      }
      break;
    }
    if (my === seq.current) { setPlaying(false); }
  }

  const go = (d: number) => {
    const np = page + d;
    if (np < 0 || np >= b.pages.length) return;
    stop(); setActive(null); setTurn(d > 0 ? 'next' : 'prev'); setPage(np);
  };
  const touch = useRef<number | null>(null);

  if (phase === 'cover') {
    const resume = (prog?.page ?? 0) > 0;
    return (
      <Page title={b.titleKo} back="/library/books">
        <div className="book-desk rounded-card p-5 grid justify-items-center text-center">
          <BookCover b={b} size="lg" />
          <p className="mt-4 text-2xl font-extrabold">{b.title}</p>
          <p className="text-ink-soft">{b.titleKo}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap justify-center"><Tag tone="accent">{b.level} {LEVEL_NAME[b.level]}</Tag><Tag>{b.pages.length}쪽 · {bookSentences(b).length}문장</Tag><Tag>퀴즈 {b.quiz.length}문제</Tag></div>
          <p className="text-[11px] text-ink-faint mt-3" data-testid="book-origin">{b.source === 'pd' ? `원작: ${b.origin} — 쉬운 영어로 새로 다시 쓴 이야기` : '이 앱을 위해 새로 쓴 창작 동화'}</p>
        </div>
        <div className="grid gap-2 mt-4">
          <Button size="lg" onClick={() => setPhase('read')} data-testid="book-start">{resume ? `이어 읽기 (${(prog?.page ?? 0) + 1}쪽)` : '읽기 시작'}</Button>
          {resume && <Button variant="secondary" onClick={() => { setPage(0); setPhase('read'); }}>처음부터 읽기</Button>}
          {prog?.readOn && <Button variant="secondary" onClick={() => setPhase('quiz')} data-testid="book-quiz-direct">이해도 퀴즈 {prog.quiz ? `다시 풀기 (최고 ${prog.quiz.correct}/${prog.quiz.total})` : '풀기'}</Button>}
        </div>
      </Page>
    );
  }

  if (phase === 'quiz') {
    return (
      <Page title={`${b.titleKo} · 이해도 퀴즈`}>
        <QuizRunner questions={bookQuestions(b)} title="이해도 퀴즈" onDone={(x) => { complete(b.id, toAnswers(x, 'reading')); setRs(x); setPhase('result'); }} />
      </Page>
    );
  }
  if (phase === 'result') {
    const passed = rs.filter((r) => r.correct).length / rs.length >= 0.6;
    return (
      <Page title={`${b.titleKo} · 결과`} back="/library/books">
        <ResultView results={rs} title="이해도 퀴즈 결과" passLabel={passed ? '완독 성공!' : '60% 이상 맞히면 완독으로 기록돼요'}>
          <div className="grid gap-2">
            {!passed && <Button size="lg" onClick={() => { setPage(0); setPhase('read'); }}>다시 읽어 보기</Button>}
            <Button size="lg" variant={passed ? 'primary' : 'secondary'} onClick={() => nav('/library/books')}>책장으로</Button>
            <Button variant="ghost" onClick={() => nav('/mywords')}>내 단어장 보기</Button>
          </div>
        </ResultView>
      </Page>
    );
  }

  const pg = b.pages[page];
  const last = page === b.pages.length - 1;
  const keyWordsOf = (s: BookSentence) => {
    const lemmas = new Set(tokenize(s.en).filter((t) => t.word).flatMap((t) => lemmaCandidates(t.text)));
    const text = s.en.toLowerCase();
    return b.words.filter((w) => (w.word.includes(' ') ? text.includes(w.word) : lemmas.has(normKey(w.word))));
  };

  return (
    <Page title={b.titleKo} back="/library/books" right={<span className="text-sm text-ink-soft pr-2" data-testid="page-no">{page + 1} / {b.pages.length}</span>}>
      {/* 모드 */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white border border-line p-1" role="tablist" aria-label="읽기 모드">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { stop(); setMode(m); if (m === 'study') setShowKo(true); }} data-testid={`mode-${m}`}
            className={cx('rounded-xl min-h-[40px] text-sm font-bold', mode === m ? 'bg-accent text-white' : 'text-ink-soft')}>{MODE_LABEL[m]}</button>
        ))}
      </div>
      {/* 음성·번역 설정 */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-xs text-ink-soft mr-0.5">속도</span>
        {RATES.map((r) => (
          <button key={r} onClick={() => setRate(r)} aria-pressed={rate === r} data-testid={`rate-${r}`}
            className={cx('rounded-full px-2.5 min-h-[36px] border font-semibold', rate === r ? 'bg-ink text-white border-ink' : 'bg-white border-line')}>{r}x</button>
        ))}
        <button onClick={() => setRepeat(!repeat)} aria-pressed={repeat} data-testid="repeat-toggle"
          className={cx('rounded-full px-2.5 min-h-[36px] border font-semibold', repeat ? 'bg-mint border-[#9ED7BF]' : 'bg-white border-line')}>🔁 한 문장 반복</button>
        <button onClick={() => setShowKo(!showKo)} aria-pressed={showKo} data-testid="ko-toggle"
          className={cx('rounded-full px-2.5 min-h-[36px] border font-semibold', showKo ? 'bg-sky border-[#C9DCF2]' : 'bg-white border-line')}>{showKo ? '번역 숨기기' : '번역 보기'}</button>
      </div>
      {!canSpeak && (
        <p className="mt-2 rounded-2xl bg-butter border border-[#F2D98A] p-3 text-sm" role="alert" data-testid="tts-unsupported">
          {tts === 'no-api' ? '이 브라우저는 음성 읽기(TTS)를 지원하지 않아요.' : '이 기기에 영어 음성이 설치되어 있지 않아요.'} 크롬·엣지·사파리 최신 버전에서 들을 수 있어요. 읽기와 단어 뜻 보기는 그대로 쓸 수 있어요.
        </p>
      )}
      {mode === 'listen' && canSpeak && (
        <div className="mt-2 flex items-center gap-2">
          {playing ? <Button size="sm" variant="secondary" onClick={stop} data-testid="listen-stop">■ 멈추기</Button>
            : <Button size="sm" onClick={() => void playFrom(page, 0, true)} data-testid="listen-play">▶ 이 쪽부터 듣기</Button>}
          <label className="flex items-center gap-1.5 text-sm min-h-[40px]"><input type="checkbox" checked={autoPage} onChange={(e) => setAutoPage(e.target.checked)} data-testid="auto-page" className="w-5 h-5 accent-[#E9513B]" />페이지 자동 넘김</label>
        </div>
      )}

      {/* 책 페이지 */}
      <section key={page} className={cx('book-page mt-3 rounded-r-card rounded-l-md p-5 min-h-[360px]', turn === 'next' && 'page-turn-next', turn === 'prev' && 'page-turn-prev')}
        aria-label={`${page + 1}쪽`} data-testid="book-page"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }}>
        <div className="grid gap-3">
          {pg.sentences.map((s, i) => {
            const on = active === s.id;
            const kws = mode === 'study' ? keyWordsOf(s) : [];
            return (
              <div key={s.id} data-testid="sentence" data-active={on} data-sid={s.id}
                className={cx('rounded-xl px-2 py-1.5 -mx-2 transition-colors', on && 'bg-butter ring-2 ring-[#F2D98A]', mode !== 'study' && 'cursor-pointer')}
                onClick={() => { if (mode === 'study') return; if (!canSpeak) { setActive(s.id); return; } if (mode === 'listen') void playFrom(page, i, true); else void playOne(s); }}>
                <p className="text-[19px] leading-relaxed font-medium break-words" lang="en">
                  {mode === 'study' || on ? <TappableText text={s.en} onWord={(w) => open(w, s.en)} /> : s.en}
                </p>
                {showKo && <p className="text-[14px] text-ink-soft mt-0.5 break-words" data-testid="sentence-ko">{s.ko}</p>}
                {mode === 'study' && (
                  <div className="mt-2 rounded-xl bg-white/70 border border-[#EED9B5] p-2.5 text-[13px]" data-testid="study-box">
                    <p><b className="text-accent-dark">문장 구조</b> · {s.note}</p>
                    {kws.length > 0 && <p className="mt-1.5 flex flex-wrap gap-1">{kws.map((w) => (
                      <button key={w.word} onClick={() => open(w.word, s.en)} className="rounded-full bg-mint px-2 min-h-[30px] text-xs font-semibold" data-testid="key-word">{w.word} · {w.meaning}</button>
                    ))}</p>}
                    {canSpeak && <button onClick={() => void playOne(s)} className="mt-1.5 text-xs font-bold text-accent-dark min-h-[30px]" data-testid="study-play">🔊 문장 듣기</button>}
                  </div>
                )}
                {on && mode === 'read' && canSpeak && <button onClick={(e) => { e.stopPropagation(); void playOne(s); }} className="mt-1 text-xs font-bold text-accent-dark min-h-[30px]" data-testid="replay">🔊 다시 듣기</button>}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-ink-faint mt-5">— {page + 1} —</p>
      </section>
      <p className="text-[11px] text-ink-faint mt-2 text-center">{mode === 'study' ? '단어를 누르면 뜻·품사를 보고 내 단어장에 저장할 수 있어요.' : '문장을 누르면 소리로 들려줘요 · 노랗게 표시된 문장의 단어를 누르면 뜻을 볼 수 있어요.'}</p>

      <Progress value={page + 1} max={b.pages.length} label="읽은 페이지" />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button variant="secondary" disabled={page === 0} onClick={() => go(-1)} data-testid="page-prev">‹ 이전 쪽</Button>
        {last ? <Button onClick={() => { stop(); setPageStore(b.id, page); setPhase('quiz'); }} data-testid="book-finish">다 읽었어요 · 퀴즈</Button>
          : <Button onClick={() => go(1)} data-testid="page-next">다음 쪽 ›</Button>}
      </div>
      {mode !== 'listen' && canSpeak && <Button variant="ghost" className="w-full mt-1" onClick={() => void playFrom(page, 0, false)} data-testid="page-listen">🔊 이 페이지 전체 듣기</Button>}
      {popup}
    </Page>
  );
}
