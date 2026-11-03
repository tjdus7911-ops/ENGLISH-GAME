import { SpriteImg } from '../Stage';
import { VILLAGE, type SceneSprite } from '../layout';

export function VillageDecoration({ deco }: { deco: SceneSprite }) {
  return <SpriteImg assetKey={deco.image as string} at={deco.at} width={deco.width} size={VILLAGE.size} testId={`vdeco-${deco.id}`} className="deco-in" />;
}
