import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp, homeContext, questList } from '@/store/app';
import { HOUSE_LEVELS, SLOTS, SPACES, isItemUnlocked, placeInDraft, type ItemCategory, type SpaceId } from '@/domain/game/home';
import { starBalance } from '@/domain/game/state';
import { FURNITURE, FURNITURE_BY_ID, CATEGORY_LABEL } from '@/content/furniture';
import { HouseScene } from '@/game/house/HouseScene';
import { GardenScene } from '@/game/garden/GardenScene';
import { ItemImage } from '@/game/ItemImage';
import { QuestRewardOverlay, type QuestReward } from '@/game/QuestRewardOverlay';
import { PartnerBubble } from '@/components/Partner';
import { Button, Card, Empty, Modal, Page, SectionTitle, Tag } from '@/components/ui';
import { cx } from '@/lib/cx';
import { useLeaveGuard } from '@/lib/leaveGuard';

function Stars() {
  const n = useApp((s) => starBalance(s.game));
  return <span className="inline-flex items-center gap-1 rounded-full bg-butter px-3 min-h-[36px] font-bold" data-testid="star-balance">★ {n}</span>;
}

const RARITY_LABEL: Record<string, string> = { basic: '기본', common: '일반', rare: '희귀', special: '특별' };

/** 슬롯형 꾸미기 편집기: 슬롯 선택 → 보유 아이템 선택(미리보기) → 확정/취소
 *  + 보관함에서 가구를 고른 상태(pick): 호환 슬롯만 활성화 → 슬롯을 누르면 미리보기 → 배치 완료 */
const PLACE_ERROR: Record<string, string> = {
  duplicate: '같은 가구는 한 자리에만 놓을 수 있어요. 기존 배치를 그대로 유지했어요.',
  'wrong-slot': '이 자리에는 놓을 수 없는 가구예요. 기존 배치를 그대로 유지했어요.',
  'not-owned': '보유하지 않은 가구예요. 기존 배치를 그대로 유지했어요.',
  'space-locked': '아직 열리지 않은 공간이에요.',
  'unknown-slot': '알 수 없는 자리예요. 기존 배치를 그대로 유지했어요.',
};

