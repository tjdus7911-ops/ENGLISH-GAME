import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CharacterAnimState } from '@/domain/types';
import { CHARACTER_BY_ID, GUIDE } from '@/content/characters';
import { DECORATION_RULES } from '@/domain/game/state';
import { STORIES } from '@/content/furniture';
import { useApp } from '@/store/app';
import { cx } from '@/lib/cx';
import { CharacterImage, GuideImage } from '@/game/CharacterImage';
import { EvolutionSequence } from '@/game/EvolutionSequence';
import { Button, Modal } from './ui';

export function usePartner() {
  const partnerId = useApp((s) => s.game.partnerId);
  const uc = useApp((s) => (s.game.partnerId ? s.game.characters[s.game.partnerId] : undefined));
  return partnerId && uc ? { ch: CHARACTER_BY_ID[partnerId], uc } : null;
}

function pickLine(lines: string[] | undefined, salt: number) {
  if (!lines?.length) return '';
  return lines[salt % lines.length];
}

/**
 * 대표 파트너(없으면 숲지기 등불)의 말풍선.
 * 음성 재생·녹음을 방해하지 않도록 소리는 내지 않고, 애니메이션은 transform 만 사용한다.
 */
export function PartnerBubble({ state, text, compact = false }: { state: CharacterAnimState; text?: string; compact?: boolean }) {
  const p = usePartner();
  const [salt] = useState(() => Math.floor(Math.random() * 100));
  const line = text ?? (p ? pickLine(p.ch.lines[state] ?? p.ch.lines.studying, salt) : pickLine(GUIDE.lines[state] ?? GUIDE.lines.greeting, salt));
  if (!line) return null;
  return (
    <div className={cx('flex items-end gap-2', compact && 'opacity-95')} aria-live="polite">
      {p ? <CharacterImage id={p.ch.id} level={p.uc.level} state={state} size={compact ? 48 : 64} /> : <GuideImage size={compact ? 44 : 60} />}
      <div className="relative rounded-2xl rounded-bl-sm bg-white border border-line px-3 py-2 text-sm max-w-[80%]">
        <span className="font-semibold text-accent-dark mr-1">{p ? p.ch.name : GUIDE.name}</span>{line}
      </div>
    </div>
  );
}

/** 보상·캐릭터 획득·성장·마을 장식 알림 */
export function CelebrationLayer() {
  const cel = useApp((s) => s.celebrations);
  const dismiss = useApp((s) => s.dismissCelebration);
  const chars = useApp((s) => s.game.characters);
  const nav = useNavigate();
  const toasts = cel.filter((c) => c.kind === 'reward' || c.kind === 'decoration');
  const big = cel.find((c) => c.kind === 'character' || c.kind === 'levelup');
  const { pathname } = useLocation();
  // 이야기는 학습 흐름을 끊지 않도록 마을·집·정원·도감·퀘스트 화면에서만 보여 준다
  const storyHere = /^\/(home|house|garden|collection|quests|spaces|discover)/.test(pathname);
  const story = !big && storyHere ? cel.find((c) => c.kind === 'story') : undefined;
  const [line, setLine] = useState(0);
  useEffect(() => { setLine(0); }, [story?.id]);

  // 보이는 토스트(최대 3개)는 각자 2.6초 뒤 동시에 사라진다 (예전: 하나씩 순서대로 → 3개면 7.8초 동안 화면 상단을 가림)
  const visibleIds = toasts.slice(0, 3).map((t) => t.id).join(',');
  useEffect(() => {
    if (!visibleIds) return;
    const timers = visibleIds.split(',').map((id) => setTimeout(() => dismiss(id), 2600));
    return () => timers.forEach(clearTimeout);
  }, [visibleIds, dismiss]);

  return (
    <>
      <div className="fixed top-16 left-0 right-0 z-40 pointer-events-none flex flex-col items-center gap-2 px-4">
        {toasts.slice(0, 3).map((t) => (
          <div key={t.id} className="pointer-events-none toast-in rounded-2xl bg-ink text-white px-4 py-2.5 text-sm shadow-lg max-w-[420px]" role="status">
            {t.kind === 'reward' ? `✨ ${t.text}` : `🌼 마을에 새 변화: ${DECORATION_RULES.find((d) => d.id === t.decoration)?.label}`}
          </div>
        ))}
      </div>
      {story && story.kind === 'story' && STORIES[story.storyId] && (
        <Modal open label="이야기" onClose={() => dismiss(story.id)}>
          <div data-testid="story-modal" data-story={story.storyId}>
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-accent-dark">📖 {STORIES[story.storyId].title}</p>
              <button className="text-sm text-ink-soft min-h-[44px] px-2" onClick={() => dismiss(story.id)} data-testid="story-skip">건너뛰기</button></div>
            <div className="mt-3"><PartnerBubble state="greeting" text={STORIES[story.storyId].lines[line]} /></div>
            <p className="text-xs text-ink-faint mt-2 text-right">{line + 1} / {STORIES[story.storyId].lines.length}</p>
            <Button size="lg" className="mt-3" data-testid="story-next" onClick={() => (line + 1 < STORIES[story.storyId].lines.length ? setLine(line + 1) : dismiss(story.id))}>{line + 1 < STORIES[story.storyId].lines.length ? '다음' : '좋아!'}</Button>
          </div>
        </Modal>
      )}
      {big && (
        <Modal open label={big.kind === 'character' ? '캐릭터 획득' : '캐릭터 성장'} onClose={() => dismiss(big.id)}>
          {(() => {
            const id = big.kind === 'character' || big.kind === 'levelup' ? big.characterId : '';
            const ch = CHARACTER_BY_ID[id];
            const lv = chars[id]?.level ?? 1;
            return (
              <div className="text-center" data-testid={big.kind === 'character' ? 'acquire-modal' : 'levelup-modal'}>
                <p className="text-sm font-semibold text-accent-dark">{big.kind === 'character' ? (ch.rarity === 'common' ? '새 친구 발견!' : ch.rarity === 'rare' ? '희귀 캐릭터 획득!' : '특별 캐릭터 획득!') : '캐릭터 성장!'}</p>
                <div className="my-3 grid place-items-center">
                  {big.kind === 'levelup' ? <div className="rounded-full p-2 bg-butter glow"><EvolutionSequence id={id} size={140} /></div> : (
                    <div className="rounded-full p-4 bg-mint"><CharacterImage id={id} level={lv} state="greeting" size={140} /></div>
                  )}
                </div>
                <p className="text-2xl font-extrabold">{ch.name} {big.kind === 'levelup' && <span className="text-accent">Lv.2</span>}</p>
                <p className="text-sm text-ink-soft mt-1">{ch.species} · {ch.conceptLabel}</p>
                <p className="mt-3 text-sm">{big.kind === 'levelup' ? ch.lines.levelup?.[0] : ch.lines.greeting?.[0]}</p>
                <div className="mt-5 grid gap-2">
                  <Button size="lg" onClick={() => dismiss(big.id)}>좋아요!</Button>
                  <Button variant="ghost" onClick={() => { dismiss(big.id); nav(`/collection/${id}`); }}>도감에서 보기</Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </>
  );
}
