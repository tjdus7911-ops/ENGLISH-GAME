import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { AudioButton, Button, Card, Empty, Page, Progress, SectionTitle, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { WordStudy } from '@/components/WordStudyCard';
import { wordMeaningQ } from '@/lib/questions';
import { bankQuestion } from '@/lib/libraryQuiz';
import { bankWord } from '@/lib/wordbank';
import { posName, normKey } from '@/lib/lexicon';
import { VOCAB_BY_ID } from '@/content/vocab';
import {
  LV_BY_ID, TOPIC_LABEL, WORD_LEVELS, WORD_TOPICS, isFavorite, learnedByLevel, levelTotals, loadMeta, lvOfCefr, useAllWords, useBanksReady, useLevel, wrongWordIds,
  type LvId, type W, type WTopic,
} from '@/lib/allWords';
import type { BankMeta } from '@/lib/wordbank';
import type { Question } from '@/domain/types';
import { cx } from '@/lib/cx';

type Mode = 'all' | 'unlearned' | 'learned' | 'random' | 'wrong' | 'fav' | 'topic';
const MODE_LABEL: Record<Mode, string> = { all: '전체 단어 학습', unlearned: '미학습 단어만', learned: '학습 완료 단어', random: '랜덤 학습', wrong: '틀린 단어 복습', fav: '즐겨찾기 단어', topic: '주제별 학습' };
const SIZES = [10, 20, 30, 50] as const;
const PAGE = 40;
const ls = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* noop */ } } };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const fmt = (n: number) => n.toLocaleString('ko-KR');

function useMetaState() {
  const [m, setM] = useState<BankMeta | null>(null);
  useEffect(() => { let on = true; loadMeta().then((x) => on && setM(x), () => {}); return () => { on = false; }; }, []);
  return m;
}

