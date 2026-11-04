import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { Button, Card, Page, SectionTitle, Tag } from '@/components/ui';
import { QuizRunner, ResultView, toAnswers, type QResult } from '@/components/Quiz';
import { CharacterImage } from '@/game/CharacterImage';
import { RARE_ID, SPECIAL_ID } from '@/content/characters';

export function ExamHall() {
  const l = useApp((s) => s.learning);
  const owned = useApp((s) => s.game.characters);
  return (
    <Page title="시험장" back="/home">
      <Card className="flex items-center gap-3">
        <CharacterImage id={SPECIAL_ID} silhouette={!owned[SPECIAL_ID]} size={64} />
        <div className="flex-1"><p className="font-bold">A1 레벨 평가</p><p className="text-xs text-ink-soft">10개 단원 종합 20문항 · 80% 이상 통과 시 특별 캐릭터</p>{l.a1Exam && <p className="text-xs mt-1">{l.a1Exam.passed ? <Tag tone="ok">통과</Tag> : <Tag>최근 {l.a1Exam.correct}/{l.a1Exam.total}</Tag>}</p>}</div>
        <Link to="/exam/a1"><Button size="sm" data-testid="go-a1-exam">응시</Button></Link>
      </Card>
      <SectionTitle right={<span className="flex items-center gap-1 text-xs text-ink-soft"><CharacterImage id={RARE_ID} silhouette={!owned[RARE_ID]} size={28} />첫 통과 시 희귀 캐릭터</span>}>단원 평가</SectionTitle>
      <div className="grid gap-2">
        {GRAMMAR_UNITS.map((u) => {
          const t = l.unitTests[u.id];
          return (
            <Link key={u.id} to={`/grammar/${u.id}/test`} className="rounded-2xl bg-white border border-line p-3 flex items-center gap-3 min-h-[56px]">
              <span className="font-bold w-6 text-accent">{u.order}</span><span className="flex-1">{u.title}</span>
              {t ? <Tag tone={t.passed ? 'ok' : 'gray'}>{t.passed ? '통과' : '미통과'} {t.correct}/{t.total}</Tag> : <Tag>미응시</Tag>}
            </Link>
          );
        })}
      </div>
      <SectionTitle>레벨 진단</SectionTitle>
      <Link to="/level-test"><Button variant="secondary" className="w-full">A1~B2 레벨 진단 다시 하기</Button></Link>
    </Page>
  );
}

export function A1Exam() {
  const nav = useNavigate();
  const complete = useApp((s) => s.completeA1Exam);
  const questions = useMemo(() => GRAMMAR_UNITS.flatMap((u) => [u.unitTest[1], u.unitTest[5]]), []);
  const [res, setRes] = useState<{ rs: QResult[]; passed: boolean } | null>(null);
  return (
    <Page title="A1 레벨 평가">
      {!res ? <QuizRunner questions={questions} title="A1 레벨 평가" onDone={(rs) => { const r = complete(toAnswers(rs, 'test')); setRes({ rs, passed: r.passed }); }} />
        : <ResultView results={res.rs} title="A1 레벨 평가 결과" passLabel={res.passed ? '통과 🎉' : '80% 이상이면 통과'}><Button size="lg" onClick={() => nav('/exam')}>시험장으로</Button></ResultView>}
    </Page>
  );
}
