import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Vocabulary } from '@/domain/types';
import { GRAMMAR_BY_ID } from '@/content/grammar';
import { useApp } from '@/store/app';
import { AudioButton, Tag } from '@/components/ui';
import { CharacterImage, GuideImage } from '@/game/CharacterImage';
import { CHARACTER_BY_ID } from '@/content/characters';
import { LEVEL_LABEL, wordLevel } from '@/lib/wordbook';
import { cx } from '@/lib/cx';

const POS_NAME: Record<string, string> = { 명: '명사', 동: '동사', 형: '형용사', 부: '부사', 대: '대명사', 전: '전치사', 접: '접속사', 조: '조동사', 감: '감탄사' };

/** 3인칭 단수 현재형 (He/She 뒤) */
function third(w: string): string {
  if (w === 'have') return 'has';
  if (w === 'do' || w === 'go') return `${w}es`;
  if (w.includes(' ')) { const [h, ...r] = w.split(' '); return [third(h), ...r].join(' '); }
  if (/(s|sh|ch|x|o)$/.test(w)) return `${w}es`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
}

/** 짧은 단어 설명 (하단 카드) */
export function shortNote(v: Vocabulary) {
  if (v.pattern) return `${POS_NAME[v.pos] ?? v.pos} · 패턴: ${v.pattern}`;
  const g = GRAMMAR_BY_ID[v.grammarId];
  return `${POS_NAME[v.pos] ?? v.pos}${g ? ` · 관련 문법: ${g.title}` : ''}`;
}

/** 모시의 짧은 팁 (1~2문장). 길어지는 설명은 '더 알아보기'(관련 문법 강의)로 분리 */
export function wordTip(v: Vocabulary): string {
  const w = v.word;
  switch (v.pos) {
    case '명': return `"a ${w}"처럼 하나일 땐 a/an, 정해진 것엔 the를 붙여요.`;
    case '동': return w === 'be' ? 'am/is/are 로 모양이 바뀌어요.' : `I ${w} → He ${third(w)} 처럼 He/She 뒤에선 모양이 바뀌어요.`;
    case '형': return `"I'm ${w}."처럼 be동사 뒤에 오거나 명사 앞에서 꾸며 줘요.`;
    case '부': return '동사나 문장을 꾸며서 언제·얼마나·어떻게를 알려 줘요.';
    case '대': return '앞에서 말한 사람·것을 대신하거나 질문을 만들 때 써요.';
    case '전': return `"${w} the park"처럼 명사 앞에 붙어 장소·시간을 알려 줘요.`;
    case '접': return '두 문장이나 단어를 이어 줘요.';
    case '조': return `"I ${w} swim."처럼 뒤에 동사원형이 와요.`;
    default: return '예문을 소리 내어 두 번 따라 읽어 봐요.';
  }
}

/** 상단: 영어 단어 카드 (항상 앞면, 뒤집히지 않음) */
export function WordTopCard({ v }: { v: Vocabulary }) {
  const saved = useApp((s) => (s.learning.savedWords ?? []).includes(v.id));
  const toggle = useApp((s) => s.toggleSaveWord);
  const lv = LEVEL_LABEL[wordLevel(v)];
  return (
    <section className="rounded-card bg-white border border-line p-4" data-testid="word-card" aria-label="영어 단어">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag>{POS_NAME[v.pos] ?? v.pos}</Tag>
            <Tag tone="accent">{lv.label} · {lv.cefr}</Tag>
          </div>
          <p className="text-[34px] leading-tight font-extrabold break-words mt-1" data-testid="word-en">{v.word}</p>
          <p className="text-ink-soft text-sm mt-0.5">{v.ipa}{v.ipa && ' · '}<span aria-label="한글 발음 참고">[{v.koPron}]</span></p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <AudioButton src={v.audio} text={v.word} label="단어 발음 듣기" />
          <button type="button" onClick={() => toggle(v.id)} aria-pressed={saved} aria-label={saved ? '단어 저장 취소' : '단어 저장'} data-testid="save-word"
            className={cx('w-11 h-11 grid place-items-center rounded-full text-xl', saved ? 'text-accent' : 'text-ink-faint')}>{saved ? '★' : '☆'}</button>
        </div>
      </div>
    </section>
  );
}