// ───────────────────────── 단어 숲 홈 ─────────────────────────
export function ForestHome() {
  const learned = useApp((s) => s.learning.learnedWords);
  const savedN = useApp((s) => (s.learning.savedWords ?? []).length + Object.values(s.learning.myWords ?? {}).filter((w) => w.pinned !== false && !w.vocabId).length);
  const nav = useNavigate();
  const meta = useMetaState();
  const ready = useBanksReady();
  const totals = levelTotals(meta);
  const lb = useMemo(() => learnedByLevel(learned), [learned, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const [q, setQ] = useState('');
  const last = (() => { try { return JSON.parse(ls.get('forest-last') ?? 'null') as { lv: LvId; mode: Mode; n: number; topic?: string } | null; } catch { return null; } })();
  const nextLv = totals ? WORD_LEVELS.find((l) => lb.by[l.id] < totals.total[l.id])?.id ?? 'pre-a1' : 'pre-a1';
  const cont = last ?? { lv: nextLv, mode: 'unlearned' as Mode, n: 10 };
  return (
    <Page title="단어 숲" back="/home">
      <Card data-testid="forest-progress">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-ink-soft">전체 학습 진도</p>
            <p className="text-2xl font-extrabold" data-testid="forest-total">{fmt(lb.all)} <span className="text-ink-faint text-base">/ {totals ? fmt(totals.all) : '…'}단어</span></p>
          </div>
          <span className="text-sm font-bold text-accent" data-testid="forest-pct">{totals ? pct(lb.all, totals.all) : 0}%</span>
        </div>
        <div className="mt-2"><Progress value={lb.all} max={Math.max(1, totals?.all ?? 1)} label="전체 단어 진도" /></div>
        <button type="button" onClick={() => nav(sessionUrl(cont.lv, cont.mode, cont.n, cont.topic))} data-testid="continue-words"
          className="mt-3 w-full rounded-2xl bg-accent text-white px-4 min-h-[56px] flex items-center gap-3 text-left">
          <span className="flex-1 min-w-0">
            <span className="block text-xs opacity-90">{last ? '이어서 학습하기' : '다음 학습'}</span>
            <span className="block font-bold truncate">{LV_BY_ID[cont.lv].label} ({LV_BY_ID[cont.lv].cefr}) · {MODE_LABEL[cont.mode]} {cont.n}개</span>
          </span>
          <span aria-hidden>›</span>
        </button>
      </Card>

      <form className="mt-3 flex gap-2" role="search" onSubmit={(e) => { e.preventDefault(); nav(`/words/search?q=${encodeURIComponent(q.trim())}`); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="단어·뜻 검색 (예: apple, 사과)" aria-label="단어 검색" data-testid="word-search-input"
          className="flex-1 min-w-0 rounded-2xl border border-line bg-white px-4 min-h-[48px]" />
        <Button type="submit" variant="secondary">검색</Button>
      </form>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link to="/mywords" className="rounded-2xl bg-white border border-line px-3 min-h-[48px] flex items-center gap-2 text-sm font-semibold" data-testid="go-saved-words">★ 저장한 단어 <span className="ml-auto text-ink-soft">{savedN}</span></Link>
        <Link to="/review" className="rounded-2xl bg-white border border-line px-3 min-h-[48px] flex items-center gap-2 text-sm font-semibold">↻ 단어 복습</Link>
      </div>

      <h2 className="font-bold mt-5 mb-2">난이도별 학습</h2>
      <div className="grid gap-2" data-testid="level-grid">
        {WORD_LEVELS.map((l) => {
          const total = totals?.total[l.id] ?? 0;
          const done = lb.by[l.id];
          return (
            <Link key={l.id} to={`/words/level/${l.id}`} className="rounded-card bg-white border border-line p-3 flex items-center gap-3" data-testid={`level-${l.id}`}>
              <span className="text-3xl w-12 h-12 grid place-items-center rounded-2xl bg-mist shrink-0" aria-hidden>{l.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5"><b className="whitespace-nowrap">{l.label}</b><Tag tone="accent">{l.cefr}</Tag>
                  <span className="ml-auto shrink-0 rounded-xl bg-accent-soft text-accent-dark text-xs font-bold px-2.5 min-h-[32px] grid place-items-center">{done > 0 ? '이어서 학습' : '학습 시작'}</span></span>
                <span className="block text-xs text-ink-soft mt-0.5 truncate">{l.desc}</span>
                <span className="flex items-center justify-between gap-2 text-xs mt-1">
                  <span className="whitespace-nowrap" data-testid={`level-${l.id}-count`}>전체 {totals ? fmt(total) : '…'}단어</span>
                  <span className="whitespace-nowrap text-ink-soft" data-testid={`level-${l.id}-done`}>학습 완료 {fmt(done)} / {totals ? fmt(total) : '…'} · {pct(done, total)}%</span>
                </span>
                <span className="block mt-1.5"><Progress value={done} max={Math.max(1, total)} label={`${l.label} 진도`} /></span>
              </span>
            </Link>
          );
        })}
      </div>

      <Link to="/words/grammar" className="mt-5 rounded-2xl bg-white border border-line px-4 min-h-[52px] flex items-center text-sm font-semibold" data-testid="go-grammar-words">
        📘 문법 단원별 단어장 <span className="ml-auto text-ink-soft">›</span>
      </Link>
      <p className="text-[11px] text-ink-faint mt-3 leading-relaxed">왕초보·기초 일부는 앱 기본 단어(녹음 음성 포함), 나머지는 CEFR-J 1.5 · Octanove C1/C2 목록 기반 사전 단어예요. 뜻·예문은 검수 필요, 사전 단어 발음은 기기 음성과 참고용 한글 표기로 제공해요.</p>
    </Page>
  );
}

export const sessionUrl = (lv: LvId, mode: Mode, n: number, topic?: string) => `/words/session?lv=${lv}&mode=${mode}&n=${n}${topic ? `&topic=${topic}` : ''}`;

// ───────────────────────── 난이도별 학습 화면 ─────────────────────────
export function LevelHub() {
  const { lv: lvParam = 'a1' } = useParams();
  const lv = (LV_BY_ID[lvParam as LvId] ? lvParam : 'a1') as LvId;
  const L = LV_BY_ID[lv];
  const { rows, error } = useLevel(lv);
  const l = useApp((s) => s.learning);
  const nav = useNavigate();
  const [n, setN] = useState<number>(() => Number(ls.get('forest-size')) || 10);
  const [filter, setFilter] = useState<'all' | 'unlearned' | 'learned' | 'fav' | 'wrong'>('all');
  const [topic, setTopic] = useState<WTopic | 'all'>('all');
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => { ls.set('forest-size', String(n)); }, [n]);
  const wrong = useMemo(() => wrongWordIds(l), [l]);
  const topics = useMemo(() => { const c: Partial<Record<WTopic, number>> = {}; for (const w of rows ?? []) c[w.topic] = (c[w.topic] ?? 0) + 1; return WORD_TOPICS.filter((t) => c[t.id]).map((t) => ({ ...t, n: c[t.id]! })); }, [rows]);
  const list = useMemo(() => (rows ?? []).filter((w) => {
    if (topic !== 'all' && w.topic !== topic) return false;
    if (filter === 'unlearned') return !l.learnedWords[w.id];
    if (filter === 'learned') return !!l.learnedWords[w.id];
    if (filter === 'fav') return isFavorite(l, w);
    if (filter === 'wrong') return wrong.has(w.id);
    return true;
  }), [rows, filter, topic, l, wrong]);
  const done = (rows ?? []).filter((w) => l.learnedWords[w.id]).length;
  const count = (m: Mode) => (rows ?? []).filter((w) => (m === 'unlearned' ? !l.learnedWords[w.id] : m === 'learned' ? !!l.learnedWords[w.id] : m === 'fav' ? isFavorite(l, w) : m === 'wrong' ? wrong.has(w.id) : true)).length;
  const go = (m: Mode, tp?: string) => nav(sessionUrl(lv, m, n, tp));
  const chip = (on: boolean) => cx('shrink-0 rounded-full px-3 min-h-[44px] text-[13px] font-semibold border', on ? 'bg-ink text-white border-ink' : 'bg-white border-line');
  return (
    <Page title={`${L.icon} ${L.label} (${L.cefr})`} back="/words">
      {error && <p className="text-sm text-bad">단어를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>}
      {!rows && !error && <p className="text-sm text-ink-soft" role="status">단어를 불러오는 중…</p>}
      {rows && (
        <>
          <Card data-testid="lv-progress">
            <p className="text-sm text-ink-soft">{L.desc}</p>
            <div className="flex items-end justify-between mt-1"><p className="text-xl font-extrabold">{fmt(done)} <span className="text-ink-faint text-sm">/ {fmt(rows.length)}단어</span></p><span className="text-sm font-bold text-accent">{pct(done, rows.length)}%</span></div>
            <div className="mt-2"><Progress value={done} max={Math.max(1, rows.length)} label={`${L.label} 진도`} /></div>
            <p className="text-xs text-ink-soft mt-3 mb-1">한 번에 학습할 단어 수</p>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="학습 단위">
              {SIZES.map((s) => <button key={s} role="radio" aria-checked={n === s} onClick={() => setN(s)} data-testid={`size-${s}`} className={cx('rounded-xl min-h-[44px] font-bold text-sm border', n === s ? 'bg-ink text-white border-ink' : 'bg-white border-line')}>{s}개</button>)}
            </div>
            <Button size="lg" className="w-full mt-3" onClick={() => go(count('unlearned') ? 'unlearned' : 'all')} data-testid="lv-start">{done ? '이어서 학습하기' : '학습 시작'} · {n}개</Button>
          </Card>

          <SectionTitle>학습 방법</SectionTitle>
          <div className="grid grid-cols-2 gap-2" data-testid="lv-modes">
            {(['all', 'unlearned', 'learned', 'random', 'wrong', 'fav'] as Mode[]).map((m) => {
              const c = m === 'random' ? rows.length : count(m);
              return (
                <button key={m} disabled={!c} onClick={() => go(m)} data-testid={`mode-${m}`}
                  className="rounded-2xl bg-white border border-line p-3 text-left min-h-[64px] disabled:opacity-40">
                  <span className="block font-bold text-sm">{MODE_LABEL[m]}</span><span className="text-xs text-ink-soft">{fmt(c)}단어</span>
                </button>
              );
            })}
          </div>
          <SectionTitle>주제별 학습</SectionTitle>
          <div className="flex flex-wrap gap-1.5" data-testid="lv-topics">
            {topics.map((t) => <button key={t.id} onClick={() => go('topic', t.id)} data-testid={`topic-${t.id}`} className="rounded-full bg-white border border-line px-3 min-h-[44px] text-[13px] font-semibold">{t.emoji} {t.label} <span className="text-ink-soft font-normal">{fmt(t.n)}</span></button>)}
          </div>
          <p className="text-[11px] text-ink-faint mt-1">사전 단어의 주제는 뜻을 기준으로 자동 분류했어요 (검수 대상). 뚜렷한 주제가 없는 단어는 ‘일반 어휘’로 모았어요.</p>

          <SectionTitle>단어 목록</SectionTitle>
          <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="목록 필터">
            {([['all', '전체'], ['unlearned', '미학습'], ['learned', '학습 완료'], ['fav', '즐겨찾기'], ['wrong', '틀린 단어']] as const).map(([k, t]) => <button key={k} className={chip(filter === k)} onClick={() => { setFilter(k); setLimit(PAGE); }} data-testid={`filter-${k}`}>{t}</button>)}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1" aria-label="주제 필터">
            <button className={chip(topic === 'all')} onClick={() => { setTopic('all'); setLimit(PAGE); }}>모든 주제</button>
            {topics.map((t) => <button key={t.id} className={chip(topic === t.id)} onClick={() => { setTopic(t.id); setLimit(PAGE); }}>{t.label}</button>)}
          </div>
          <p className="text-xs text-ink-soft mt-1" data-testid="lv-list-count">{fmt(list.length)}개</p>
          <div className="grid gap-2 mt-1" data-testid="lv-list">{list.slice(0, limit).map((w) => <WordLine key={w.id} w={w} />)}</div>
          {list.length > limit && <Button variant="secondary" className="w-full mt-2" onClick={() => setLimit(limit + PAGE)} data-testid="lv-more">더 보기 ({fmt(list.length - limit)}개 남음)</Button>}
        </>
      )}
    </Page>
  );
}

/** 목록·검색 결과 한 줄: 영단어·뜻·CEFR·품사·발음·예문·저장 */
function WordLine({ w, showLevelLink }: { w: W; showLevelLink?: boolean }) {
  const l = useApp((s) => s.learning);
  const toggleVocab = useApp((s) => s.toggleSaveWord);
  const saveWord = useApp((s) => s.saveWord);
  const unsave = useApp((s) => s.unsaveWord);
  const fav = isFavorite(l, w);
  const learned = !!l.learnedWords[w.id];
  const [open, setOpen] = useState(false);
  const core = !!VOCAB_BY_ID[w.id];
  const toggle = () => { if (core) toggleVocab(w.id); else if (fav) unsave(normKey(w.word)); else saveWord(w.word, 'words', w.id, w.example); };
  const lvId = lvOfCefr(w.level);
  return (
    <div className="rounded-2xl bg-white border border-line p-3" data-testid="word-line" data-id={w.id} data-level={w.level}>
      <div className="flex items-start gap-2">
        <button className="flex-1 min-w-0 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="flex items-center gap-1.5 flex-wrap"><b className="text-lg break-words">{w.word}</b><span className="text-xs text-ink-soft">{posName(w.pos)}</span><Tag tone="accent">{w.level}</Tag>{learned && <Tag tone="ok">학습함</Tag>}</span>
          <span className="block text-sm mt-0.5 break-words">{w.meaning}</span>
          <span className="block text-xs text-ink-soft mt-0.5">{w.ipa}{w.koPron && ` · [${w.koPron}]`}</span>
          {open && <span className="block mt-1.5 text-sm"><span className="block font-medium break-words">{w.example}</span><span className="block text-ink-soft break-words">{w.exampleKo}</span></span>}
        </button>
        <AudioButton src={w.audio} text={w.word} size="sm" label={`${w.word} 발음 듣기`} />
        <button type="button" onClick={toggle} aria-pressed={fav} aria-label={fav ? '저장 취소' : '저장'} data-testid="line-save" className={cx('w-11 h-11 grid place-items-center rounded-full text-xl', fav ? 'text-accent' : 'text-ink-faint')}>{fav ? '★' : '☆'}</button>
      </div>
      {showLevelLink && <Link to={`/words/level/${lvId}`} className="inline-flex items-center text-xs font-bold text-accent-dark mt-1 min-h-[44px]" data-testid="line-level-link">{LV_BY_ID[lvId].label} ({w.level}) 학습으로 이동 ›</Link>}
    </div>
  );
}

// ───────────────────────── 학습 세션 ─────────────────────────
function pickWords(rows: W[], mode: Mode, n: number, l: ReturnType<typeof useApp.getState>['learning'], topic: string | null, seed: number): W[] {
  const wrong = wrongWordIds(l);
  let pool = rows;
  if (mode === 'topic' && topic) pool = rows.filter((w) => w.topic === topic);
  if (mode === 'unlearned') pool = rows.filter((w) => !l.learnedWords[w.id]);
  if (mode === 'learned') pool = rows.filter((w) => l.learnedWords[w.id]);
  if (mode === 'wrong') pool = rows.filter((w) => wrong.has(w.id));
  if (mode === 'fav') pool = rows.filter((w) => isFavorite(l, w));
  if (mode === 'random') {
    const a = pool.slice(); let h = seed;
    for (let i = a.length - 1; i > 0; i--) { h = (Math.imul(h ^ (h >>> 15), 2246822519) + 1) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  // 전체·주제별: 아직 학습하지 않은 단어부터 순서대로 (모두 학습했으면 처음부터 복습)
  if (mode === 'all' || mode === 'topic') { const un = pool.filter((w) => !l.learnedWords[w.id]); return (un.length ? un : pool).slice(0, n); }
  return pool.slice(0, n);
}

const questionOf = (w: W): Question => (VOCAB_BY_ID[w.id] ? wordMeaningQ(VOCAB_BY_ID[w.id]) : bankQuestion(bankWord(w.id) ?? { id: w.id, w: w.word, m: w.meaning, pos: [w.pos] }));

export function StudySession() {
  const [sp] = useSearchParams();
  const lv = (LV_BY_ID[sp.get('lv') as LvId] ? sp.get('lv') : 'a1') as LvId;
  const mode = (sp.get('mode') as Mode) || 'unlearned';
  const n = Math.min(50, Math.max(5, Number(sp.get('n')) || 10));
  const topic = sp.get('topic');
  const { rows } = useLevel(lv);
  const complete = useApp((s) => s.completeStudySession);
  const nav = useNavigate();
  const key = `forest-session:${lv}:${mode}:${n}:${topic ?? ''}`;
  const [ids, setIds] = useState<string[] | null>(() => { try { const v = JSON.parse(sessionStorage.getItem(key) ?? 'null'); return Array.isArray(v) ? v : null; } catch { return null; } });
  useEffect(() => {
    if (!rows || ids) return;
    const picked = pickWords(rows, mode, n, useApp.getState().learning, topic, Date.now() >>> 0).map((w) => w.id);
    setIds(picked);
    try { sessionStorage.setItem(key, JSON.stringify(picked)); } catch { /* noop */ }
  }, [rows, ids, mode, n, topic, key]);
  useEffect(() => { ls.set('forest-last', JSON.stringify({ lv, mode, n, topic: topic ?? undefined })); }, [lv, mode, n, topic]);
  const words = useMemo(() => (ids && rows ? ids.map((id) => rows.find((w) => w.id === id)).filter((w): w is W => !!w) : []), [ids, rows]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'study' | 'quiz' | 'result'>('study');
  const [rs, setRs] = useState<QResult[]>([]);
  const qs = useMemo(() => words.map(questionOf), [words]);
  const L = LV_BY_ID[lv];
  const title = `${L.label}(${L.cefr}) · ${mode === 'topic' && topic ? TOPIC_LABEL[topic as WTopic]?.label ?? topic : MODE_LABEL[mode]}`;
  const finish = () => { try { sessionStorage.removeItem(key); } catch { /* noop */ } };
  if (!rows || !ids) return <Page title={title} back={`/words/level/${lv}`}><p className="text-sm text-ink-soft" role="status">단어를 불러오는 중…</p></Page>;
  if (!words.length) return <Page title={title} back={`/words/level/${lv}`}><Empty icon="🌿" title="이 방법으로 학습할 단어가 없어요" desc="다른 학습 방법을 골라 보세요." action={<Link to={`/words/level/${lv}`}><Button>난이도 화면으로</Button></Link>} /></Page>;
  const v = words[i];
  return (
    <Page title={title} back={`/words/level/${lv}`}>
      {phase === 'study' && (
        <>
          <div className="flex items-center gap-3 mb-3"><span className="text-sm font-semibold text-ink-soft whitespace-nowrap" data-testid="session-pos">{i + 1} / {words.length}</span><Progress value={i + 1} max={words.length} label="학습 진행" /></div>
          <WordStudy key={v.id} v={v} index={i} total={words.length} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)} data-testid="prev-word">‹ 이전</Button>
            {i < words.length - 1 ? <Button onClick={() => setI(i + 1)} data-testid="next-word">다음 ›</Button>
              : <Button onClick={() => setPhase('quiz')} data-testid="start-word-quiz">확인 문제</Button>}
          </div>
        </>
      )}
      {phase === 'quiz' && <QuizRunner questions={qs} title="뜻 확인" onDone={(x) => { complete(key, title, words.map((w) => w.id), toAnswers(x, 'lesson')); finish(); setRs(x); setPhase('result'); }} />}
      {phase === 'result' && (
        <ResultView results={rs} title={`${title} 결과`}>
          <p className="text-xs text-ink-soft text-center mb-2">새로 학습한 단어 10개마다 ★2 · 같은 단어를 다시 학습하면 별은 추가되지 않아요. 틀린 단어는 ‘틀린 단어 복습’에 모여요.</p>
          <div className="grid gap-2">
            <Button size="lg" onClick={() => { setIds(null); setI(0); setPhase('study'); }} data-testid="session-again">다음 {n}개 이어서</Button>
            <Button variant="secondary" onClick={() => nav(`/words/level/${lv}`)}>난이도 화면으로</Button>
          </div>
        </ResultView>
      )}
    </Page>
  );
}

// ───────────────────────── 전체 검색 ─────────────────────────
export function SearchAll() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const { rows, error } = useAllWords();
  const term = q.trim().toLowerCase();
  const list = useMemo(() => {
    if (!term || !rows) return [];
    const exact: W[] = [], starts: W[] = [], other: W[] = [];
    for (const w of rows) {
      const ww = w.word.toLowerCase();
      if (ww === term) exact.push(w); else if (ww.startsWith(term)) starts.push(w); else if (ww.includes(term) || w.meaning.includes(q.trim())) other.push(w);
    }
    return [...exact, ...starts, ...other];
  }, [rows, term, q]);
  return (
    <Page title="단어 검색" back="/words">
      <input value={q} onChange={(e) => { setQ(e.target.value); setSp({ q: e.target.value }, { replace: true }); }} placeholder="영어 또는 뜻으로 검색" aria-label="단어 검색" autoFocus data-testid="search-q"
        className="w-full rounded-2xl border border-line bg-white px-4 min-h-[48px]" />
      <p className="text-xs text-ink-soft mt-2" data-testid="search-count">{!rows ? (error ? '단어를 불러오지 못했어요' : '단어를 불러오는 중…') : term ? `${fmt(list.length)}개 결과` : `전체 ${fmt(rows.length)}단어에서 검색해요`}</p>
      <div className="grid gap-2 mt-2" data-testid="search-results">{list.slice(0, 60).map((w) => <WordLine key={w.id} w={w} showLevelLink />)}</div>
      {term && rows && list.length === 0 && <Empty icon="🔍" title="검색 결과가 없어요" desc="철자나 다른 뜻으로 다시 찾아보세요." />}
      {list.length > 60 && <p className="text-xs text-ink-faint mt-2">상위 60개만 보여 줘요. 검색어를 더 구체적으로 입력해 보세요.</p>}
    </Page>
  );
}
