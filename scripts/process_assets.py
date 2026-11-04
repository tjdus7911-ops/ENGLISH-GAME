"""AI 생성 시트(마젠타 배경) → 개별 게임 에셋(투명 WebP/PNG) + manifest.json

사용: python3 scripts/process_assets.py <입력 폴더(Figma에서 내보낸 PNG)> [--preview]
- 마젠타(#FF00FF) 크로마키 제거 + 가장자리 색 번짐(despill) 보정
- 알파 연결 요소를 시트 격자 칸에 배정해 아이템별로 분리 (작은 풀 조각도 같은 칸이면 합침)
- 투명 여백 트림, 기준점(하단 중앙) 계산
- public/assets/game/<분류>/<이름>.webp (+ .png 원본) 저장, public/assets/game/manifest.json 생성
"""
import json, sys, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent
import os
OUT = pathlib.Path(os.environ.get('ASSET_OUT', ROOT / 'public' / 'assets' / 'game'))  # 앱용 WebP + manifest
ART = pathlib.Path(os.environ.get('ART_OUT', ROOT / 'art' / 'game'))  # 투명 PNG 원본 (배포 제외, Figma·디자인 공유용)

C = lambda *xs: list(xs)
# 시트 이름 → (격자 열, 행, 분류 폴더, 아이템 이름 목록(읽는 순서), 기준점 종류)
SHEETS = {
    'buildings-sheet': (2, 2, 'buildings', C('home-stage1', 'library-stage1', 'wordforest-stage1', 'exam-stage1'), 'bottom'),
    'buildings-stage3-sheet': (2, 2, 'buildings', C('home-stage3', 'library-stage3', 'wordforest-stage3', 'exam-stage3'), 'bottom'),
    'village-deco-sheet': (3, 3, 'village', C('deco-flowerbed-round', 'deco-flowerbed-tulip', 'deco-bigtree', 'deco-lamp', 'deco-lilypad', 'deco-bridge', 'deco-garden-arch', 'deco-fence', 'deco-blossom-tree'), 'bottom'),
    'guide-sheet': (3, 1, 'characters', C('guide-idle', 'guide-hop', 'guide-wave'), 'bottom'),
    'furniture-1-beds-desks-chairs': (4, 2, 'furniture', C('bed-old', 'bed-wood', 'bed-flower', 'desk-small', 'desk-study', 'chair-wood', 'chair-cushion', 'sp-mossy'), 'bottom'),
    'furniture-2-shelves-sofas': (3, 2, 'furniture', C('shelf-small', 'shelf-big', 'sp-cobi', 'sofa-pink', 'sofa-green', 'sp-whisk'), 'bottom'),
    'furniture-3-lamps-plants': (4, 2, 'furniture', C('lamp-stand', 'lamp-mushroom', 'lamp-star', 'sp-lumi', 'plant-small', 'plant-monstera', 'plant-sprout', None), 'bottom'),
    'furniture-4-rugs-frames': (4, 2, 'furniture', C('rug-round', 'rug-check', 'rug-paw', 'sp-plip', 'frame-forest', 'frame-sea', 'frame-certificate', 'sp-stella'), 'center'),
    'garden-deco-1': (4, 2, 'garden', C('g-bed-tulip', 'g-bed-daisy', 'g-bed-lavender', 'g-tree-cherry', 'g-tree-apple', 'g-tree-maple', 'g-fountain', 'g-bench-wood'), 'bottom'),
    'garden-deco-2-icons': (4, 2, None, C('garden/g-bench-white', 'garden/g-light-lamp', 'garden/g-light-firefly', 'garden/g-path-stone', 'effects/icon-star', 'effects/icon-gift', 'effects/sparkle', 'effects/icon-trophy'), 'bottom'),
}
EVOLVED_POSES = ('idle', 'walk', 'wave', 'happy', 'sleep', 'study', 'sit', 'evolve')
ACTION_POSES = ('happy', 'sleep', 'study', 'sit')
for cid in ['mossy', 'plip', 'lumi', 'cobi', 'whisk', 'stella']:
    # 기존 시트: 상단 = 기본형(lv1), 하단 = 장식만 추가된 성장 변형(variant, 진화 연출 중간 프레임)
    SHEETS[f'{cid}-sheet'] = (3, 2, 'characters', C(*[f'{cid}-lv1-{p}' for p in ('idle', 'walk', 'wave')], *[f'{cid}-variant-{p}' for p in ('idle', 'walk', 'wave')]), 'bottom')
    # 신규 시트(Figma 02 페이지): 진화형(lv2) 8포즈 · 기본형 부족 행동 4포즈
    SHEETS[f'{cid}-evolved-sheet'] = (4, 2, 'characters', C(*[f'{cid}-lv2-{p}' for p in EVOLVED_POSES]), 'bottom')
    SHEETS[f'{cid}-actions-sheet'] = (4, 1, 'characters', C(*[f'{cid}-lv1-{p}' for p in ACTION_POSES]), 'bottom')
