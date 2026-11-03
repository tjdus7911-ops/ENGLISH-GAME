import { assetUrl } from '../assets';
import { VILLAGE } from '../layout';

export function VillageBackground() {
  return <img src={assetUrl(VILLAGE.background)} alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} data-testid="village-bg" />;
}
