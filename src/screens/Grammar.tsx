import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { CURRICULUM, GRAMMAR_BY_ID, GRAMMAR_UNITS } from '@/content/grammar';
import { READINGS } from '@/content/reading-leveltest';
import { AudioButton, Button, Card, Empty, Modal, Page, SectionTitle, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { PartnerBubble, usePartner } from '@/components/Partner';
import { unitDone } from '@/lib/curriculum';
import { cx } from '@/lib/cx';
import type { Example } from '@/domain/types';

const STATUS_LABEL: Record<string, string> = { drafting: '작성 중', 'auto-verified': '자동 검증 완료', 'expert-review-needed': '교육 전문가 검수 필요', 'expert-reviewed': '검수 완료', published: '공개 가능' };

export function GrammarHub() {
  const l = useApp((s) => s.learning);
  return (
    <Page title="도서관 · 문법" back="/home">
      <SectionTitle>A1 핵심 문법</SectionTitle>
      <div className="grid gap-2">
        {GRAMMAR_UNITS.map((u) => (
          <Link key={u.id} to={`/grammar/${u.id}`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[60px]" data-testid={`unit-${u.id}`}>
            <span className="w-9 h-9 rounded-xl bg-accent-soft text-accent-dark grid place-items-center font-bold">{u.order}</span>
            <span className="flex-1 min-w-0"><span className="block font-semibold">{u.title}</span><span className="text-xs text-ink-soft">{u.titleEn}</span></span>
            {unitDone(l, u.id) ? <Tag tone="ok">완료</Tag> : l.steps[`${u.id}:practice`] ? <Tag tone="accent">학습 중</Tag> : null}
          </Link>
        ))}
      </div>
      <SectionTitle>A1 독해</SectionTitle>
      <div className="grid gap-2">{READINGS.map((r) => <Link key={r.id} to={`/reading/${r.id}`} className="rounded-2xl bg-white border border-line p-3 min-h-[52px] flex items-center justify-between"><span className="font-semibold">📖 {r.title}</span>{l.readingsDone[r.id] && <Tag tone="ok">완료</Tag>}</Link>)}</div>
      {(['A2', 'B1', 'B2'] as const).map((lv) => (
        <div key={lv}>
          <SectionTitle>{lv} 과정</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {CURRICULUM.filter((c) => c.level === lv).map((c) => (
              <div key={c.id} className="rounded-2xl bg-white/60 border border-dashed border-line p-3 text-sm text-ink-faint" aria-disabled>
                {c.title}<span className="block text-[11px] mt-0.5">준비 중</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Page>
  );
}

function ExRow({ e }: { e: Example }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-1 min-w-0"><p className="font-medium">{e.en}</p><p className="text-sm text-ink-soft">{e.ko}</p></div>
      {e.audio && <AudioButton src={e.audio} text={e.en} size="sm" label="예문 듣기" />}
    </div>
  );
}

export function Lecture() {
  const { unitId = '' } = useParams();
  const [sp] = useSearchParams();
  const flow = sp.get('flow') ? '?flow=today' : '';
  const nav = useNavigate();
  const u = GRAMMAR_BY_ID[unitId];
  const view = useApp((s) => s.viewLecture);
  const partner = usePartner();
  const [mode, setMode] = useState<'easy' | 'detail'>('easy');
  const [more, setMore] = useState(false);
  const [help, setHelp] = useState<null | number>(null);
  if (!u) return <Page title="문법"><Empty title="단원을 찾을 수 없어요" /></Page>;
  return (
    <Page title={`${u.order}. ${u.title}`}>
      <div className="flex flex-wrap gap-1 mb-2"><Tag tone="accent">A1</Tag><Tag>{u.titleEn}</Tag><Tag tone="warn">{STATUS_LABEL[u.reviewStatus]}</Tag></div>
      <Card>
        <p className="font-bold">🎯 학습 목표</p>
        <ul className="mt-1 list-disc pl-5 text-sm space-y-0.5">{u.goal.map((g) => <li key={g}>{g}</li>)}</ul>
      </Card>

      <Card className="mt-3">
        <div className="flex gap-1 p-1 bg-mist rounded-2xl" role="tablist">
          {(['easy', 'detail'] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cx('flex-1 min-h-[44px] rounded-xl font-semibold text-sm', mode === m ? 'bg-white shadow-sm' : 'text-ink-soft')}>
              {m === 'easy' ? '쉽게 설명하기' : '자세히 설명하기'}
            </button>
          ))}
        </div>
        <p className="mt-3 leading-relaxed whitespace-pre-line text-[15px]">{mode === 'easy' ? u.easy : u.detail}</p>
        <div className="mt-3 grid gap-1">
          {u.terms.map((t) => <p key={t.term} className="text-sm"><b>{t.term}</b> <span className="text-ink-soft">= {t.plain}</span></p>)}
        </div>
      </Card>

      <SectionTitle>문장 구조 분석</SectionTitle>
      <div className="grid gap-2">
        {u.structure.map((st) => (
          <Card key={st.pattern} className="!p-3">
            <p className="text-sm font-bold text-accent-dark">{st.pattern}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {st.parts.map((p, k) => (
                <span key={k} className="rounded-xl bg-mist px-2 py-1 text-center"><span className="block text-[10px] text-ink-soft">{p.label}</span><span className="font-semibold">{p.text}</span></span>
              ))}
            </div>
            {st.note && <p className="text-xs text-ink-soft mt-2">{st.note}</p>}
          </Card>
        ))}
      </div>

      <SectionTitle right={<button className="text-sm text-accent font-semibold min-h-[44px]" onClick={() => setMore(!more)}>{more ? '접기' : '예문 더 보기'}</button>}>실생활 예문</SectionTitle>
      <Card className="!py-1 divide-y divide-line">{[...u.examples, ...(more ? u.moreExamples : [])].map((e) => <ExRow key={e.en} e={e} />)}</Card>

      <SectionTitle>비슷한 문법 비교 · {u.compare.title}</SectionTitle>
      <Card><p className="text-sm leading-relaxed">{u.compare.body}</p><div className="mt-2 divide-y divide-line">{u.compare.examples.map((e) => <ExRow key={e.en} e={e} />)}</div></Card>

      <SectionTitle>자주 하는 실수</SectionTitle>
      <div className="grid gap-2">
        {u.mistakes.map((m) => (
          <Card key={m.wrong} className="!p-3">
            <p className="text-sm"><span className="text-bad line-through">{m.wrong}</span> → <span className="text-ok font-semibold">{m.right}</span></p>
            <p className="text-xs text-ink-soft mt-1">{m.why}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-5">
        <Button variant="secondary" onClick={() => setHelp(0)} data-testid="help-btn">이해가 안 돼요</Button>
        <Button variant="secondary" onClick={() => setHelp(1)}>{partner ? `${partner.ch.name}에게 물어보기` : '파트너에게 물어보기'}</Button>
      </div>
      <div className="mt-3">
        <Button size="lg" data-testid="lecture-done" onClick={() => { view(u.id); nav(`/grammar/${u.id}/practice${flow}`); }}>강의 다 봤어요 · 확인 문제 풀기</Button>
      </div>

      <Modal open={help !== null} onClose={() => setHelp(null)} label="추가 설명">
        <p className="font-bold text-lg">{help === 0 ? '조금 더 쉽게 볼까요?' : '파트너의 도움말'}</p>
        <div className="mt-3"><PartnerBubble state="hint" text={u.helpTips[(help ?? 0) % u.helpTips.length]} /></div>
        <ul className="mt-4 grid gap-2 text-sm">{u.helpTips.map((t) => <li key={t} className="rounded-xl bg-mist p-3">💡 {t}</li>)}</ul>
        <p className="font-semibold mt-4 text-sm">추가 예문</p>
        <div className="divide-y divide-line">{u.moreExamples.map((e) => <ExRow key={e.en} e={e} />)}</div>
        <p className="text-[11px] text-ink-faint mt-3">검수 대기 중인 사전 작성 설명입니다. (AI 실시간 답변 기능 아님)</p>
        <Button className="mt-4 w-full" onClick={() => setHelp(null)}>닫기</Button>
      </Modal>
    </Page>
  );
}

function useFlow() {
  const [sp] = useSearchParams();
  return !!sp.get('flow');
}

export function GrammarPractice() {
  const { unitId = '' } = useParams();
  const flow = useFlow();
  const nav = useNavigate();
  const u = GRAMMAR_BY_ID[unitId];
  const viewed = useApp((s) => !!s.learning.lectureViewed[unitId]);
  const complete = useApp((s) => s.completePractice);
  const [results, setResults] = useState<QResult[] | null>(null);
  if (!u) return <Page title="연습"><Empty title="단원을 찾을 수 없어요" /></Page>;
  return (
    <Page title={`${u.title} · 확인 문제`}>
      {!viewed && !results && (
        <Card className="mb-3 bg-butter border-[#F2D98A]"><p className="text-sm">강의를 먼저 보면 학습 완료로 인정돼요. 문제만 풀면 연습 기록으로만 저장됩니다.</p><Link to={`/grammar/${u.id}${flow ? '?flow=today' : ''}`} className="text-sm underline font-semibold">강의 보러 가기</Link></Card>
      )}
      {!results ? (
        <QuizRunner questions={u.practice} title="확인 문제" onDone={(rs) => { complete(u.id, toAnswers(rs, flow ? 'lesson' : 'free')); setResults(rs); }} />
      ) : (
        <ResultView results={results} title="확인 문제 결과">
          <Button size="lg" onClick={() => nav(flow ? '/today' : `/grammar/${u.id}/writing`)}>{flow ? '다음 단계로' : '영작 연습'}</Button>
          <Button variant="secondary" onClick={() => setResults(null)}>다시 풀기</Button>
        </ResultView>
      )}
    </Page>
  );
}

export function GrammarWriting() {
  const { unitId = '' } = useParams();
  const flow = useFlow();
  const nav = useNavigate();
  const u = GRAMMAR_BY_ID[unitId];
  const complete = useApp((s) => s.completeWriting);
  const [results, setResults] = useState<QResult[] | null>(null);
  if (!u) return <Page title="영작"><Empty title="단원을 찾을 수 없어요" /></Page>;
  return (
    <Page title={`${u.title} · 기초 영작`}>
      {!results ? (
        <>
          <p className="text-xs text-ink-soft mb-2">대소문자·마침표·축약형(I'm = I am)은 자동으로 같게 처리돼요. 인정 정답 목록 외의 표현은 오답으로 나올 수 있어요.</p>
          <QuizRunner questions={u.writing} title="영작" onDone={(rs) => { complete(u.id, toAnswers(rs, flow ? 'lesson' : 'free')); setResults(rs); }} />
        </>
      ) : (
        <ResultView results={results} title="영작 결과">
          <Button size="lg" onClick={() => nav(flow ? '/today' : `/grammar/${u.id}/test`)}>{flow ? '다음 단계로' : '단원 평가 보기'}</Button>
        </ResultView>
      )}
    </Page>
  );
}

export function UnitTest() {
  const { unitId = '' } = useParams();
  const flow = useFlow();
  const nav = useNavigate();
  const u = GRAMMAR_BY_ID[unitId];
  const complete = useApp((s) => s.completeUnitTest);
  const [res, setRes] = useState<{ rs: QResult[]; passed: boolean } | null>(null);
  if (!u) return <Page title="평가"><Empty title="단원을 찾을 수 없어요" /></Page>;
  return (
    <Page title={`${u.title} · 단원 평가`}>
      {!res ? (
        <>
          <Card className="mb-3"><p className="text-sm">통과 기준: 정답률 70% 이상. 첫 단원 평가 통과 시 희귀 캐릭터를 만날 수 있어요.</p></Card>
          <QuizRunner questions={u.unitTest} title="단원 평가" onDone={(rs) => { const r = complete(u.id, toAnswers(rs, 'test')); setRes({ rs, passed: r.passed }); }} />
        </>
      ) : (
        <ResultView results={res.rs} title="단원 평가 결과" passLabel={res.passed ? '통과 🎉' : '아쉽게 미통과'}>
          {res.passed ? <Button size="lg" onClick={() => nav(flow ? '/today' : '/grammar')}>{flow ? '오늘의 학습으로' : '도서관으로'}</Button>
            : <><Button size="lg" onClick={() => nav(`/grammar/${u.id}`)}>강의 다시 보기</Button><Button variant="secondary" onClick={() => setRes(null)}>다시 도전</Button></>}
        </ResultView>
      )}
    </Page>
  );
}
