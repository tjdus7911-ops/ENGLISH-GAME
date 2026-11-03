import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp, homeContext, questList } from '@/store/app';
import { HOUSE_LEVELS, SLOTS, SPACES, isItemUnlocked, type ItemCategory, type SpaceId } from '@/domain/game/home';
import { starBalance } from '@/domain/game/state';
import { FURNITURE, FURNITURE_BY_ID, CATEGORY_LABEL } from '@/content/furniture';
import { GardenScene, HouseScene } from '@/components/HomeScenes';
import { FurnitureThumb } from '@/components/FurnitureArt';
import { PartnerBubble } from '@/components/Partner';
import { Button, Card, Empty, Modal, Page, SectionTitle, Tag } from '@/components/ui';
import { cx } from '@/lib/cx';

function Stars() {
  const n = useApp((s) => starBalance(s.game));
  return <span className="inline-flex items-center gap-1 rounded-full bg-butter px-3 min-h-[36px] font-bold" data-testid="star-balance">★ {n}</span>;
}

const RARITY_LABEL: Record<string, string> = { basic: '기본', common: '일반', rare: '희귀', special: '특별' };

/** 슬롯형 꾸미기 편집기: 슬롯 선택 → 보유 아이템 선택(미리보기) → 확정/취소 */
function DecorEditor({ space }: { space: SpaceId }) {
  const home = useApp((s) => s.home);
  const commit = useApp((s) => s.commitDecor);
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [slot, setSlot] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const effective = { ...home.placements[space], ...draft };
  const dirty = Object.keys(draft).some((k) => (home.placements[space][k] ?? null) !== draft[k]);
  const slotDef = SLOTS[space].find((x) => x.id === slot);
  const owned = slotDef ? FURNITURE.filter((f) => f.placementSlot === slotDef.accepts && f.space === space && home.inventory[f.itemId]) : [];
  const canEmpty = slotDef && slotDef.accepts !== 'wallpaper' && slotDef.accepts !== 'floor';
  return (
    <>
      <div className="rounded-3xl overflow-hidden border border-line bg-white">
        {space === 'house' ? <HouseScene placements={effective} onSelect={(id) => { setSlot(id); setMsg(null); }} selected={slot} /> : <GardenScene placements={effective} onSelect={(id) => { setSlot(id); setMsg(null); }} selected={slot} />}
      </div>
      <p className="text-xs text-ink-soft mt-2">점선 자리나 가구를 눌러 바꿔 보세요. 확정하기 전까지는 미리보기예요.</p>
      {dirty && (
        <div className="sticky bottom-0 z-10 mt-3 grid grid-cols-2 gap-2 bg-mist py-2" data-testid="decor-actions">
          <Button variant="secondary" onClick={() => { setDraft({}); setSlot(null); setMsg('배치를 취소했어요.'); }} data-testid="decor-cancel">배치 취소</Button>
          <Button onClick={() => { const r = commit(space, draft); setMsg(r.ok ? (r.changed ? '배치를 저장했어요!' : '바뀐 것이 없어요.') : '배치할 수 없는 아이템이에요.'); if (r.ok) { setDraft({}); setSlot(null); } }} data-testid="decor-confirm">배치 확정</Button>
        </div>
      )}
      {msg && <p className="text-sm text-center mt-2 text-ok" role="status">{msg}</p>}
      <Modal open={!!slotDef} onClose={() => setSlot(null)} label={`${slotDef?.label ?? ''} 바꾸기`}>
        {slotDef && (
          <>
            <p className="font-bold text-lg">{slotDef.label} 바꾸기</p>
            <p className="text-xs text-ink-soft">보유한 {CATEGORY_LABEL[slotDef.accepts]}만 놓을 수 있어요.</p>
            {owned.length === 0 ? (
              <Empty icon="🛋" title={`보유한 ${CATEGORY_LABEL[slotDef.accepts]}이(가) 없어요`} action={<Link to={`/shop?c=${slotDef.accepts}`}><Button>가구 상점 가기</Button></Link>} />
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-3" data-testid="slot-options">
                {owned.map((f) => (
                  <button key={f.itemId} onClick={() => { setDraft({ ...draft, [slotDef.id]: f.itemId }); setSlot(null); }} aria-pressed={effective[slotDef.id] === f.itemId} data-testid={`opt-${f.itemId}`}
                    className={cx('rounded-2xl border-2 p-2 bg-white text-center min-h-[44px]', effective[slotDef.id] === f.itemId ? 'border-accent' : 'border-line')}>
                    <div className="grid place-items-center"><FurnitureThumb item={f} size={56} /></div>
                    <p className="text-[11px] font-semibold leading-tight mt-1">{f.name}</p>
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-2 mt-4">
              {canEmpty && effective[slotDef.id] && <Button variant="secondary" onClick={() => { setDraft({ ...draft, [slotDef.id]: null }); setSlot(null); }} data-testid="opt-empty">자리 비우기 (보관함으로)</Button>}
              <Button variant="ghost" onClick={() => setSlot(null)}>닫기</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

export function HouseScreen() {
  const home = useApp((s) => s.home);
  const s = useApp();
  const ctx = homeContext(s);
  const lv = HOUSE_LEVELS.find((l) => l.level === home.houseLevel)!;
  const next = HOUSE_LEVELS.find((l) => l.level === home.houseLevel + 1);
  const owned = Object.keys(home.inventory).length;
  return (
    <Page title="나의 집" back="/home" right={<Stars />}>
      <Card className="flex items-center justify-between gap-2 mb-3" data-testid="house-level">
        <div><p className="text-xs text-ink-soft">집 성장</p><p className="font-extrabold">Lv.{home.houseLevel} {lv.title}</p></div>
        {next && <p className="text-xs text-right text-ink-soft max-w-[55%]">다음 Lv.{next.level} {next.title}<br />{next.implemented ? next.rule : '후속 업데이트 예정'}</p>}
      </Card>
      <DecorEditor space="house" />
      <div className="mt-3"><PartnerBubble state="greeting" text={home.decorateCount === 0 ? '여기가 우리가 함께 지낼 집이야! 아직 조금 허전하지? 영어를 공부하면서 하나씩 꾸며보자!' : '방이 점점 아늑해지고 있어!'} /></div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Link to="/shop"><Button className="w-full" data-testid="go-shop">🛒 가구 상점</Button></Link>
        <Link to="/inventory"><Button variant="secondary" className="w-full">📦 보관함 {owned}</Button></Link>
        <Link to="/garden"><Button variant="secondary" className="w-full" data-testid="go-garden">🌷 비밀 정원 {home.spaces.garden ? '' : '🔒'}</Button></Link>
        <Link to="/partner"><Button variant="secondary" className="w-full">🐾 대표 파트너</Button></Link>
      </div>
      <SectionTitle>집 성장 단계</SectionTitle>
      <Card className="grid gap-2">
        {HOUSE_LEVELS.map((l) => (
          <div key={l.level} className="flex items-center gap-2 text-sm">
            <span className={cx('w-12 font-bold', home.houseLevel >= l.level ? 'text-accent' : 'text-ink-faint')}>Lv.{l.level}</span>
            <span className="flex-1">{l.title}</span>
            {home.houseLevel >= l.level ? <Tag tone="ok">달성</Tag> : l.implemented ? <span className="text-xs text-ink-soft">{l.rule}</span> : <Tag>준비 중</Tag>}
          </div>
        ))}
        <p className="text-xs text-ink-faint">꾸미기 {home.decorateCount}회 · 새 가구 배치가 반영돼요 · 문법 단원 {ctx.lecturesCompleted}개 완료</p>
      </Card>
    </Page>
  );
}

export function ShopScreen() {
  const s = useApp();
  const nav = useNavigate();
  const init = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('c');
  const [tab, setTab] = useState<'all' | 'furniture' | 'deco' | 'wallpaper' | 'floor' | 'garden'>(init === 'wallpaper' || init === 'floor' ? init : init && ['flowerbed', 'tree', 'bench', 'fountain', 'gardenlight', 'path'].includes(init) ? 'garden' : 'all');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const bal = starBalance(s.game);
  const deco: ItemCategory[] = ['lamp', 'rug', 'plant', 'frame'];
  const list = FURNITURE.filter((f) => f.price > 0).filter((f) =>
    tab === 'all' ? true : tab === 'garden' ? f.space === 'garden' : tab === 'wallpaper' ? f.category === 'wallpaper' : tab === 'floor' ? f.category === 'floor' : tab === 'deco' ? deco.includes(f.category) : f.space === 'house' && !deco.includes(f.category) && f.category !== 'wallpaper' && f.category !== 'floor');
  const item = confirm ? FURNITURE_BY_ID[confirm] : null;
  const TABS: [typeof tab, string][] = [['all', '전체'], ['furniture', '가구'], ['deco', '장식'], ['wallpaper', '벽지'], ['floor', '바닥'], ['garden', '정원']];
  return (
    <Page title="가구 상점" back="/house" right={<Stars />}>
      <p className="text-xs text-ink-soft mb-2">별은 퀘스트·단원 평가·업적으로 모을 수 있어요. 유료 결제·랜덤 뽑기는 없어요.</p>
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('min-h-[40px] px-3 rounded-full text-sm font-semibold border shrink-0', tab === k ? 'bg-accent text-white border-accent' : 'bg-white border-line')}>{l}</button>)}
      </div>
      {msg && <p className="text-sm text-center my-2" role="status">{msg}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3" data-testid="shop-grid">
        {list.map((f) => {
          const owned = !!s.home.inventory[f.itemId];
          const unlocked = isItemUnlocked(f, s.home);
          return (
            <div key={f.itemId} className="rounded-2xl bg-white border border-line p-3 text-center" data-testid={`shop-${f.itemId}`}>
              <div className="grid place-items-center"><FurnitureThumb item={f} size={72} /></div>
              <p className="font-semibold text-sm mt-1">{f.name}</p>
              <p className="text-[11px] text-ink-soft">{CATEGORY_LABEL[f.category]} · {RARITY_LABEL[f.rarity]}</p>
              {owned ? <Tag tone="ok">보유 중</Tag>
                : !unlocked ? <p className="text-[11px] text-ink-faint mt-1">🔒 {f.unlockCondition.type === 'houseLevel' ? `집 Lv.${f.unlockCondition.level} 필요` : '비밀 정원 개방 필요'}</p>
                : <Button size="sm" className="mt-1 w-full" disabled={bal < f.price} onClick={() => setConfirm(f.itemId)} data-testid={`buy-${f.itemId}`}>★ {f.price}</Button>}
            </div>
          );
        })}
      </div>
      <SectionTitle>보상으로만 얻는 아이템</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {FURNITURE.filter((f) => f.unlockCondition.type === 'reward').map((f) => (
          <div key={f.itemId} className={cx('rounded-2xl border p-2 text-center', s.home.inventory[f.itemId] ? 'bg-white border-line' : 'bg-white/60 border-dashed border-line')}>
            <div className={cx('grid place-items-center', !s.home.inventory[f.itemId] && 'opacity-40 grayscale')}><FurnitureThumb item={f} size={48} /></div>
            <p className="text-[11px] font-semibold leading-tight">{f.name}</p>
            <p className="text-[10px] text-ink-faint">{f.unlockCondition.type === 'reward' ? f.unlockCondition.label : ''}</p>
          </div>
        ))}
      </div>
      <Modal open={!!item} onClose={() => setConfirm(null)} label="구매 확인">
        {item && (
          <div className="text-center">
            <div className="grid place-items-center"><FurnitureThumb item={item} size={110} /></div>
            <p className="font-bold text-lg">{item.name}</p>
            <p className="text-sm text-ink-soft">★ {item.price} 사용 · 구매 후 잔액 ★ {bal - item.price}</p>
            <div className="grid gap-2 mt-4">
              <Button size="lg" data-testid="buy-confirm" onClick={() => { const r = s.buyFurniture(item.itemId); setConfirm(null); setMsg(r.ok ? `${item.name}을(를) 샀어요! 나의 집에서 배치해 보세요.` : r.error === 'insufficient' ? '별이 부족해요.' : '구매할 수 없어요.'); }}>구매하기</Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>취소</Button>
            </div>
          </div>
        )}
      </Modal>
      <div className="mt-5"><Button variant="secondary" className="w-full" onClick={() => nav('/house')}>나의 집에서 배치하기</Button></div>
    </Page>
  );
}

export function InventoryScreen() {
  const home = useApp((s) => s.home);
  const placedIds = new Set([...Object.values(home.placements.house), ...Object.values(home.placements.garden)].filter(Boolean));
  const items = Object.values(home.inventory).map((o) => ({ o, f: FURNITURE_BY_ID[o.itemId] })).filter((x) => x.f).sort((a, b) => b.o.acquiredAt - a.o.acquiredAt);
  return (
    <Page title="가구 보관함" back="/house">
      <div className="grid grid-cols-3 gap-2" data-testid="inventory">
        {items.map(({ o, f }) => (
          <div key={f.itemId} className="rounded-2xl bg-white border border-line p-2 text-center" data-testid={`inv-${f.itemId}`}>
            <div className="grid place-items-center"><FurnitureThumb item={f} size={56} /></div>
            <p className="text-[11px] font-semibold leading-tight">{f.name}</p>
            <div className="flex justify-center gap-1 mt-1 flex-wrap">{placedIds.has(f.itemId) ? <Tag tone="accent">배치 중</Tag> : <Tag>보관</Tag>}{o.source !== 'purchase' && <Tag tone="lilac">{o.source === 'default' ? '기본' : '보상'}</Tag>}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

export function GardenScreen() {
  const s = useApp();
  const open = !!s.home.spaces.garden;
  const garden = SPACES.find((x) => x.id === 'garden')!;
  const ctx = homeContext(s);
  const q = questList(s).find((x) => x.q.id === 's-garden')!;
  if (!open) {
    return (
      <Page title="비밀 정원" back="/house">
        <Card className="text-center" data-testid="garden-locked">
          <p className="text-4xl">🔒🌷</p>
          <p className="font-bold mt-2">아직 잠겨 있는 비밀 정원</p>
          <p className="text-sm text-ink-soft mt-1">{garden.desc}</p>
        </Card>
        <SectionTitle>개방 조건</SectionTitle>
        <Card className="grid gap-2">
          {garden.conditions.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-sm"><span>{c.test(s.home, ctx) ? '✅' : '⬜'}</span><span className="flex-1">{c.label}</span><span className="text-ink-soft">{c.progress(s.home, ctx)}</span></div>
          ))}
        </Card>
        <div className="mt-4">
          {q.status === 'completed' ? <Link to="/quests?t=space"><Button size="lg" data-testid="garden-claim-link">조건 달성! 퀘스트에서 정원 열기</Button></Link> : <Link to="/today"><Button size="lg" variant="secondary">학습하러 가기</Button></Link>}
        </div>
      </Page>
    );
  }
  return (
    <Page title="비밀 정원" back="/house" right={<Stars />}>
      <DecorEditor space="garden" />
      <div className="mt-3"><PartnerBubble state="greeting" text="정원 산책은 최고야! 장식을 더 놓으면 친구들이 더 좋아할 거야." /></div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Link to="/shop?c=flowerbed"><Button className="w-full">🛒 정원 장식 사기</Button></Link>
        <Link to="/spaces"><Button variant="secondary" className="w-full">🗺 다른 공간</Button></Link>
      </div>
    </Page>
  );
}

export function SpacesScreen() {
  const s = useApp();
  const ctx = homeContext(s);
  const FUTURE = ['작업실', '서재', '테라스', '카페', '마을 광장', 'A2 표현의 들판', 'B1 이야기의 하늘섬', 'B2 지식의 별빛섬'];
  return (
    <Page title="공간 지도" back="/home">
      <div className="grid gap-3">
        {SPACES.map((sp) => {
          const opened = !!s.home.spaces[sp.id];
          return (
            <Card key={sp.id} data-testid={`space-${sp.id}`}>
              <div className="flex items-center justify-between"><p className="font-bold">{sp.name}</p>{opened ? <Tag tone="ok">개방됨</Tag> : sp.implemented ? <Tag tone="warn">잠김</Tag> : <Tag>준비 중</Tag>}</div>
              <p className="text-xs text-ink-soft mt-1">{sp.desc}</p>
              {!opened && (
                <ul className="mt-2 grid gap-1">{sp.conditions.map((c) => <li key={c.label} className="text-sm flex gap-2"><span>{c.test(s.home, ctx) ? '✅' : '⬜'}</span><span className="flex-1">{c.label}</span><span className="text-ink-soft">{c.progress(s.home, ctx)}</span></li>)}</ul>
              )}
              {!sp.implemented && <p className="text-[11px] text-ink-faint mt-2">조건을 채워도 이번 버전에서는 아직 이용할 수 없어요. (후속 업데이트)</p>}
              {sp.id === 'garden' && <Link to="/garden" className="inline-block mt-2"><Button size="sm" variant="secondary">{opened ? '정원 가기' : '조건 보기'}</Button></Link>}
            </Card>
          );
        })}
      </div>
      <SectionTitle>향후 공간</SectionTitle>
      <div className="grid grid-cols-2 gap-2">{FUTURE.map((f) => <div key={f} className="rounded-2xl bg-white/60 border border-dashed border-line p-3 text-sm text-ink-faint">🔒 {f}<span className="block text-[11px]">준비 중</span></div>)}</div>
    </Page>
  );
}

const STATUS_LABEL: Record<string, string> = { locked: '잠김', available: '도전 가능', in_progress: '진행 중', completed: '완료', claimed: '수령 완료' };

export function QuestsScreen() {
  const s = useApp();
  const init = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('t');
  const [tab, setTab] = useState<'daily' | 'weekly' | 'achievement' | 'space'>(init === 'space' || init === 'weekly' || init === 'achievement' ? init : 'daily');
  const [reward, setReward] = useState<{ title: string; stars: number; items: string[] } | null>(null);
  const list = useMemo(() => questList(s).filter((x) => x.q.type === tab), [s, tab]);
  const TABS: [typeof tab, string][] = [['daily', '일일'], ['weekly', '주간'], ['achievement', '업적'], ['space', '공간 개방']];
  return (
    <Page title="퀘스트 게시판" back="/home" right={<Stars />}>
      <div className="flex gap-1 p-1 bg-white border border-line rounded-2xl" role="tablist">
        {TABS.map(([k, l]) => {
          const n = questList(s).filter((x) => x.q.type === k && x.status === 'completed').length;
          return <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`qtab-${k}`} className={cx('flex-1 min-h-[44px] rounded-xl font-semibold text-sm relative', tab === k ? 'bg-accent text-white' : 'text-ink-soft')}>{l}{n > 0 && <span className="absolute -top-1 -right-1 bg-bad text-white text-[10px] rounded-full w-5 h-5 grid place-items-center">{n}</span>}</button>;
        })}
      </div>
      <div className="grid gap-2 mt-3">
        {list.map(({ q, status, progress, lockReason }) => (
          <Card key={q.id} className="!p-3" data-testid={`quest-${q.id}`} data-status={status}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className={cx('font-semibold text-sm', status === 'claimed' && 'line-through text-ink-faint')}>{q.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${(progress / q.target) * 100}%` }} /></div>
                  <span className="text-xs text-ink-soft whitespace-nowrap">{progress}/{q.target}</span>
                </div>
                <p className="text-[11px] text-ink-faint mt-1">{STATUS_LABEL[status]}{lockReason ? ` · ${lockReason}` : ''} · ★ {q.stars}{q.items?.length ? ` + ${q.items.map((i) => FURNITURE_BY_ID[i].name).join(', ')}` : ''}{q.xp ? ` + 파트너 XP ${q.xp}` : ''}</p>
              </div>
              {status === 'completed' ? (
                <Button size="sm" data-testid={`claim-${q.id}`} onClick={() => { const r = s.claimQuest(q.id); if (r.ok) setReward({ title: q.title, stars: r.stars, items: r.items }); }}>받기</Button>
              ) : status === 'claimed' ? <Tag tone="ok">✓</Tag> : q.link ? <Link to={q.link}><Button size="sm" variant="secondary">하러 가기</Button></Link> : null}
            </div>
          </Card>
        ))}
      </div>
      {tab === 'space' && <p className="text-xs text-ink-soft mt-3">공간 개방 퀘스트는 조건(문법 3단원 · 꾸미기 3회 · 집 Lv.2)을 모두 채우면 완료돼요.</p>}
      <Modal open={!!reward} onClose={() => setReward(null)} label="퀘스트 완료 보상">
        {reward && (
          <div className="text-center" data-testid="quest-reward">
            <p className="text-sm font-semibold text-accent-dark">퀘스트 완료 보상</p>
            <p className="text-5xl my-3">⭐</p>
            <p className="font-bold">{reward.title}</p>
            <p className="text-2xl font-extrabold mt-1">★ +{reward.stars}</p>
            {reward.items.length > 0 && <div className="flex justify-center gap-2 mt-3">{reward.items.map((i) => <div key={i} className="text-center"><FurnitureThumb item={FURNITURE_BY_ID[i]} size={64} /><p className="text-xs">{FURNITURE_BY_ID[i].name}</p></div>)}</div>}
            <Button size="lg" className="mt-4" onClick={() => setReward(null)}>확인</Button>
          </div>
        )}
      </Modal>
    </Page>
  );
}
