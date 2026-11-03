import { SpriteImg } from '../Stage';
import { GARDEN, itemAsset } from '../layout';

export function GardenDecoration({ slotId, itemId }: { slotId: string; itemId: string }) {
  const s = GARDEN.slots[slotId];
  const key = itemAsset(itemId, 'garden');
  if (!s || !key) return null;
  const z = slotId.startsWith('path') && itemId !== 'g-arch' ? 60 : undefined;
  return <span data-testid={`placed-${slotId}`} data-item={itemId}><SpriteImg assetKey={key} at={s.at} width={s.width} size={GARDEN.size} z={z} className="deco-in" /></span>;
}
