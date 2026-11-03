import { SpriteImg } from '../Stage';
import { HOUSE, itemAsset } from '../layout';

export function HouseFurniture({ slotId, itemId }: { slotId: string; itemId: string }) {
  const s = HOUSE.slots[slotId];
  const key = itemAsset(itemId, 'house');
  if (!s || !key) return null;
  // 러그는 항상 바닥 위(다른 가구 아래), 액자는 벽면
  const z = slotId === 'rug' ? 50 : slotId === 'frame' ? 40 : undefined;
  return <span data-testid={`placed-${slotId}`} data-item={itemId}><SpriteImg assetKey={key} at={s.at} width={s.width} size={HOUSE.size} z={z} className="deco-in" /></span>;
}
