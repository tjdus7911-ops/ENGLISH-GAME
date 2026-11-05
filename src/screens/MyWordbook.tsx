import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp, today } from '@/store/app';
import { Button, Empty, Modal, Page, Tag } from '@/components/ui';
import { QuizRunner, ResultView, type QResult } from '@/components/Quiz';
import { myWordStatus, reviewQueue, SOURCE_LABEL, STATUS_LABEL, type MyWord, type MyWordStatus, type WordSource } from '@/domain/learning/mywords';
import { myWordQuestion } from '@/lib/libraryQuiz';
import { VOCAB_BY_ID } from '@/content/vocab';
import { playAudio } from '@/lib/audio';
import { speak } from '@/lib/tts';
import { cx } from '@/lib/cx';

const LEVELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1'];
const STATUS_TONE: Record<MyWordStatus, 'gray' | 'accent' | 'warn' | 'ok'> = { new: 'gray', learning: 'accent', review: 'warn', memorized: 'ok' };
type StatusFilter = 'all' | MyWordStatus | 'unmemorized';
const PAGE = 30;
const NO_WORDS: Record<string, MyWord> = {};

function say(w: MyWord) {
  const v = w.vocabId ? VOCAB_BY_ID[w.vocabId] : null;
  if (v) void playAudio(v.audio, { fallbackText: v.word }); else void speak(w.word, 0.9);
}

