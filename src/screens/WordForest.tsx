import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { VOCAB_BY_ID } from '@/content/vocab';
import { LEVELS, TOPIC_WORDS, type TopicId } from '@/content/vocab-topics';
import { AudioButton, Button, Card, Empty, Page, Progress, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { WordStudy } from '@/components/WordStudyCard';
import { wordMeaningQ, wordListenQ } from '@/lib/questions';
import { LEVEL_LABEL, TOPIC_BY_ID, allChapters, chapterById, chaptersOf, progressOf, topicWords, wordLevel, type Chapter } from '@/lib/wordbook';
import { cx } from '@/lib/cx';
import type { Vocabulary } from '@/domain/types';

// ───────── 이어하기 위치 (챕터별, 브라우저 저장 — 실패해도 동작) ─────────
const POS_KEY = (id: string) => `wordset-pos:${id}`;
function readPos(id: string): number { try { const v = JSON.parse(localStorage.getItem(POS_KEY(id)) ?? 'null'); return typeof v?.i === 'number' ? v.i : 0; } catch { return 0; } }
function writePos(id: string, i: number) { try { localStorage.setItem(POS_KEY(id), JSON.stringify({ i, at: Date.now() })); } catch { /* 무시 */ } }
function clearPos(id: string) { try { localStorage.removeItem(POS_KEY(id)); } catch { /* 무시 */ } }



// ───────── 메인 ─────────

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


export function SavedWords() {
  const ids = useApp((s) => s.learning.savedWords ?? []);
  const list = ids.map((id) => VOCAB_BY_ID[id]).filter(Boolean);
  return (
    <Page title="저장한 단어" back="/words">
      <Link to="/mywords" className="block mb-3 rounded-2xl bg-butter border border-[#F2D98A] p-3 text-sm font-semibold" data-testid="to-mywords">📒 동화책·표현·문법에서 저장한 단어까지 모두 보기 → 나만의 단어장</Link>
      {list.length === 0 ? <Empty icon="☆" title="저장한 단어가 없어요" desc="단어 카드의 ☆ 를 누르면 여기에 모여요." action={<Link to="/words"><Button>단어 숲으로</Button></Link>} />
        : <div className="grid gap-2" data-testid="saved-list">{list.map((v) => <WordRow key={v.id} v={v} />)}</div>}
    </Page>
  );
}
