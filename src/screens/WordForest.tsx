import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { VOCAB, VOCAB_BY_ID } from '@/content/vocab';
import { LEVELS, TOPIC_WORDS, type TopicId, type WordLevel } from '@/content/vocab-topics';
import { AudioButton, Button, Card, Empty, Page, Progress, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { WordStudy } from '@/components/WordStudyCard';
import { wordMeaningQ, wordListenQ } from '@/lib/questions';
import { ALL_TOPICS, LEVEL_LABEL, TOPIC_BY_ID, allChapters, chapterById, chaptersOf, levelWords, nextChapter, progressOf, topicWords, wordLevel, type Chapter, type Progress as P } from '@/lib/wordbook';
import { TOPICS, CORE_TOPIC } from '@/content/vocab-topics';
import { cx } from '@/lib/cx';
import type { Vocabulary } from '@/domain/types';

// ───────── 이어하기 위치 (챕터별, 브라우저 저장 — 실패해도 동작) ─────────
const POS_KEY = (id: string) => `wordset-pos:${id}`;
function readPos(id: string): number { try { const v = JSON.parse(localStorage.getItem(POS_KEY(id)) ?? 'null'); return typeof v?.i === 'number' ? v.i : 0; } catch { return 0; } }
function writePos(id: string, i: number) { try { localStorage.setItem(POS_KEY(id), JSON.stringify({ i, at: Date.now() })); } catch { /* 무시 */ } }
function clearPos(id: string) { try { localStorage.removeItem(POS_KEY(id)); } catch { /* 무시 */ } }
function lastOpenChapter(): { ch: Chapter; i: number } | null {
  try {
    let best: { ch: Chapter; i: number; at: number } | null = null;
    for (let k = 0; k < localStorage.length; k++) {
      const key = localStorage.key(k)!;
      if (!key.startsWith('wordset-pos:')) continue;
      const ch = chapterById(key.slice(12)); const v = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (ch && v && (!best || v.at > best.at)) best = { ch, i: v.i, at: v.at };
    }
    return best;
  } catch { return null; }
}

function StateTag({ p }: { p: P }) {
  if (p.state === 'done') return <Tag tone="ok">✓ 완료</Tag>;
  if (p.state === 'progress') return <Tag tone="accent">진행 중</Tag>;
  if (p.state === 'empty') return <Tag>준비 중</Tag>;
  return null;
}

function CategoryCard({ to, emoji, label, desc, p, tint, wide, testId }: { to: string; emoji: string; label: string; desc: string; p: P; tint: string; wide?: boolean; testId: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl" aria-hidden>{emoji}</span>
        <StateTag p={p} />
      </div>
      <p className="font-bold mt-1 leading-tight">{label}</p>
      <p className="text-[11px] text-ink-soft">{desc}</p>
      {p.total > 0 ? (
        <>
          <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden"><div className={cx('h-full', p.state === 'done' ? 'bg-ok' : 'bg-accent')} style={{ width: `${p.pct}%` }} /></div>
          <p className="text-[11px] text-ink-soft mt-1" data-testid={`${testId}-count`}>{p.learned}/{p.total}단어 · {p.pct}%</p>
        </>
      ) : <p className="text-[11px] text-ink-faint mt-2">아직 단어가 없어요</p>}
    </>
  );
  const cls = cx('rounded-card border p-3 block', tint, wide && 'col-span-2', p.state === 'done' ? 'border-[#9FD8BF]' : 'border-transparent');
  if (p.total === 0) return <div className={cx(cls, 'opacity-60 cursor-not-allowed')} aria-disabled="true" data-testid={testId} data-state="empty">{body}</div>;
  return <Link to={to} className={cls} data-testid={testId} data-state={p.state}>{body}</Link>;
}

// ───────── 메인 ─────────
export function WordForestHome() {
  const learned = useApp((s) => s.learning.learnedWords);
  const savedN = useApp((s) => (s.learning.savedWords ?? []).length);
  const nav = useNavigate();
  const total = VOCAB.length;
  const done = VOCAB.filter((v) => learned[v.id]).length;
  const open = lastOpenChapter();
  const cont = open && progressOf(open.ch.words, learned).state !== 'done' ? open : null;
  const next = cont?.ch ?? nextChapter(learned);
  const [q, setQ] = useState('');
  return (
    <Page title="단어 숲" back="/home">
      <Card data-testid="forest-progress">
        <div className="flex items-end justify-between">
          <div><p className="text-sm text-ink-soft">전체 학습 진도</p><p className="text-2xl font-extrabold">{done} <span className="text-ink-faint text-base">/ {total}단어</span></p></div>
          <span className="text-sm font-bold text-accent">{Math.round((done / total) * 100)}%</span>
        </div>
        <div className="mt-2"><Progress value={done} max={total} label="전체 단어 진도" /></div>
        {next ? (
          <button type="button" onClick={() => nav(`/words/ch/${next.id}`)} data-testid="continue-words"
            className="mt-3 w-full rounded-2xl bg-accent text-white px-4 min-h-[56px] flex items-center gap-3 text-left">
            <span className="flex-1 min-w-0">
              <span className="block text-xs opacity-90">{cont ? '이어서 학습하기' : '다음 학습'}</span>
              <span className="block font-bold truncate">{TOPIC_BY_ID[next.topic].label} · {LEVEL_LABEL[next.level].label} {next.index}{cont ? ` · ${cont.i + 1}/${next.words.length}단어` : ''}</span>
            </span>
            <span aria-hidden>›</span>
          </button>
        ) : <p className="mt-3 text-sm text-ok font-bold">모든 단어를 학습했어요! 복습으로 기억을 다져요.</p>}
      </Card>

      <form className="mt-3 flex gap-2" role="search" onSubmit={(e) => { e.preventDefault(); nav(`/words/search?q=${encodeURIComponent(q.trim())}`); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="단어·뜻 검색 (예: apple, 사과)" aria-label="단어 검색" data-testid="word-search-input"
          className="flex-1 min-w-0 rounded-2xl border border-line bg-white px-4 min-h-[48px]" />
        <Button type="submit" variant="secondary">검색</Button>
      </form>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link to="/words/saved" className="rounded-2xl bg-white border border-line px-3 min-h-[48px] flex items-center gap-2 text-sm font-semibold" data-testid="go-saved-words">★ 저장한 단어 <span className="ml-auto text-ink-soft">{savedN}</span></Link>
        <Link to="/review" className="rounded-2xl bg-white border border-line px-3 min-h-[48px] flex items-center gap-2 text-sm font-semibold">↻ 단어 복습</Link>
      </div>

      <h2 className="font-bold mt-5 mb-2">난이도별</h2>
      <div className="grid grid-cols-2 gap-2" data-testid="level-grid">
        {LEVELS.map((l) => (
          <CategoryCard key={l.id} to={`/words/level/${l.id}`} emoji={['🌱', '🌿', '🌳', '🏔', '⭐'][LEVELS.indexOf(l)]} label={`${l.label} (${l.cefr})`} desc={l.desc}
            p={progressOf(levelWords(l.id), learned)} tint="bg-white" testId={`level-${l.id}`} wide={l.id === 'b2'} />
        ))}
      </div>

      <h2 className="font-bold mt-5 mb-2">주제별</h2>
      <div className="grid grid-cols-2 gap-2" data-testid="topic-grid">
        {TOPICS.map((t) => <CategoryCard key={t.id} to={`/words/topic/${t.id}`} emoji={t.emoji} label={t.label} desc={t.desc} p={progressOf(topicWords(t.id), learned)} tint={t.tint} testId={`topic-${t.id}`} />)}
        <CategoryCard to={`/words/topic/${CORE_TOPIC.id}`} emoji={CORE_TOPIC.emoji} label={CORE_TOPIC.label} desc={CORE_TOPIC.desc} p={progressOf(topicWords('core'), learned)} tint={CORE_TOPIC.tint} wide testId="topic-core" />
      </div>

      <Link to="/words/grammar" className="mt-5 rounded-2xl bg-white border border-line px-4 min-h-[52px] flex items-center text-sm font-semibold" data-testid="go-grammar-words">
        📘 문법 단원별 단어장 (기존 10단원) <span className="ml-auto text-ink-soft">›</span>
      </Link>
      <p className="text-[11px] text-ink-faint mt-3">현재 단어 DB 는 A1 범위 300단어예요. 초급(A2) 이상은 준비 중이라 학습할 수 없어요.</p>
    </Page>
  );
}

function ChapterRow({ c, learned }: { c: Chapter; learned: Record<string, string> }) {
  const p = progressOf(c.words, learned);
  return (
    <Link to={`/words/ch/${c.id}`} className={cx('rounded-2xl bg-white border p-3 flex items-center gap-3 min-h-[60px]', p.state === 'done' ? 'border-[#9FD8BF]' : 'border-line')} data-testid={`chapter-${c.id}`} data-state={p.state}>
      <span className={cx('w-9 h-9 rounded-full grid place-items-center font-bold text-sm shrink-0', p.state === 'done' ? 'bg-mint text-ok' : p.state === 'progress' ? 'bg-accent-soft text-accent-dark' : 'bg-mist text-ink-soft')}>{p.state === 'done' ? '✓' : c.index}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-sm">{TOPIC_BY_ID[c.topic].label} {LEVEL_LABEL[c.level].label} {c.index}</span>
        <span className="block text-xs text-ink-soft truncate">{c.words.map((w) => w.word).join(', ')}</span>
      </span>
      <span className="text-xs text-ink-soft whitespace-nowrap">{p.learned}/{p.total}</span>
    </Link>
  );
}

export function WordLevelPage() {
  const { lv = 'a1' } = useParams();
  const learned = useApp((s) => s.learning.learnedWords);
  const meta = LEVEL_LABEL[lv as WordLevel];
  if (!meta) return <Page title="단어장" back="/words"><Empty title="난이도를 찾을 수 없어요" /></Page>;
  const chs = chaptersOf({ level: lv as WordLevel });
  const p = progressOf(levelWords(lv as WordLevel), learned);
  return (
    <Page title={`${meta.label} (${meta.cefr})`} back="/words">
      {chs.length === 0 ? <Empty icon="🌱" title="준비 중인 난이도예요" desc="이 난이도의 단어는 아직 없어요. 지금은 왕초보·기초 단어로 학습할 수 있어요." action={<Link to="/words"><Button>단어 숲으로</Button></Link>} /> : (
        <>
          <Card><p className="text-sm text-ink-soft">{meta.desc}</p><p className="font-bold mt-1">{p.learned}/{p.total}단어 · {p.pct}%</p><div className="mt-2"><Progress value={p.learned} max={p.total} /></div></Card>
          {ALL_TOPICS.map((t) => {
            const list = chs.filter((c) => c.topic === t.id);
            if (!list.length) return null;
            return (
              <section key={t.id} className="mt-4">
                <h2 className="font-bold mb-2">{t.emoji} {t.label}</h2>
                <div className="grid gap-2">{list.map((c) => <ChapterRow key={c.id} c={c} learned={learned} />)}</div>
              </section>
            );
          })}
        </>
      )}
    </Page>
  );
}

export function WordTopicPage() {
  const { topic = '' } = useParams();
  const learned = useApp((s) => s.learning.learnedWords);
  const meta = TOPIC_BY_ID[topic as TopicId];
  if (!meta) return <Page title="단어장" back="/words"><Empty title="주제를 찾을 수 없어요" /></Page>;
  const chs = chaptersOf({ topic: topic as TopicId });
  const p = progressOf(topicWords(topic as TopicId), learned);
  return (
    <Page title={meta.label} back="/words">
      <Card className={meta.tint}><p className="text-2xl" aria-hidden>{meta.emoji}</p><p className="text-sm text-ink-soft">{meta.desc}</p><p className="font-bold mt-1" data-testid="topic-progress">{p.learned}/{p.total}단어 · {p.pct}%</p><div className="mt-2"><Progress value={p.learned} max={p.total} /></div></Card>
      {chs.length === 0 && <Empty title="준비 중인 주제예요" />}
      {LEVELS.map((l) => {
        const list = chs.filter((c) => c.level === l.id);
        if (!list.length) return null;
        return (
          <section key={l.id} className="mt-4">
            <h2 className="font-bold mb-2">{l.label} <span className="text-ink-faint text-sm">{l.cefr}</span></h2>
            <div className="grid gap-2">{list.map((c) => <ChapterRow key={c.id} c={c} learned={learned} />)}</div>
          </section>
        );
      })}
    </Page>
  );
}

// ───────── 챕터 학습: 단어 5개 → 확인 퀴즈 1~2개 → 보상 ─────────
export function ChapterLearn() {
  const { chapterId = '' } = useParams();
  const ch = chapterById(chapterId);
  const nav = useNavigate();
  const learned = useApp((s) => s.learning.learnedWords);
  const complete = useApp((s) => s.completeWordSet);
  const [i, setIRaw] = useState(() => {
    if (!ch) return 0;
    const w = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('w'); // 검색에서 특정 단어로 진입
    const at = w ? ch.words.findIndex((x) => x.id === w) : -1;
    return at >= 0 ? at : Math.min(readPos(ch.id), ch.words.length - 1);
  });
  const [phase, setPhase] = useState<'cards' | 'quiz' | 'result'>('cards');
  const [results, setResults] = useState<QResult[]>([]);
  const [firstReward, setFirstReward] = useState(false);
  const quiz = useMemo(() => {
    if (!ch) return [];
    const ws = ch.words;
    const a = ws[(ch.index * 3) % ws.length];
    const b = ws.length > 1 ? ws[(ch.index * 3 + 2) % ws.length] : null;
    return [wordMeaningQ(a, ch.index), ...(b && b.id !== a.id ? [wordListenQ(b, ch.index)] : [])];
  }, [ch]);
  if (!ch) return <Page title="단어장" back="/words"><Empty title="챕터를 찾을 수 없어요" action={<Link to="/words"><Button>단어 숲으로</Button></Link>} /></Page>;
  const setI = (n: number) => { setIRaw(n); writePos(ch.id, n); };
  const title = `${TOPIC_BY_ID[ch.topic].label} ${LEVEL_LABEL[ch.level].label} ${ch.index}`;
  const siblings = chaptersOf({ topic: ch.topic });
  const nextCh = siblings[siblings.findIndex((c) => c.id === ch.id) + 1];
  const v = ch.words[i];
  const allLearned = ch.words.every((w) => learned[w.id]);
  return (
    <Page title={title} back={`/words/topic/${ch.topic}`}>
      {phase === 'cards' && (
        <>
          <div className="flex items-center gap-3 mb-3" data-testid="study-progress"><span className="text-sm font-semibold text-ink-soft whitespace-nowrap">{i + 1} / {ch.words.length}</span><Progress value={i + 1} max={ch.words.length} label="단어 학습 진행률" /></div>
          {allLearned && <p className="text-xs text-ink-soft mb-2">이미 학습한 챕터예요. 다시 보기 모드 (보상은 한 번만 지급돼요).</p>}
          <WordStudy key={v.id} v={v} index={i} total={ch.words.length} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)} data-testid="prev-word">이전 단어</Button>
            {i + 1 < ch.words.length ? <Button onClick={() => setI(i + 1)} data-testid="next-word">다음 단어</Button>
              : <Button onClick={() => setPhase('quiz')} data-testid="start-chapter-quiz">확인 퀴즈 {quiz.length}문제</Button>}
          </div>
          <p className="text-[11px] text-ink-faint mt-3 text-center">언제든 나가도 보던 단어부터 이어서 할 수 있어요.</p>
        </>
      )}
      {phase === 'quiz' && <QuizRunner questions={quiz} title="확인 퀴즈" onDone={(rs) => {
        setResults(rs);
        setFirstReward(ch.words.some((w) => !learned[w.id]));
        complete(ch.id, title, ch.words.map((w) => w.id), toAnswers(rs, 'free'));
        clearPos(ch.id);
        setPhase('result');
      }} />}
      {phase === 'result' && (
        <ResultView results={results} title={`${title} 완료`}>
          {firstReward && <p className="text-center text-sm font-bold text-ok -mt-2" data-testid="chapter-reward">챕터 첫 완료 보상 ★ 2 · 파트너 성장 XP 3</p>}
          {nextCh ? <Button size="lg" onClick={() => { setPhase('cards'); setIRaw(0); nav(`/words/ch/${nextCh.id}`); }} data-testid="next-chapter">다음 챕터: {TOPIC_BY_ID[nextCh.topic].label} {LEVEL_LABEL[nextCh.level].label} {nextCh.index}</Button>
            : <Button size="lg" onClick={() => nav(`/words/topic/${ch.topic}`)}>주제 단어장으로</Button>}
          <Button variant="secondary" onClick={() => nav('/words')}>단어 숲으로</Button>
          <Button variant="ghost" onClick={() => nav('/home')}>마을로 돌아가기</Button>
        </ResultView>
      )}
    </Page>
  );
}

// ───────── 검색 · 저장한 단어 ─────────
function WordRow({ v }: { v: Vocabulary }) {
  const saved = useApp((s) => (s.learning.savedWords ?? []).includes(v.id));
  const toggle = useApp((s) => s.toggleSaveWord);
  const learnedOn = useApp((s) => s.learning.learnedWords[v.id]);
  const topics = (Object.keys(TOPIC_WORDS) as TopicId[]).filter((t) => TOPIC_WORDS[t].includes(v.id));
  const ch = allChapters().find((c) => c.words.some((w) => w.id === v.id));
  return (
    <Card className="!p-3" data-testid={`word-row-${v.id}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold break-words">{v.word} <span className="text-xs text-ink-faint font-normal">{v.pos}</span> {learnedOn && <Tag tone="ok">학습</Tag>}</p>
          <p className="text-sm text-ink-soft break-words">{v.meaning}</p>
          <p className="text-[11px] text-ink-faint mt-0.5">{LEVEL_LABEL[wordLevel(v)].label} · {topics.map((t) => TOPIC_BY_ID[t].label).join(' · ')}</p>
        </div>
        <AudioButton src={v.audio} text={v.word} size="sm" label={`${v.word} 발음 듣기`} />
        <button type="button" onClick={() => toggle(v.id)} aria-pressed={saved} aria-label={saved ? '단어 저장 취소' : '단어 저장'} className={cx('w-11 h-11 grid place-items-center rounded-full text-xl', saved ? 'text-accent' : 'text-ink-faint')}>{saved ? '★' : '☆'}</button>
      </div>
      {ch && <Link to={`/words/ch/${ch.id}?w=${v.id}`} className="inline-flex items-center text-xs font-bold text-accent-dark mt-1 min-h-[44px]">이 단어가 있는 챕터 학습하기 ›</Link>}
    </Card>
  );
}

export function WordSearch() {
  const init = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('q') ?? '';
  const [q, setQ] = useState(init);
  const term = q.trim().toLowerCase();
  const list = term ? VOCAB.filter((v) => v.word.toLowerCase().includes(term) || v.meaning.includes(q.trim())) : [];
  return (
    <Page title="단어 검색" back="/words">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="영어 또는 뜻으로 검색" aria-label="단어 검색" autoFocus data-testid="search-q"
        className="w-full rounded-2xl border border-line bg-white px-4 min-h-[48px]" />
      <p className="text-xs text-ink-soft mt-2" data-testid="search-count">{term ? `${list.length}개 결과` : `전체 ${VOCAB.length}단어에서 검색해요`}</p>
      <div className="grid gap-2 mt-2">{list.slice(0, 60).map((v) => <WordRow key={v.id} v={v} />)}</div>
      {term && list.length === 0 && <Empty icon="🔍" title="검색 결과가 없어요" desc="철자나 다른 뜻으로 다시 찾아보세요." />}
    </Page>
  );
}

export function SavedWords() {
  const ids = useApp((s) => s.learning.savedWords ?? []);
  const list = ids.map((id) => VOCAB_BY_ID[id]).filter(Boolean);
  return (
    <Page title="저장한 단어" back="/words">
      {list.length === 0 ? <Empty icon="☆" title="저장한 단어가 없어요" desc="단어 카드의 ☆ 를 누르면 여기에 모여요." action={<Link to="/words"><Button>단어 숲으로</Button></Link>} />
        : <div className="grid gap-2" data-testid="saved-list">{list.map((v) => <WordRow key={v.id} v={v} />)}</div>}
    </Page>
  );
}