function DecorEditor({ space }: { space: SpaceId }) {
  const home = useApp((s) => s.home);
  const commit = useApp((s) => s.commitDecor);
  const saved = home.placements[space];
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [pick, setPick] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  const [mode, setMode] = useState<'view' | 'decorate'>('view');
  // 주소 파라미터로 진입 (적용 후 주소에서 지워 새로고침 시 다시 적용되지 않게 함)
  //  ?place=itemId : 상점 '바로 배치하기' → 맞는 빈 자리에 미리보기
  //  ?pick=itemId  : 보관함 '배치하기' → 호환 슬롯만 활성화, 사용자가 자리 선택
  //  ?slot=slotId  : 보관함 '이 자리로 이동' → 해당 슬롯 선택 창
  const { search, pathname } = useLocation();
  const navTo = useNavigate();
  const hydrated = useApp((s) => s.hydrated); // 저장 데이터(IndexedDB) 복원 전에는 보유 여부를 판단하지 않는다 (직접 링크·새로고침 진입)
  useEffect(() => {
    if (!hydrated) return;
    const q = new URLSearchParams(search);
    const pl = q.get('place'), pk = q.get('pick'), sl = q.get('slot');
    if (!pl && !pk && !sl) return;
    const owns = (id: string | null) => !!id && !!FURNITURE_BY_ID[id] && FURNITURE_BY_ID[id].space === space && !!home.inventory[id];
    setMsg(null);
    if (owns(pl)) {
      const it = FURNITURE_BY_ID[pl!];
      const c = SLOTS[space].filter((x) => x.accepts === it.placementSlot);
      const target = c.find((x) => !saved[x.id]) ?? c[0];
      if (target && saved[target.id] !== it.itemId) setDraft((d) => placeInDraft(saved, d, target.id, it.itemId));
      setMode('decorate');
    }
    if (owns(pk)) { setPick(pk); setSlot(null); setMode('decorate'); }
    if (sl && SLOTS[space].some((x) => x.id === sl)) { setPick(null); setSlot(sl); setMode('decorate'); }
    navTo(pathname, { replace: true });
  }, [search, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps
  const effective = { ...saved, ...draft };
  const dirty = Object.keys(draft).some((k) => (saved[k] ?? null) !== draft[k]);
  useLeaveGuard(dirty, '저장하지 않은 배치가 있어요. 나가면 미리보기가 사라져요.');
  const slotDef = SLOTS[space].find((x) => x.id === slot);
  const owned = slotDef ? FURNITURE.filter((f) => f.placementSlot === slotDef.accepts && f.space === space && home.inventory[f.itemId]) : [];
  const canEmpty = slotDef && slotDef.accepts !== 'wallpaper' && slotDef.accepts !== 'floor';
  const pickItem = pick ? FURNITURE_BY_ID[pick] : undefined;
  const slotLabel = (id: string) => SLOTS[space].find((x) => x.id === id)?.label ?? id;
  const compatible = pickItem ? SLOTS[space].filter((x) => x.accepts === pickItem.placementSlot) : [];
  const slotState = pickItem ? (id: string) => (compatible.some((x) => x.id === id) ? 'active' as const : 'disabled' as const) : undefined;
  // 교체되어 보관함으로 돌아갈 가구 (확정 전 안내)
  const returning = Object.entries(draft).filter(([k, v]) => saved[k] && saved[k] !== v && !Object.values(effective).includes(saved[k]!)).map(([k]) => ({ slot: k, itemId: saved[k]! }));
  const onSlot = (id: string) => {
    setMsg(null);
    if (!pickItem) { setSlot(id); return; }
    if (!compatible.some((x) => x.id === id)) return; // 호환되지 않는 슬롯 (버튼도 비활성)
    if (effective[id] === pickItem.itemId) { setMsg({ text: `${pickItem.name}은(는) 이미 ${slotLabel(id)} 자리에 있어요.`, tone: 'ok' }); setPick(null); return; }
    setDraft(placeInDraft(saved, draft, id, pickItem.itemId));
    setPick(null);
  };
  const doCommit = () => {
    const r = commit(space, draft);
    if (r.ok) { setDraft({}); setSlot(null); setMsg({ text: r.changed ? '배치를 저장했어요! (별은 사용되지 않아요)' : '바뀐 것이 없어요.', tone: 'ok' }); }
    else { setDraft({}); setPick(null); setMsg({ text: PLACE_ERROR[r.error ?? ''] ?? '배치할 수 없어요. 기존 배치를 그대로 유지했어요.', tone: 'bad' }); } // 오류 → 기존 배치 복원
    return r.ok;
  };
  return (
    <>
      <div className="rounded-3xl overflow-hidden border border-line bg-white">
        {space === 'house'
          ? <HouseScene placements={effective} mode={mode} onSelect={onSlot} selected={pick ? null : slot} slotState={slotState} />
          : <GardenScene placements={effective} mode={mode} onSelect={onSlot} selected={pick ? null : slot} slotState={slotState} />}
      </div>
      {pickItem && mode === 'decorate' && (
        <div className="mt-2 rounded-2xl border-2 border-ok bg-mint p-2 flex items-center gap-2" data-testid="pick-banner" role="status">
          <ItemImage itemId={pickItem.itemId} size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{pickItem.name}</p>
            <p className="text-xs text-ink-soft">초록색 자리를 눌러 놓아 보세요 · 가능한 자리 {compatible.length}곳</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPick(null)} data-testid="pick-cancel">선택 취소</Button>
        </div>
      )}
      {returning.length > 0 && (
        <p className="mt-2 rounded-2xl bg-butter px-3 py-2 text-sm" data-testid="replace-notice">
          {returning.map((r) => `${slotLabel(r.slot)} 자리의 '${FURNITURE_BY_ID[r.itemId]?.name}'`).join(', ')}은(는) 교체되어 보관함으로 돌아가요. 미리보기를 확인하고 <b>배치 완료</b>를 눌러 주세요.
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <p className="text-xs text-ink-soft flex-1">{mode === 'view' ? '감상 모드 — 꾸미기를 시작하면 바꿀 수 있는 자리가 보여요.' : '바꿀 자리를 눌러 보세요. 확정하기 전까지는 미리보기예요. 보유 가구는 별 없이 교체돼요.'}</p>
        <Button size="sm" variant={mode === 'view' ? 'primary' : 'secondary'} data-testid="decor-toggle" aria-pressed={mode === 'decorate'}
          onClick={() => {
            if (mode === 'decorate') {
              setSlot(null);
              // 미저장 배치가 있으면 '끝내기' = 저장 후 감상 모드 (예전: 저장 안 된 미리보기가 감상 모드에 남았다가 화면을 나가면 사라짐)
              setPick(null);
              if (dirty && !doCommit()) return;
            }
            setMode(mode === 'view' ? 'decorate' : 'view');
          }}>
          {mode === 'view' ? '꾸미기 시작' : dirty ? '저장하고 끝내기' : '꾸미기 끝내기'}
        </Button>
      </div>
      {dirty && (
        <div className="sticky bottom-0 z-10 mt-3 grid grid-cols-2 gap-2 bg-mist py-2" data-testid="decor-actions">
          <Button variant="secondary" onClick={() => { setDraft({}); setSlot(null); setPick(null); setMsg({ text: '배치를 취소했어요. 기존 배치로 돌아왔어요.', tone: 'ok' }); }} data-testid="decor-cancel">배치 취소</Button>
          <Button onClick={doCommit} data-testid="decor-confirm">배치 완료</Button>
        </div>
      )}
      {msg && <p className={cx('text-sm text-center mt-2', msg.tone === 'ok' ? 'text-ok' : 'text-bad')} role="status" data-testid="decor-msg">{msg.text}</p>}
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
                  <button key={f.itemId} onClick={() => { setDraft(placeInDraft(saved, draft, slotDef.id, f.itemId)); setSlot(null); }} aria-pressed={effective[slotDef.id] === f.itemId} data-testid={`opt-${f.itemId}`}
                    className={cx('rounded-2xl border-2 p-2 bg-white text-center min-h-[44px]', effective[slotDef.id] === f.itemId ? 'border-accent' : 'border-line')}>
                    <div className="grid place-items-center"><ItemImage itemId={f.itemId} size={56} /></div>
                    <p className="text-[11px] font-semibold leading-tight mt-1">{f.name}</p>
                    {(() => { const at = Object.entries(effective).find(([k, v]) => v === f.itemId && k !== slotDef.id)?.[0]; return at ? <p className="text-[10px] text-ink-soft">{slotLabel(at)}에서 옮기기</p> : null; })()}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-2 mt-4">
              {canEmpty && effective[slotDef.id] && <Button variant="secondary" onClick={() => { setDraft(placeInDraft(saved, draft, slotDef.id, null)); setSlot(null); }} data-testid="opt-empty">자리 비우기 (보관함으로)</Button>}
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
  const [bought, setBought] = useState<string | null>(null);
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
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('min-h-[44px] px-3 rounded-full text-sm font-semibold border shrink-0', tab === k ? 'bg-accent text-white border-accent' : 'bg-white border-line')}>{l}</button>)}
      </div>
      {msg && <p className="text-sm text-center my-2" role="status">{msg}</p>}
      {bought && (
        <div className="flex justify-center mb-2">
          <Button size="sm" data-testid="place-now" onClick={() => nav(`/${FURNITURE_BY_ID[bought].space === 'garden' ? 'garden' : 'house'}?place=${bought}`)}>바로 배치하기 ›</Button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3" data-testid="shop-grid">
        {list.map((f) => {
          const owned = !!s.home.inventory[f.itemId];
          const unlocked = isItemUnlocked(f, s.home);
          return (
            <div key={f.itemId} className="rounded-2xl bg-white border border-line p-3 text-center" data-testid={`shop-${f.itemId}`}>
              <div className="grid place-items-center"><ItemImage itemId={f.itemId} size={72} /></div>
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
            <div className={cx('grid place-items-center', !s.home.inventory[f.itemId] && 'opacity-40 grayscale')}><ItemImage itemId={f.itemId} size={48} /></div>
            <p className="text-[11px] font-semibold leading-tight">{f.name}</p>
            <p className="text-[10px] text-ink-faint">{f.unlockCondition.type === 'reward' ? f.unlockCondition.label : ''}</p>
          </div>
        ))}
      </div>
      <Modal open={!!item} onClose={() => setConfirm(null)} label="구매 확인">
        {item && (
          <div className="text-center">
            <div className="grid place-items-center"><ItemImage itemId={item.itemId} size={110} /></div>
            <p className="font-bold text-lg">{item.name}</p>
            <p className="text-sm text-ink-soft">★ {item.price} 사용 · 구매 후 잔액 ★ {bal - item.price}</p>
            <div className="grid gap-2 mt-4">
              <Button size="lg" data-testid="buy-confirm" onClick={() => { const r = s.buyFurniture(item.itemId); setConfirm(null); setBought(r.ok ? item.itemId : null); setMsg(r.ok ? `${item.name}을(를) 샀어요!` : r.error === 'insufficient' ? '별이 부족해요.' : '구매할 수 없어요.'); }}>구매하기</Button>
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
  const commit = useApp((s) => s.commitDecor);
  const nav = useNavigate();
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // 아이템 → 배치된 (공간, 슬롯)
  const placedAt = (itemId: string): { space: SpaceId; slot: string } | null => {
    for (const sp of ['house', 'garden'] as SpaceId[]) for (const [k, v] of Object.entries(home.placements[sp] ?? {})) if (v === itemId) return { space: sp, slot: k };
    return null;
  };
  const items = Object.values(home.inventory).map((o) => ({ o, f: FURNITURE_BY_ID[o.itemId] })).filter((x) => x.f).sort((a, b) => b.o.acquiredAt - a.o.acquiredAt);
  const f = sel ? FURNITURE_BY_ID[sel] : null;
  const at = f ? placedAt(f.itemId) : null;
  const slots = f ? SLOTS[f.space].filter((x) => x.accepts === f.placementSlot) : [];
  const locked = f?.space === 'garden' && !home.spaces.garden;
  const base = f?.space === 'garden' ? '/garden' : '/house';
  const removable = f && f.category !== 'wallpaper' && f.category !== 'floor';
  return (
    <Page title="가구 보관함" back="/house">
      <p className="text-xs text-ink-soft mb-2">가구를 누르면 배치하거나 옮길 수 있어요. 보관함 가구 배치·교체에는 별이 들지 않아요.</p>
      {msg && <p className="text-sm text-center text-ok mb-2" role="status" data-testid="inv-msg">{msg}</p>}
      <div className="grid grid-cols-3 gap-2" data-testid="inventory">
        {items.map(({ o, f: it }) => {
          const p = placedAt(it.itemId);
          return (
            <button key={it.itemId} type="button" onClick={() => { setSel(it.itemId); setMsg(null); }} data-testid={`inv-${it.itemId}`} data-placed={p ? `${p.space}:${p.slot}` : ''}
              className={cx('rounded-2xl bg-white border p-2 text-center min-h-[44px]', p ? 'border-accent/40' : 'border-line')}>
              <div className="grid place-items-center"><ItemImage itemId={it.itemId} size={56} /></div>
              <p className="text-[11px] font-semibold leading-tight">{it.name}</p>
              <div className="flex justify-center gap-1 mt-1 flex-wrap">{p ? <Tag tone="accent">배치 중</Tag> : <Tag>보관</Tag>}{o.source !== 'purchase' && <Tag tone="lilac">{o.source === 'default' ? '기본' : '보상'}</Tag>}</div>
            </button>
          );
        })}
      </div>
      <Modal open={!!f} onClose={() => setSel(null)} label="가구 배치">
        {f && (
          <div className="text-center" data-testid="inv-sheet">
            <div className="grid place-items-center"><ItemImage itemId={f.itemId} size={96} /></div>
            <p className="font-bold text-lg mt-1">{f.name}</p>
            <p className="text-sm text-ink-soft" data-testid="inv-status">
              {CATEGORY_LABEL[f.category]} · {at ? `배치 중 — ${SLOTS[at.space].find((x) => x.id === at.slot)?.label} 자리` : '보관 중'}
            </p>
            {locked && <p className="text-xs text-bad mt-1">비밀 정원이 열리면 배치할 수 있어요.</p>}
            <div className="grid gap-2 mt-4">
              {!at && !locked && <Button size="lg" onClick={() => nav(`${base}?pick=${f.itemId}`)} data-testid="inv-place">배치하기 · 놓을 자리 고르기</Button>}
              {at && <Button size="lg" onClick={() => nav(`${base}?slot=${at.slot}`)} data-testid="inv-goto">이 자리로 이동</Button>}
              {at && slots.length > 1 && <Button variant="secondary" onClick={() => nav(`${base}?pick=${f.itemId}`)} data-testid="inv-move">다른 자리로 옮기기</Button>}
              {at && removable && (
                <Button variant="secondary" data-testid="inv-unplace" onClick={() => {
                  const r = commit(at.space, { [at.slot]: null });
                  setMsg(r.ok ? `${f.name}을(를) 배치 해제했어요. 보관함에 그대로 있어요.` : '배치를 해제하지 못했어요. 기존 배치를 유지했어요.');
                  setSel(null);
                }}>배치 해제 (보관함으로)</Button>
              )}
              {at && !removable && <p className="text-xs text-ink-faint">벽지·바닥은 비워 둘 수 없어서 다른 벽지·바닥으로 교체만 할 수 있어요.</p>}
              <Button variant="ghost" onClick={() => setSel(null)}>닫기</Button>
            </div>
          </div>
        )}
      </Modal>
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
        <div className="rounded-3xl overflow-hidden border border-line bg-white mb-3"><GardenScene placements={{}} locked /></div>
        <Card className="text-center" data-testid="garden-locked">
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
  const [reward, setReward] = useState<QuestReward | null>(null);
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
      <QuestRewardOverlay reward={reward} onClose={() => setReward(null)} />
    </Page>
  );
}
