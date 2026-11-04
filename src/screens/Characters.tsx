import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp, today, discoveryInfo, studiedConceptsOn } from '@/store/app';
import { CHARACTERS, CHARACTER_BY_ID } from '@/content/characters';
import { conceptLabel } from '@/content/grammar';
import { computeMastery } from '@/domain/learning/mastery';
import { growthCheck, LV2_XP, LV2_MIN_REVIEW_DAYS, LV2_MIN_ACCURACY, DISCOVERY_PASS, DISCOVERY_MILESTONES } from '@/domain/game/state';
import { EVOLUTION_REWARD, FURNITURE_BY_ID } from '@/content/furniture';
import { discoveryQuestions } from '@/lib/questions';
import { CharacterImage } from '@/game/CharacterImage';
import { Button, Card, Empty, Page, Progress, SectionTitle, Tag } from '@/components/ui';
import { QuizRunner, toAnswers } from '@/components/Quiz';
import { PartnerBubble } from '@/components/Partner';
import { cx } from '@/lib/cx';

const RARITY: Record<string, { label: string; tone: 'gray' | 'lilac' | 'warn' }> = { common: { label: '일반', tone: 'gray' }, rare: { label: '희귀', tone: 'lilac' }, special: { label: '특별', tone: 'warn' } };