export function MyWordbook() {
  const map = (useApp((s) => s.learning.myWords) ?? NO_WORDS);
  const remove = useApp((s) => s.removeMyWord);
  const setMem = useApp((s) => s.setMemorized);
  const nav = useNavigate();
  const d = today();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [lv, setLv] = useState<string>('all');
  const [src, setSrc] = useState<WordSource | 'all'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'new' | 'old' | 'abc'>('new');
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState(PAGE);
  const [del, setDel] = useState<MyWord | null>(null);

  const all = useMemo(() => Object.values(map), [map]);
  const counts = useMemo(() => {
    const c: Record<MyWordStatus, number> = { new: 0, learning: 0, review: 0, memorized: 0 };
    for (const w of all) c[myWordStatus(w, d)]++;
    return c;
  }, [all, d]);
  const due = reviewQueue(map, d, 999).length;
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    const r = all.filter((w) => {
      const st = myWordStatus(w, d);
      if (status === 'unmemorized' ? st === 'memorized' : status !== 'all' && st !== status) return false;
      if (lv !== 'all' && w.level !== lv) return false;
      if (src !== 'all' && !w.sources.includes(src)) return false;
      if (k && !w.word.toLowerCase().includes(k) && !w.meaning.includes(k)) return false;
      return true;
    });
    r.sort((a, b) => (sort === 'abc' ? a.word.localeCompare(b.word) : sort === 'new' ? b.savedAt - a.savedAt : a.savedAt - b.savedAt));
    return r;
  }, [all, status, lv, src, q, sort, d]);

  const chip = (on: boolean) => cx('shrink-0 rounded-full px-3 min-h-[38px] text-[13px] font-semibold border', on ? 'bg-ink text-white border-ink' : 'bg-white border-line');

  return (
    <Page title="나만의 단어장" back="/home">
      <div className="rounded-card bg-white border border-line p-4" data-testid="mw-summary">
        <div className="grid grid-cols-4 text-center">
          {(Object.keys(STATUS_LABEL) as MyWordStatus[]).map((st) => (
            <button key={st} onClick={() => setStatus(status === st ? 'all' : st)} className="min-h-[56px]" data-testid={`mw-count-${st}`} aria-pressed={status === st}>
              <span className="block text-xl font-extrabold">{counts[st]}</span><span className="block text-[11px] text-ink-soft">{STATUS_LABEL[st]}</span>
            </button>
          ))}
        </div>
        <Button className="w-full mt-3" size="lg" disabled={all.length === 0} onClick={() => nav('/mywords/review')} data-testid="mw-review-start">
          복습 퀴즈 시작 {due > 0 ? `· 오늘 ${Math.min(due, 10)}개` : ''}
        </Button>
        <p className="text-[11px] text-ink-faint mt-1.5 text-center">복습 간격: 저장 당일 → 1일 → 3일 → 7일 → 14일 → 30일 · 틀리면 다음 날 다시, 자주 틀리면 먼저 출제</p>
      </div>

      {all.length === 0 ? (
        <Empty icon="📒" title="아직 저장한 단어가 없어요" desc="영단어 카드의 ☆, 동화책·표현·문법 예문에서 단어를 눌러 '내 단어장에 저장'을 해 보세요." action={<Link to="/library/books" className="underline font-semibold">동화책 읽으러 가기</Link>} />
      ) : (
        <>
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="단어 또는 뜻 검색" aria-label="단어 검색" data-testid="mw-search"
            className="mt-4 w-full rounded-2xl border border-line bg-white px-4 min-h-[48px]" />
          <div className="flex gap-1.5 overflow-x-auto mt-2 pb-1" aria-label="상태">
            {(['all', 'unmemorized'] as const).map((st) => <button key={st} className={chip(status === st)} onClick={() => setStatus(st)} data-testid={`mw-status-${st}`}>{st === 'all' ? `전체 ${all.length}` : '미암기만'}</button>)}
          </div>
          <div className="flex gap-1.5 overflow-x-auto mt-1 pb-1" aria-label="저장한 곳">
            {(['all', 'words', 'expression', 'book', 'grammar'] as const).map((x) => <button key={x} className={chip(src === x)} onClick={() => setSrc(x)} data-testid={`mw-src-${x}`}>{x === 'all' ? '모든 영역' : SOURCE_LABEL[x]}</button>)}
          </div>
          <div className="flex gap-1.5 overflow-x-auto mt-1 pb-1" aria-label="난이도">
            {['all', ...LEVELS].map((x) => <button key={x} className={chip(lv === x)} onClick={() => setLv(x)} data-testid={`mw-lv-${x}`}>{x === 'all' ? '모든 레벨' : x}</button>)}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-ink-soft" data-testid="mw-result-count">{list.length}개</p>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="정렬" className="rounded-xl border border-line bg-white px-2 min-h-[40px] text-sm" data-testid="mw-sort">
              <option value="new">최근 저장순</option><option value="old">오래된 순</option><option value="abc">알파벳순</option>
            </select>
          </div>
          <div className="grid gap-2 mt-2" data-testid="mw-list">
            {list.slice(0, limit).map((w) => {
              const st = myWordStatus(w, d);
              const open = !!flipped[w.key];
              return (
                <div key={w.key} className="rounded-2xl bg-white border border-line p-3" data-testid="mw-item" data-key={w.key} data-status={st}>
                  <div className="flex items-start gap-2">
                    <button className="flex-1 min-w-0 text-left min-h-[56px]" onClick={() => setFlipped({ ...flipped, [w.key]: !open })} aria-expanded={open} data-testid="mw-flip">
                      <span className="flex items-center gap-1.5 flex-wrap"><Tag tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Tag><Tag>{w.level}</Tag>{w.srs.difficult && <Tag tone="warn">자주 틀림</Tag>}{w.pinned === false && <Tag>단어 숲 학습</Tag>}</span>
                      <span className="block text-xl font-extrabold mt-1 break-words">{w.word}</span>
                      <span className={cx('block mt-0.5 break-words', open ? 'font-semibold' : 'text-ink-faint text-sm')} data-testid="mw-meaning">{open ? `${w.meaning} · ${w.pos}` : '눌러서 뜻 확인'}</span>
                      {open && w.context && <span className="block text-xs text-ink-soft mt-1 break-words">“{w.context}”</span>}
                      {open && <span className="block text-[11px] text-ink-faint mt-1">{w.sources.map((x) => SOURCE_LABEL[x]).join(' · ')} · 저장 {w.savedOn}{st !== 'memorized' && ` · 다음 복습 ${w.srs.due}`}</span>}
                    </button>
                    <div className="flex flex-col gap-1">
                      <button className="w-11 h-11 rounded-full border border-line grid place-items-center" aria-label={`발음 듣기: ${w.word}`} onClick={() => say(w)}>🔊</button>
                      <button className={cx('w-11 h-11 rounded-full border grid place-items-center text-sm font-bold', w.memorizedOn ? 'bg-mint border-[#9ED7BF] text-ok' : 'border-line')} aria-pressed={!!w.memorizedOn}
                        aria-label={w.memorizedOn ? '암기 완료 취소' : '암기 완료 표시'} onClick={() => setMem(w.key, !w.memorizedOn)} data-testid="mw-memorize">✓</button>
                      <button className="w-11 h-11 rounded-full border border-line grid place-items-center text-ink-soft" aria-label={`삭제: ${w.word}`} onClick={() => setDel(w)} data-testid="mw-delete">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {list.length > limit && <Button variant="secondary" className="w-full mt-2" onClick={() => setLimit(limit + PAGE)} data-testid="mw-more">더 보기 ({list.length - limit}개 남음)</Button>}
        </>
      )}
      <Modal open={!!del} onClose={() => setDel(null)} label="단어 삭제 확인">
        <p className="font-bold text-lg text-center">‘{del?.word}’을(를) 단어장에서 지울까요?</p>
        <p className="text-sm text-ink-soft text-center mt-1">이 단어의 복습 기록도 함께 지워져요. 다른 학습 기록은 그대로예요.</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button variant="secondary" onClick={() => setDel(null)}>취소</Button>
          <Button variant="danger" onClick={() => { if (del) remove(del.key); setDel(null); }} data-testid="mw-delete-confirm">삭제</Button>
        </div>
      </Modal>
    </Page>
  );
}

export function MyWordReview() {
  const map = (useApp((s) => s.learning.myWords) ?? NO_WORDS);
  const complete = useApp((s) => s.completeMyWordReview);
  const nav = useNavigate();
  const d = today();
  const [mode] = useState<'due' | 'any'>(() => (reviewQueue(map, d, 10).length ? 'due' : 'any'));
  const [items] = useState<MyWord[]>(() => {
    const due = reviewQueue(map, d, 10);
    if (due.length) return due;
    // 오늘 복습할 단어가 없으면: 암기 완료가 아닌 단어 중 복습일이 가까운 순서로 (간격 계산은 SRS 가 같은 날 중복 상승을 막음)
    return Object.values(map).filter((w) => myWordStatus(w, d) !== 'memorized').sort((a, b) => a.srs.due.localeCompare(b.srs.due)).slice(0, 10);
  });
  const qs = useMemo(() => items.map((w) => myWordQuestion(w)), [items]);
  const [rs, setRs] = useState<QResult[] | null>(null);
  if (!items.length) return <Page title="단어장 복습" back="/mywords"><Empty icon="🎉" title="복습할 단어가 없어요" desc="모든 단어를 암기 완료했어요. 새 단어를 저장해 보세요." action={<Button onClick={() => nav('/mywords')}>단어장으로</Button>} /></Page>;
  return (
    <Page title="단어장 복습 퀴즈" back="/mywords">
      {!rs ? (
        <>
          <p className="text-sm text-ink-soft mb-2" data-testid="mw-review-mode">{mode === 'due' ? `오늘 복습할 단어 ${items.length}개` : `오늘 예정된 복습은 끝! 미암기 단어 ${items.length}개로 추가 연습해요`}</p>
          <QuizRunner questions={qs} title="단어장 복습" onDone={(x) => {
            complete(x.map((r) => ({ key: r.q.id.slice(3), correct: r.correct, given: r.given })));
            setRs(x);
          }} />
        </>
      ) : (
        <ResultView results={rs} title="단어장 복습 결과">
          <p className="text-xs text-ink-soft text-center mb-2">맞힌 단어는 다음 복습까지 간격이 늘고, 틀린 단어는 내일 다시 나와요.</p>
          <Button size="lg" onClick={() => nav('/mywords')}>단어장으로</Button>
        </ResultView>
      )}
    </Page>
  );
}