BACKGROUNDS = {'village-bg': 'village/bg', 'house-room': 'house/room', 'garden-bg': 'garden/bg',
               'concept-greenhouse': 'spaces/greenhouse', 'concept-lakeside': 'spaces/lakeside'}
TEXTURES = ('house-textures', 3, 2, C('wall-basic', 'wall-mint', 'wall-flower', 'floor-basic', 'floor-tile', 'floor-warm'))


def key_magenta(rgb: np.ndarray) -> np.ndarray:
    """마젠타 정도로 알파 계산 + despill. rgb float 0..1 → rgba"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mag = np.clip(np.minimum(r, b) - g, 0, 1)  # 마젠타는 r,b 높고 g 낮음
    alpha = 1 - np.clip((mag - 0.25) / 0.45, 0, 1)
    # 가장자리 마젠타 번짐 제거: r,b 를 g 쪽으로 끌어내림
    spill = np.clip(np.minimum(r, b) - g, 0, None) * (1 - alpha * 0.6)
    r2 = np.clip(r - spill, 0, 1); b2 = np.clip(b - spill, 0, 1)
    out = np.dstack([r2, g, b2, alpha])
    return out


def components_by_cell(alpha: np.ndarray, cols: int, rows: int):
    h, w = alpha.shape
    mask = alpha > 0.5
    lab, n = ndimage.label(mask)
    cells = {}
    if n == 0: return cells
    objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    for i, sl in enumerate(objs):
        if sizes[i] < 40: continue  # 노이즈
        cy = (sl[0].start + sl[0].stop) / 2; cx = (sl[1].start + sl[1].stop) / 2
        col = min(cols - 1, int(cx / (w / cols))); row = min(rows - 1, int(cy / (h / rows)))
        cells.setdefault(row * cols + col, []).append(i + 1)
    return cells, lab


def save(img: Image.Image, rel: str):
    p = ART / f'{rel}.png'
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, optimize=True)
    (OUT / rel).parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f'{rel}.webp', 'WEBP', quality=86, method=6)


GLOW_COLOR = {'cobi': (255, 196, 92), 'lumi': (255, 214, 96), 'mossy': (196, 236, 120), 'stella': (255, 224, 160)}


GLOW_SKIP_TOP = {'mossy': 0.22}  # 모시 머리 위 분홍 꽃은 원래 그림이므로 제외


def despill_glow(manifest):
    """진화 빛(evolve) 포즈의 후광 테두리는 생성 단계에서 마젠타 배경 위에 그려져 분홍빛 링으로 남는다.
    외곽선에서 22px 이내의 분홍 계열 픽셀(b>g, r>150)만 캐릭터 고유 빛 색으로 바꾼다(밝기 유지, 알파 유지)."""
    for rel in manifest['items']:
        if not rel.endswith('-evolve'): continue
        cid = rel.split('/')[1].split('-')[0]
        if cid not in GLOW_COLOR: continue
        a = np.asarray(Image.open(ART / f'{rel}.png').convert('RGBA')).astype(np.float32)
        r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
        dist = ndimage.distance_transform_edt(al > 8)
        band = (al > 8) & (dist <= 22)
        pink = band & (b > g + 8) & (r > 150)
        if cid in GLOW_SKIP_TOP: pink[: int(a.shape[0] * GLOW_SKIP_TOP[cid])] = False
        gc = np.array(GLOW_COLOR[cid], np.float32)
        lum = (0.3 * r + 0.59 * g + 0.11 * b) / max(1, 0.3 * gc[0] + 0.59 * gc[1] + 0.11 * gc[2])
        for i in range(3):
            a[..., i] = np.where(pink, np.clip(gc[i] * np.clip(lum, 0.6, 1.25), 0, 255), a[..., i])
        save(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA'), rel)
        print('glow recolor', rel, int(pink.sum()))


def normalize_characters(manifest):
    """같은 캐릭터의 모든 포즈(Lv1·Lv2·행동)를 동일 캔버스에 맞춘다 (하단 중앙 정렬).
    포즈마다 트림 크기가 달라 표시 너비 고정 시 크기가 출렁이는 문제를 막는다."""
    items = manifest['items']
    # 1) 행동 시트는 생성 배율이 달라, 기쁨 포즈 높이 = 기본 idle 높이 × 1.1 이 되도록 맞춘다
    for rel in list(items):
        if rel.startswith('characters/') and rel.endswith('-lv1-happy'):
            cid = rel.split('/')[1].split('-')[0]
            ref = items.get(f'characters/{cid}-lv1-idle')
            if not ref: continue
            f = 1.1 * ref['h'] / items[rel]['h']
            for p in ACTION_POSES:
                r = f'characters/{cid}-lv1-{p}'
                im = Image.open(ART / f'{r}.png').convert('RGBA')
                im = im.resize((max(1, round(im.width * f)), max(1, round(im.height * f))), Image.LANCZOS)
                save(im, r); items[r].update({'w': im.width, 'h': im.height})
            print('rescaled actions', cid, round(f, 3))
    # 2) 같은 캐릭터·같은 단계(lv1+variant / lv2)는 하나의 캔버스 크기로
    groups = {}
    for rel in items:
        if rel.startswith('characters/'):
            stem = rel.split('/')[1]
            cid = stem.split('-')[0]
            grp = 'guide' if cid == 'guide' else (f'{cid}-lv2' if '-lv2-' in stem else f'{cid}-lv1')
            groups.setdefault(grp, []).append(rel)
    for cid, rels in groups.items():
        imgs = {r: Image.open(ART / f'{r}.png').convert('RGBA') for r in rels}
        W = max(i.width for i in imgs.values()); H = max(i.height for i in imgs.values())
        for r, im in imgs.items():
            if im.size != (W, H):
                canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                canvas.paste(im, ((W - im.width) // 2, H - im.height))
                save(canvas, r)
            manifest['items'][r].update({'w': W, 'h': H, 'anchor': [W // 2, H - 6]})
        print('normalized', cid, W, H, len(rels))


def main(src: pathlib.Path, preview=False):
    manifest = {'generatedFrom': 'Figma AI (gpt-image-2.5-flare) — 2026-11-03', 'items': {}}
    files = {p.stem: p for p in src.rglob('*') if p.suffix.lower() in ('.png', '.jpg', '.jpeg')}
    for stem, (cols, rows, folder, names, anchor) in SHEETS.items():
        f = files.get(stem)
        if not f: print('missing sheet', stem); continue
        im = np.asarray(Image.open(f).convert('RGB')).astype(np.float32) / 255
        rgba = key_magenta(im)
        cells, lab = components_by_cell(rgba[..., 3], cols, rows)
        for idx, name in enumerate(names):
            if not name: continue
            ids = cells.get(idx, [])
            if not ids: print('  empty cell', stem, name); continue
            m = np.isin(lab, ids)
            # 소프트 엣지 포함: 마스크를 조금 팽창해 알파 가장자리 유지
            m = ndimage.binary_dilation(m, iterations=3)
            ys, xs = np.where(m)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = rgba[y0:y1, x0:x1].copy()
            crop[..., 3] *= m[y0:y1, x0:x1]
            pad = 6
            crop = np.pad(crop, ((pad, pad), (pad, pad), (0, 0)))
            img = Image.fromarray((crop * 255).astype(np.uint8), 'RGBA')
            rel = name if folder is None else f'{folder}/{name}'
            save(img, rel)
            hh, ww = crop.shape[:2]
            ax, ay = (ww / 2, hh / 2) if anchor == 'center' else (ww / 2, hh - pad)
            manifest['items'][rel] = {'w': ww, 'h': hh, 'anchor': [round(ax), round(ay)], 'sheet': stem}
        print('ok', stem, len([n for n in names if n]))
    for stem, rel in BACKGROUNDS.items():
        f = files.get(stem)
        if not f: print('missing bg', stem); continue
        img = Image.open(f).convert('RGB')
        save(img, rel)
        manifest['items'][rel] = {'w': img.width, 'h': img.height, 'anchor': [0, 0], 'sheet': stem}
        print('ok', stem)
    stem, cols, rows, names = TEXTURES
    f = files.get(stem)
    if f:
        img = Image.open(f).convert('RGB'); w, h = img.size; cw, ch = w // cols, h // rows
        for i, name in enumerate(names):
            c, r = i % cols, i // cols
            inset = int(cw * 0.06)
            tile = img.crop((c * cw + inset, r * ch + inset, (c + 1) * cw - inset, (r + 1) * ch - inset)).resize((384, 384), Image.LANCZOS)
            save(tile, f'house/{name}')
            manifest['items'][f'house/{name}'] = {'w': 384, 'h': 384, 'anchor': [0, 0], 'sheet': stem}
        print('ok', stem)
    despill_glow(manifest)
    normalize_characters(manifest)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    if 'ASSET_OUT' not in os.environ:  # 앱 빌드에 포함되는 사본 (크기·기준점 동기 조회용)
        (ROOT / 'src' / 'game' / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print('items', len(manifest['items']))


if __name__ == '__main__':
    if sys.argv[1] == '--normalize-only':  # 기존 출력물만 정규화
        m = json.loads((OUT / 'manifest.json').read_text())
        normalize_characters(m)
        (OUT / 'manifest.json').write_text(json.dumps(m, ensure_ascii=False, indent=1))
        (ROOT / 'src' / 'game' / 'manifest.json').write_text(json.dumps(m, ensure_ascii=False, indent=1))
    else:
        main(pathlib.Path(sys.argv[1]), '--preview' in sys.argv)
