import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { Button, Card, Empty, Page, Progress, SectionTitle, Tag } from '@/components/ui';
import { WordStudy } from '@/components/WordStudyCard';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { BANDS, BAND_BY_ID, bankToVocab, useBand, useMeta, type Band, type BankWord } from '@/lib/wordbank';
import { bankQuestion } from '@/lib/libraryQuiz';
import { posName } from '@/lib/lexicon';
import { cx } from '@/lib/cx';

export const CH = 10;
const PAGE = 40;

/** 단어 숲 홈에 넣는 '영단어 사전' 카드 */
export function BankSection() {
  const meta = useMeta();
  const learned = useApp((s) => s.learning.learnedWords);
  const learnedBank = Object.keys(learned).filter((k) => k.startsWith('wb-')).length;
  return (
    <section data-testid="bank-section">
      <h2 className="font-bold mt-5 mb-2 flex items-center justify-between">영단어 사전 <span className="text-xs font-normal text-ink-soft">{meta ? `${meta.total.toLocaleString()}단어 · 학습 ${learnedBank}` : '불러오는 중…'}</span></h2>
      <div className="grid grid-cols-3 gap-2">
        {BANDS.map((b) => (
          <Link key={b.id} to={`/words/bank/${b.id}`} className={cx('rounded-2xl border border-line p-3 min-h-[92px]', b.tint)} data-testid={`bank-${b.id}`}>
            <p className="font-extrabold">{b.label}</p>
            <p className="text-[11px] text-ink-soft">{b.levels.join('·')}</p>
            <p className="text-sm font-bold mt-1" data-testid={`bank-count-${b.id}`}>{meta ? `${meta.byBand[b.id].toLocaleString()}개` : '…'}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function BankBand() {
  const { band = 'beginner' } = useParams();
  const b = BAND_BY_ID[band as Band];
  const { rows, error } = useBand(b ? b.id : null);
  const [sp, setSp] = useSearchParams();
  const lv = sp.get('lv') ?? b?.levels[0] ?? 'A1';
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const learned = useApp((s) => s.learning.learnedWords);
  const meta = useMeta();
  const inLv = useMemo(() => (rows ?? []).filter((w) => w.lv === lv), [rows, lv]);
  const chapters = useMemo(() => Array.from({ length: Math.ceil(inLv.length / CH) }, (_, i) => inLv.slice(i * CH, i * CH + CH)), [inLv]);
  const found = useMemo(() => { const k = q.trim().toLowerCase(); if (!k) return null; return (rows ?? []).filter((w) => w.w.toLowerCase().includes(k) || w.m.includes(k)); }, [rows, q]);
  if (!b) return <Page title="영단어 사전"><Empty title="없는 난이도예요" /></Page>;
  const done = inLv.filter((w) => learned[w.id]).length;
  return (
    <Page title={`영단어 사전 · ${b.label}`} back="/words">
      <div className="flex gap-1.5" role="tablist" aria-label="레벨">
        {b.levels.map((l) => (
          <button key={l} role="tab" aria-selected={lv === l} onClick={() => { setSp({ lv: l }, { replace: true }); setLimit(PAGE); }} data-testid={`bank-lv-${l}`}
            className={cx('rounded-full px-4 min-h-[40px] text-sm font-bold border', lv === l ? 'bg-ink text-white border-ink' : 'bg-white border-line')}>
            {l} {rows ? rows.filter((w) => w.lv === l).length : ''}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-bad">단어를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.</p>}
      {!rows && !error && <p className="mt-3 text-sm text-ink-soft" role="status">단어를 불러오는 중…</p>}
      {rows && (
        <>
          <Card className="mt-3" data-testid="bank-progress">
            <div className="flex items-end justify-between"><p className="text-sm text-ink-soft">{lv} 학습 진도</p><p className="font-extrabold">{done} / {inLv.length}</p></div>
            <div className="mt-2"><Progress value={done} max={Math.max(1, inLv.length)} label={`${lv} 진도`} /></div>
            {meta && meta.listTotal[lv] > inLv.length && <p className="text-[11px] text-ink-faint mt-2">{lv} 목록 {meta.listTotal[lv].toLocaleString()}단어 중 뜻·예문 작성을 마친 {inLv.length.toLocaleString()}단어를 공개했어요. 나머지는 작성되는 대로 추가돼요.</p>}
          </Card>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${b.label} 단어·뜻 검색`} aria-label="단어 검색" data-testid="bank-search"
            className="mt-3 w-full rounded-2xl border border-line bg-white px-4 min-h-[48px]" />
          {found ? (
            <div className="grid gap-2 mt-2" data-testid="bank-found">{found.slice(0, 60).map((w) => <BankRow key={w.id} w={w} />)}{found.length === 0 && <p className="text-sm text-ink-soft">찾는 단어가 없어요.</p>}</div>
          ) : (
            <>
              <SectionTitle>챕터 ({CH}단어씩)</SectionTitle>
              <div className="grid grid-cols-4 gap-1.5" data-testid="bank-chapters">
                {chapters.map((c, i) => {
                  const n = c.filter((w) => learned[w.id]).length;
                  return (
                    <Link key={i} to={`/words/bank/${b.id}/${lv}/${i + 1}`} data-testid={`bank-ch-${i + 1}`}
                      className={cx('rounded-xl border min-h-[52px] grid place-items-center text-sm font-bold', n === c.length ? 'bg-mint border-[#9ED7BF]' : n ? 'bg-butter border-[#F2D98A]' : 'bg-white border-line')}>
                      <span>{i + 1}<span className="block text-[10px] font-normal text-ink-soft">{n}/{c.length}</span></span>
                    </Link>
                  );
                })}
              </div>
              <SectionTitle>단어 목록</SectionTitle>
              <div className="grid gap-2" data-testid="bank-list">{inLv.slice(0, limit).map((w) => <BankRow key={w.id} w={w} />)}</div>
              {inLv.length > limit && <Button variant="secondary" className="w-full mt-2" onClick={() => setLimit(limit + PAGE)} data-testid="bank-more">더 보기 ({inLv.length - limit}개 남음)</Button>}
            </>
          )}
          <p className="text-[11px] text-ink-faint mt-4 leading-relaxed">단어 목록·레벨: CEFR-J Wordlist 1.5 (Tono Lab, TUFS) · Octanove Vocabulary Profile C1/C2 (CC BY-SA 4.0). 뜻·예문: 앱 작성(검수 필요) · 발음기호: CMU 사전 기반 · 한글 발음은 참고용 자동 표기.</p>
        </>
      )}
    </Page>
  );
}

function BankRow({ w }: { w: BankWord }) {
  const learned = useApp((s) => !!s.learning.learnedWords[w.id]);
  const [open, setOpen] = useState(false);
  return (
    <button className="rounded-2xl bg-white border border-line p-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="bank-row" data-id={w.id}>
      <span className="flex items-center gap-2"><b className="text-lg break-words">{w.w}</b><span className="text-xs text-ink-soft">{posName(w.pos.join('·'))}</span>{learned && <Tag tone="ok">학습함</Tag>}<span className="ml-auto"><Tag tone="accent">{w.lv}</Tag></span></span>
      <span className="block text-sm mt-0.5">{w.m}</span>
      {open && (
        <span className="block mt-2 text-sm">
          <span className="block text-ink-soft">{w.ipa}{w.ko && ` · [${w.ko}]`}</span>
          <span className="block mt-1 font-medium">{w.ex}</span><span className="block text-ink-soft">{w.exKo}</span>
        </span>
      )}
    </button>
  );
}

export function BankChapter() {
  const { band = 'beginner', lv = 'A1', ch = '1' } = useParams();
  const b = BAND_BY_ID[band as Band];
  const { rows } = useBand(b ? b.id : null);
  const nav = useNavigate();
  const complete = useApp((s) => s.completeBankSet);
  const n = Number(ch);
  const words = useMemo(() => (rows ?? []).filter((w) => w.lv === lv).slice((n - 1) * CH, n * CH), [rows, lv, n]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'study' | 'quiz' | 'result'>('study');
  const [rs, setRs] = useState<QResult[]>([]);
  const qs = useMemo(() => words.map((w) => bankQuestion(w)), [words]);
  if (!b) return <Page title="영단어"><Empty title="없는 난이도예요" /></Page>;
  if (!rows) return <Page title="영단어"><p className="text-sm text-ink-soft" role="status">단어를 불러오는 중…</p></Page>;
  if (!words.length) return <Page title="영단어"><Empty title="챕터를 찾을 수 없어요" /></Page>;
  const title = `${b.label} ${lv} · ${n}챕터`;
  const v = bankToVocab(words[i]);
  return (
    <Page title={title} back={`/words/bank/${b.id}?lv=${lv}`}>
      {phase === 'study' && (
        <>
          <div className="flex items-center gap-3 mb-3"><span className="text-sm font-semibold text-ink-soft" data-testid="bank-pos">{i + 1} / {words.length}</span><Progress value={i + 1} max={words.length} label="챕터 진행" /></div>
          <WordStudy key={v.id} v={v} index={i} total={words.length} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>‹ 이전</Button>
            {i < words.length - 1 ? <Button onClick={() => setI(i + 1)} data-testid="bank-next">다음 ›</Button>
              : <Button onClick={() => setPhase('quiz')} data-testid="bank-quiz">확인 문제</Button>}
          </div>
        </>
      )}
      {phase === 'quiz' && <QuizRunner questions={qs} title="뜻 확인" onDone={(x) => { complete(`bank:${lv}:${n}`, title, words.map((w) => w.id), toAnswers(x, 'lesson')); setRs(x); setPhase('result'); }} />}
      {phase === 'result' && (
        <ResultView results={rs} title={`${title} 결과`}>
          <p className="text-xs text-ink-soft text-center mb-2">학습한 단어는 나만의 단어장 복습(1·3·7·14·30일)에 자동으로 들어가요.</p>
          <div className="grid gap-2">
            {(rows.filter((w) => w.lv === lv).length > n * CH) && <Button size="lg" onClick={() => { setI(0); setPhase('study'); nav(`/words/bank/${b.id}/${lv}/${n + 1}`); }} data-testid="bank-next-ch">다음 챕터</Button>}
            <Button variant="secondary" onClick={() => nav(`/words/bank/${b.id}?lv=${lv}`)}>챕터 목록</Button>
          </div>
        </ResultView>
      )}
    </Page>
  );
}