export function Discover() {
  const nav = useNavigate();
  const s = useApp();
  const info = discoveryInfo(s);
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'done'>('intro');
  const [outcome, setOutcome] = useState<{ success: boolean; correct: number; id: string } | null>(null);
  const d = today();
  const questions = useMemo(() => {
    const todayWords = Object.entries(s.learning.learnedWords).filter(([, date]) => date === d).map(([id]) => id);
    const words = todayWords.length ? todayWords : Object.keys(s.learning.learnedWords).slice(-20);
    const concepts = studiedConceptsOn(s.learning, d).filter((c) => c.startsWith('a1-u'));
    const fallback = [...new Set(Object.values(s.learning.log).map((e) => e.refId).filter((x) => x.startsWith('a1-u')))];
    return discoveryQuestions(concepts.length ? concepts : fallback, words, d.length * 7 + words.length);
    // 발견 퀴즈 문제는 진입 시점 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'done' && outcome) {
    const ch = CHARACTER_BY_ID[outcome.id];
    return (
      <Page title="캐릭터 발견 결과" back="/home">
        <Card className="text-center" data-testid="discover-result">
          <div className="grid place-items-center"><CharacterImage id={ch.id} silhouette={!outcome.success} state={outcome.success ? 'greeting' : 'idle'} size={150} /></div>
          <p className="text-sm text-ink-soft">{outcome.correct} / 3 정답</p>
          {outcome.success ? (
            <><p className="text-2xl font-extrabold mt-1">{ch.name}을(를) 만났어요!</p><p className="text-sm text-ink-soft">{ch.species} · 도감에 등록됐어요</p></>
          ) : (
            <><p className="text-xl font-bold mt-1">수줍은 친구가 숨어 버렸어요</p><p className="text-sm text-ink-soft mt-1">{DISCOVERY_PASS}문제 이상 맞히면 만날 수 있어요. 학습을 하나 더 완료한 뒤 다시 도전해 보세요.</p></>
          )}
        </Card>
        <div className="mt-4 grid gap-2">
          {outcome.success ? <Button size="lg" onClick={() => nav('/home')}>마을로 돌아가기</Button> : <Button size="lg" onClick={() => nav('/today')}>재학습하러 가기</Button>}
          <Button variant="secondary" onClick={() => nav('/collection')}>도감 보기</Button>
        </div>
      </Page>
    );
  }
  if (!info.ok) {
    const nextM = DISCOVERY_MILESTONES.find((m) => !s.game.characters[m.characterId]);
    const msg = info.reason === 'all-collected' ? '일반 캐릭터를 모두 만났어요! 희귀·특별 캐릭터는 시험장에서 만날 수 있어요.' : info.reason === 'restudy' ? '학습을 하나 더 완료하면 다시 도전할 수 있어요.' : `학습 목표를 달성하면 발견 이벤트가 열려요. 다음 조건: ${nextM?.label ?? '-'}`;
    return <Page title="캐릭터 발견" back="/home"><Empty icon="🔍" title="지금은 발견할 수 없어요" desc={msg} action={<Link to="/today"><Button>오늘의 학습</Button></Link>} /></Page>;
  }
  if (phase === 'intro') {
    return (
      <Page title="캐릭터 발견" back="/home">
        <Card className="text-center">
          <div className="grid place-items-center"><CharacterImage id={info.characterId} silhouette size={150} /></div>
          <p className="text-xl font-bold">숲속에 누군가 있어요…</p>
          <p className="text-sm text-ink-soft mt-1">오늘 배운 내용으로 퀴즈 3문제! {DISCOVERY_PASS}문제 이상 맞히면 친구가 돼요.</p>
        </Card>
        <div className="mt-4"><Button size="lg" onClick={() => setPhase('quiz')} disabled={questions.length < 3} data-testid="start-discover">퀴즈 시작</Button></div>
      </Page>
    );
  }
  return (
    <Page title="발견 퀴즈">
      <QuizRunner questions={questions} title="발견 퀴즈" onDone={(rs) => {
        const correct = rs.filter((r) => r.correct).length;
        const r = s.resolveDiscoveryQuiz(info.characterId, correct, toAnswers(rs, 'discovery'));
        setOutcome({ success: r.success, correct, id: info.characterId });
        setPhase('done');
      }} />
    </Page>
  );
}

export function Collection() {
  const owned = useApp((s) => s.game.characters);
  const partnerId = useApp((s) => s.game.partnerId);
  const n = Object.keys(owned).length;
  return (
    <Page title="캐릭터 도감" back="/home">
      <Card className="flex items-center justify-between"><p className="font-bold">수집 {n} / {CHARACTERS.length}</p><Progress value={n} max={CHARACTERS.length} label="도감 수집률" /></Card>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3" data-testid="collection">
        {CHARACTERS.map((c) => {
          const uc = owned[c.id];
          return (
            <Link key={c.id} to={`/collection/${c.id}`} data-testid={`col-${c.id}`} data-owned={!!uc}
              className={cx('rounded-2xl border p-3 text-center bg-white', uc ? 'border-line' : 'border-dashed border-line bg-white/60')}>
              <div className="grid place-items-center"><CharacterImage id={c.id} level={uc?.level ?? 1} silhouette={!uc} size={88} state={uc ? 'idle' : 'idle'} /></div>
              <p className="font-bold text-sm mt-1">{uc ? c.name : '???'} {uc && <span className="text-accent text-xs">Lv.{uc.level}</span>}</p>
              <div className="flex justify-center gap-1 mt-1 flex-wrap"><Tag tone={RARITY[c.rarity].tone}>{RARITY[c.rarity].label}</Tag>{partnerId === c.id && <Tag tone="accent">파트너</Tag>}</div>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}

function GrowthPanel({ id }: { id: string }) {
  const uc = useApp((s) => s.game.characters[id]);
  const answers = useApp((s) => s.learning.answers);
  const ch = CHARACTER_BY_ID[id];
  const m = useMemo(() => computeMastery(answers)[ch.conceptId], [answers, ch.conceptId]);
  const g = growthCheck(uc, m);
  if (!uc) return null;
  if (uc.level === 2) return <Card><p className="font-bold">🌟 Lv.2 성장 완료</p><p className="text-sm text-ink-soft">{uc.leveledUpOn}에 성장했어요.</p></Card>;
  const row = (ok: boolean, label: string, val: string) => (
    <li className="flex items-center gap-2 text-sm"><span className={ok ? 'text-ok' : 'text-ink-faint'}>{ok ? '✅' : '⬜'}</span><span className="flex-1">{label}</span><span className="text-ink-soft">{val}</span></li>
  );
  return (
    <Card data-testid="growth-panel">
      <p className="font-bold">Lv.2 성장 조건</p>
      <ul className="mt-2 grid gap-1.5">
        {row(g.xpOk, `성장 경험치 ${LV2_XP} 이상`, `${g.xp}/${LV2_XP}`)}
        {row(g.reviewDaysOk, `"${ch.conceptLabel}" 서로 다른 날 ${LV2_MIN_REVIEW_DAYS}일 이상 복습`, `${g.reviewDays}일`)}
        {row(g.accuracyOk, `"${ch.conceptLabel}" 최근 정답률 ${LV2_MIN_ACCURACY * 100}% 이상`, g.accuracy === null ? '-' : `${Math.round(g.accuracy * 100)}%`)}
      </ul>
      <p className="text-xs text-ink-faint mt-2">같은 문제를 반복해서는 성장하지 않아요. 경험치는 대표 파트너일 때 신규 학습·복습(하루 1회)·단원 평가·듣기·말하기·주간 퀘스트로 얻어요.</p>
      <p className="text-xs mt-1">🎁 진화 보상: {FURNITURE_BY_ID[EVOLUTION_REWARD[id]].name}</p>
    </Card>
  );
}

export function CharacterDetail() {
  const { id = '' } = useParams();
  const ch = CHARACTER_BY_ID[id];
  const uc = useApp((s) => s.game.characters[id]);
  const partnerId = useApp((s) => s.game.partnerId);
  const setPartner = useApp((s) => s.setPartner);
  const [msg, setMsg] = useState<string | null>(null);
  if (!ch) return <Page title="도감"><Empty title="캐릭터를 찾을 수 없어요" /></Page>;
  return (
    <Page title={uc ? ch.name : '미발견 캐릭터'}>
      <Card className="text-center">
        <div className="grid place-items-center"><CharacterImage id={id} level={uc?.level ?? 1} silhouette={!uc} size={170} state={uc ? 'greeting' : 'idle'} /></div>
        <p className="text-2xl font-extrabold">{uc ? ch.name : '???'} {uc && <span className="text-accent">Lv.{uc.level}</span>}</p>
        <div className="flex justify-center gap-1 mt-1"><Tag tone={RARITY[ch.rarity].tone}>{RARITY[ch.rarity].label}</Tag><Tag>{ch.conceptLabel}</Tag></div>
      </Card>
      <Card className="mt-3 grid gap-2 text-sm">
        <p><b>획득 조건</b> · {ch.acquireRule}</p>
        <p><b>관련 학습 개념</b> · {conceptLabel(ch.conceptId)}</p>
        {uc ? (<><p><b>종류</b> · {ch.species}</p><p><b>외형</b> · {ch.look}</p><p><b>성격</b> · {ch.personality}</p><p><b>획득일</b> · {uc.acquiredOn}</p><p><b>경험치</b> · {uc.xp} XP</p></>)
          : <p className="text-ink-soft">아직 만나지 못한 친구예요.</p>}
      </Card>
      {uc && (
        <>
          {uc.level === 2 && (
            <>
              <SectionTitle>성장 전후</SectionTitle>
              <Card className="flex items-center justify-around"><div className="text-center"><CharacterImage id={id} level={1} size={90} /><p className="text-xs">Lv.1</p></div><span className="text-2xl">→</span><div className="text-center"><CharacterImage id={id} level={2} size={90} /><p className="text-xs">Lv.2</p></div></Card>
            </>
          )}
          <div className="mt-3"><GrowthPanel id={id} /></div>
          <div className="mt-4 grid gap-2">
            {partnerId === id ? <Button disabled size="lg">현재 대표 파트너</Button> : <Button size="lg" data-testid="set-partner" onClick={() => setMsg(setPartner(id) ? `${ch.name}이(가) 대표 파트너가 됐어요!` : '보유한 캐릭터만 지정할 수 있어요.')}>대표 파트너로 지정</Button>}
            <Link to={`/growth/${id}`}><Button variant="secondary" className="w-full">성장 화면</Button></Link>
          </div>
          {msg && <p className="text-sm text-center mt-2 text-ok" role="status">{msg}</p>}
        </>
      )}
    </Page>
  );
}

export function PartnerScreen() {
  const owned = useApp((s) => s.game.characters);
  const partnerId = useApp((s) => s.game.partnerId);
  const setPartner = useApp((s) => s.setPartner);
  const list = CHARACTERS.filter((c) => owned[c.id]);
  return (
    <Page title="나의 집 · 대표 파트너" back="/home">
      <PartnerBubble state="greeting" />
      {list.length === 0 ? (
        <Empty icon="🏡" title="아직 함께 사는 친구가 없어요" desc="학습을 완료하고 발견 퀴즈를 통과하면 첫 친구가 자동으로 대표 파트너가 돼요." action={<Link to="/today"><Button>오늘의 학습</Button></Link>} />
      ) : (
        <>
          <SectionTitle>대표 파트너 변경</SectionTitle>
          <div className="grid gap-2" role="radiogroup" aria-label="대표 파트너">
            {list.map((c) => {
              const uc = owned[c.id];
              const on = partnerId === c.id;
              return (
                <button key={c.id} role="radio" aria-checked={on} onClick={() => setPartner(c.id)} data-testid={`partner-${c.id}`}
                  className={cx('flex items-center gap-3 rounded-2xl border-2 p-3 bg-white text-left min-h-[72px]', on ? 'border-accent' : 'border-line')}>
                  <CharacterImage id={c.id} level={uc.level} size={56} />
                  <span className="flex-1"><span className="font-bold block">{c.name} <span className="text-accent text-sm">Lv.{uc.level}</span></span><span className="text-xs text-ink-soft">{c.conceptLabel} · {uc.xp} XP</span></span>
                  {on && <Tag tone="accent">파트너</Tag>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ink-faint mt-2">파트너를 바꿔도 각 캐릭터의 성장 기록은 그대로 유지돼요.</p>
          {partnerId && <div className="mt-3"><GrowthPanel id={partnerId} /></div>}
        </>
      )}
    </Page>
  );
}

export function Growth() {
  const { id = '' } = useParams();
  const ch = CHARACTER_BY_ID[id];
  const uc = useApp((s) => s.game.characters[id]);
  if (!ch || !uc) return <Page title="성장"><Empty title="보유하지 않은 캐릭터예요" /></Page>;
  return (
    <Page title={`${ch.name} 성장`}>
      <Card className="text-center">
        <div className={cx('mx-auto w-fit rounded-full p-4', uc.level === 2 ? 'bg-butter glow' : 'bg-mint')}><CharacterImage id={id} level={uc.level} state={uc.level === 2 ? 'levelup' : 'idle'} size={160} /></div>
        <p className="text-xl font-extrabold mt-2">Lv.{uc.level}</p>
        <p className="text-sm text-ink-soft">{uc.level === 2 ? ch.lines.levelup?.[0] : '복습을 꾸준히 하면 성장해요.'}</p>
      </Card>
      <div className="mt-3"><GrowthPanel id={id} /></div>
    </Page>
  );
}