/** 하단: 한국어 해석 카드 (처음엔 뒷면 → 터치하면 뒤집혀 공개, 다시 누르면 숨김) */
export function WordMeaningCard({ v, open, onToggle }: { v: Vocabulary; open: boolean; onToggle: () => void }) {
  return (
    <div className="flip-card mt-3" data-testid="meaning-card" data-open={open}>
      <div className={cx('flip-inner', open && 'is-open')}>
        {/* 뒷면: 뜻 숨김 */}
        <button type="button" className="flip-face flip-back rounded-card border-2 border-dashed border-line bg-mist grid place-items-center min-h-[132px] w-full"
          onClick={onToggle} aria-expanded={open} aria-hidden={open} tabIndex={open ? -1 : 0} data-testid="reveal-meaning">
          <span className="text-center">
            <span className="block text-2xl" aria-hidden>👆</span>
            <span className="block font-bold mt-1">뜻 확인하기</span>
            <span className="block text-xs text-ink-soft mt-0.5">먼저 뜻을 떠올려 본 뒤 눌러 보세요</span>
          </span>
        </button>
        {/* 앞면: 뜻·예문·번역 */}
        <div className="flip-face flip-front rounded-card bg-white border border-line p-4 w-full" aria-hidden={!open}>
          <button type="button" onClick={onToggle} className="w-full text-left min-h-[44px]" aria-label="뜻 가리기" tabIndex={open ? 0 : -1} data-testid="hide-meaning">
            <span className="block text-xl font-extrabold break-words" data-testid="word-meaning">{v.meaning}</span>
            <span className="block text-xs text-ink-soft mt-0.5">{shortNote(v)}</span>
          </button>
          <div className="mt-3 rounded-2xl bg-mist p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium break-words">{v.example}</p>
              <p className="text-sm text-ink-soft mt-1 break-words">{v.exampleKo}</p>
            </div>
            {open && <AudioButton src={v.exampleAudio} text={v.example} label="예문 듣기" size="sm" />}
          </div>
          <WordStatus v={v} />
          <p className="text-[11px] text-ink-faint mt-1">카드 윗부분을 누르면 뜻을 다시 가려요 · 음성은 합성 음성(TTS), 발음기호는 CMU 사전 기반 미국식</p>
        </div>
      </div>
    </div>
  );
}

/** 학습 상태 · 다음 복습일 (기존 단어 카드 정보 유지) */
function WordStatus({ v }: { v: Vocabulary }) {
  const learnedOn = useApp((s) => s.learning.learnedWords[v.id]);
  const review = useApp((s) => s.learning.reviews[`word:${v.id}`]);
  return <p className="mt-2 text-xs" data-testid="word-status"><b>학습 상태</b> · {learnedOn ? `학습함 (${learnedOn})` : '새 단어'}{review && <> · 다음 복습 {review.due}</>}</p>;
}

/** 모시(대표 파트너)의 짧은 설명 — 뜻을 확인한 뒤에만 */
export function WordTip({ v, open }: { v: Vocabulary; open: boolean }) {
  const pid = useApp((s) => s.game.partnerId);
  const lv = useApp((s) => (pid ? s.game.characters[pid]?.level ?? 1 : 1));
  const [more, setMore] = useState(false);
  const g = GRAMMAR_BY_ID[v.grammarId];
  const name = pid ? CHARACTER_BY_ID[pid]?.name : '숲지기 등불';
  return (
    <div className="mt-3 flex items-start gap-2" data-testid="word-tip">
      <div className="shrink-0">{pid ? <CharacterImage id={pid} level={lv as 1 | 2} state={open ? 'greeting' : 'studying'} size={48} /> : <GuideImage size={44} />}</div>
      <div className="flex-1 min-w-0 rounded-2xl bg-white border border-line px-3 py-2 text-sm">
        <b className="text-accent-dark">{name}</b>{' '}
        {open ? wordTip(v) : '뜻을 먼저 떠올려 보고 아래 카드를 눌러 확인해 봐!'}
        {open && g && (
          more ? (
            <span className="block text-xs text-ink-soft mt-1">관련 문법: <Link className="underline font-semibold" to={`/grammar/${g.id}`}>{g.title}</Link> 강의에서 더 자세히 배울 수 있어요.</span>
          ) : <button type="button" className="block text-xs font-bold text-accent-dark mt-1 min-h-[28px]" onClick={() => setMore(true)}>더 알아보기 ›</button>
        )}
      </div>
    </div>
  );
}

/** 학습 화면 공통: 진행률 → 영어 카드 → 해석 카드 → 짧은 설명 (이전/다음 버튼은 화면에서) */
export function WordStudy({ v, index, total }: { v: Vocabulary; index: number; total: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div key={v.id} className="word-swap">
      <WordTopCard v={v} />
      <WordMeaningCard v={v} open={open} onToggle={() => setOpen(!open)} />
      <WordTip v={v} open={open} />
      <span className="sr-only" aria-live="polite">{index + 1} / {total} {v.word}</span>
    </div>
  );
}
