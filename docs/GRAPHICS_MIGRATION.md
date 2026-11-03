# 게임 그래픽 이미지 에셋 전환 — 사전 보고서 · 에셋 명세

> 상태: **설계 완료 / 에셋 미준비 / 구현 미착수.** 게임 화면 그래픽 코드는 아직 바꾸지 않았습니다.

---

## 1. 현재 마을·집이 어떤 코드로 렌더링되는가

| 화면 | 렌더링 파일 | 방식 |
|---|---|---|
| 마을 홈 | `src/components/Village.tsx` (245줄) | `<svg viewBox="0 92 400 300">` 한 장 안에 하늘·땅·길·연못·건물·나무·장식을 모두 SVG 도형으로 그립니다. 그 위에 HTML 레이어 두 개를 겹칩니다. ① 건물 터치 영역 `div[role=button]` 4개(사각형) ② 캐릭터 `button` (안에 SVG 캐릭터). 캐릭터는 타원형 이동 영역 안에서 `left/top` CSS transition으로 움직입니다. |
| 나의 집 | `src/components/HomeScenes.tsx` → `HouseScene` | SVG `polygon` 으로 벽 2면과 바닥을 그리고, `pattern` 으로 벽지·바닥 무늬를 채웁니다. 가구는 슬롯 좌표에 `FurnitureShape` 를 놓습니다. 파트너는 `foreignObject` 로 넣습니다. |
| 비밀 정원 | `HomeScenes.tsx` → `GardenScene` | SVG 땅·산책로 위에 장식 `FurnitureShape` 를 놓고, HTML 캐릭터가 원을 그리며 이동합니다. |
| 가구 썸네일 | `src/components/FurnitureArt.tsx` (59줄) | 카테고리별 SVG 도형 함수에 아이템 색상을 넣어 그립니다. |
| 캐릭터 | `src/components/CharacterArt.tsx` (197줄) | 6종 × Lv.1/2 를 SVG 도형으로 그리고, 상태 애니메이션은 CSS `@keyframes` 입니다. 학습 UI(파트너 말풍선, 도감, 시험장, 온보딩)에서도 이 컴포넌트를 씁니다. |
| 보상·스토리 연출 | `src/components/Partner.tsx` → `CelebrationLayer` | 토스트·획득/진화/스토리 모달이 한 컴포넌트에 섞여 있습니다. |

## 2. CSS/SVG로 직접 그린 요소 (교체 대상 전체)

- **마을:** 하늘 그라디언트, 먼 숲 나무 6그루, 아이소메트릭 땅과 측면 흙, 길 5개, 연못, 건물 4개(나의 집, 도서관, 단어 숲, 시험장), 장식 6종(꽃밭, 큰 나무, 도서관 깃발, 정원 밭, 연못 다리, 주민), 2단계 가로등 4개·연잎, 3단계 장미 아치·외관 변화·추가 나무, 건물 이름 라벨(HTML)
- **집:** 벽 2면·바닥(패턴 3종 × 2), 창문(Lv.2 커튼, Lv.3 정원 뷰), 가구 29종을 그리는 함수 9종, 슬롯 표시(점선 원 +)
- **정원:** 땅, 산책로, 풀, 울타리 덤불, 장식 13종을 그리는 함수 6종
- **캐릭터:** 6종 × 2단계, 기본 안내 캐릭터 '숲지기 등불', CSS 상태 애니메이션 10종
- **연출:** 반짝이(CSS), 진화 glow(CSS), 건물 누름 확대(CSS)
- **참고:** 미니 드라마 영상(`scripts/render_dramas.tsx`)의 인물·배경도 SVG입니다. 이번 범위에서는 제외하고 별도로 결정합니다.

이미지 기반으로 바꾸지 않는 것: 학습 화면 UI(카드·버튼·문제 풀이)는 계속 Tailwind로 그립니다.

## 3. 게임 로직과 그래픽을 분리할 수 있는가 — **가능합니다.** 대부분 이미 분리돼 있습니다.

| 계층 | 현재 위치 | 그래픽 의존 |
|---|---|---|
| 별·캐릭터·진화·발견·마을 단계 | `src/domain/game/state.ts` | 없음 (순수 함수) |
| 퀘스트 | `src/domain/game/quests.ts` | 없음 |
| 가구 구매·배치 검증·집 단계·공간 해금 | `src/domain/game/home.ts` | **일부 있음:** `HOUSE_SLOTS`/`GARDEN_SLOTS` 에 화면 좌표 `x, y` 가 들어 있음 |
| 가구 카탈로그 | `src/content/furniture.ts` | **일부 있음:** `colors`(SVG 색), `assetPath` 가 카테고리 단위 키 |
| 상태 저장 | `src/store/app.ts` (IndexedDB) | 없음. 저장 데이터는 id만 보관: `characters{id}`, `placements{slotId: itemId}`, `village.level`, `spaces` |

정리가 필요한 곳은 두 군데뿐입니다.
1. 슬롯 좌표를 도메인에서 빼서 그래픽 매니페스트로 옮깁니다. 도메인에는 `slotId`·`accepts`만 남깁니다.
2. `assetPath` 를 아이템별 실제 파일 키로 바꿉니다. 정적 콘텐츠라 저장 데이터와 무관합니다.

→ **저장된 사용자 데이터(학습 기록, 캐릭터, 별, 퀘스트 수령, 배치)는 형식이 바뀌지 않으므로 저장소 마이그레이션이 필요 없습니다.**

## 4. 이미지 에셋 적용 방식

**렌더링 구조.** 고정 논리 좌표계 무대(Stage) 위에 레이어별 `<img>` 를 절대 위치로 배치하고, 무대 전체를 화면 폭에 맞춰 `transform: scale()` 합니다.

```
<VillageScene>                         논리 크기 1080×1350 (4:5 세로형), 화면 폭에 맞춰 축소
  <VillageBackground layer=0>          배경(단계별 이미지)
  <VillageDecoration layer=10>         단계별 장식(가로등, 꽃밭 …) — y 기준 깊이 정렬
  <VillageBuilding layer=20+y>         건물 이미지 + 이미지와 별도인 터치 다각형(hitPolygon)
  <VillageCharacter layer=20+y>        스프라이트 시트 애니메이션, 이동 경로 다각형 안에서만 이동
  <EffectsLayer layer=900>             반짝이·탭 이펙트
  <QuestRewardOverlay layer=1000>      보상 연출 (게임·학습 화면 공용)
```

- **GameAssetManager** (`src/game/assets/`): JSON 매니페스트(파일명, 픽셀 크기, 기준점, 레이어, 터치 다각형, 스프라이트 프레임)를 읽습니다. 화면 진입 전에 필요한 묶음만 미리 받고(`preload(['village'])`), 로딩 진행률과 실패 처리를 맡습니다. 실패하면 "그래픽을 불러오지 못했어요 · 다시 시도" 화면을 띄웁니다. 임시 도형으로는 대체하지 않습니다.
- **터치 영역:** 이미지 투명 부분이 눌리지 않도록 매니페스트의 `hitPolygon` 으로 SVG `<polygon>` 투명 레이어를 만듭니다. 최소 44×44 CSS px를 보장합니다.
- **깊이 정렬:** 기준점(발밑) y 좌표로 `z-index` 를 매겨 캐릭터가 건물 앞뒤를 자연스럽게 지나가게 합니다.
- **캐릭터 이동:** `requestAnimationFrame` 으로 이동 다각형 안의 웨이포인트를 따라 걷습니다. 방향은 좌우 반전(`scaleX(-1)`)으로 처리합니다. `transform` 만 쓰고, 화면이 숨겨지면 멈춥니다.
- **포맷:** WebP(투명, 품질 85) 1x/2x `srcset`, 원본은 PNG로 보관합니다. 첫 화면 마을 묶음 목표는 1.5MB 이하입니다.
- **집 꾸미기:** 일반 모드에서는 슬롯을 숨기고, '꾸미기' 버튼으로 꾸미기 모드에 들어가야 슬롯 표시, 미리보기, 확정/취소를 씁니다. 가구를 바꾸면 해당 슬롯의 `<img src>` 가 실제 아이템 이미지로 바뀝니다.
- **기존 테스트 호환:** `data-testid`(bld-*, walker-*, slot-*, placed-*) 를 유지해서 E2E 13개를 그대로 회귀 테스트로 씁니다. 여기에 "매니페스트의 모든 파일이 존재하고, 실제 픽셀 크기가 명세와 일치하는지" 검사하는 테스트를 추가합니다.

## 5. 필요한 에셋 목록 (총 131개 파일 + 썸네일 자동 생성)

### 공통 규칙
- 시점: **2:1 아이소메트릭**(바닥 마름모 가로:세로 = 2:1, 약 26.565°). 광원은 좌상단, 그림자는 오른쪽 아래.
- 스타일: 따뜻한 파스텔 판타지, 부드러운 외곽선, 회화풍 질감(참고 이미지 분위기). 기존 게임의 캐릭터·건물·UI를 복제하지 않습니다.
- 배경을 뺀 모든 에셋은 **투명 배경 PNG(32bit)**, 여백은 상하좌우 16px 이하.
- **기준점(anchor):** 별도 표기가 없으면 *하단 중앙 = 바닥에 닿는 지점*입니다. 매니페스트에 `anchorX, anchorY`(px) 로 기록합니다.
- 크기는 **@2x 원본 기준**입니다. 1x는 빌드 때 자동 축소합니다.
- 파일명: 소문자 kebab-case, `{대상}-{변형}-{단계}.png`

### 5-1. 마을 (`public/assets/game/village/`, `buildings/`) — 우선 제작 대상

| 파일 | 크기(px) | 투명 | 기준점 | 레이어 | 설명 |
|---|---|---|---|---|---|
| village/bg-stage1.png | 2160×2700 | 아니요 | 좌상단(0,0) | 0 | 1단계: 하늘·먼 산·숲·땅·길·연못. 건물·캐릭터 자리는 비워 둠 |
| village/bg-stage2.png | 2160×2700 | 아니요 | 좌상단 | 0 | 2단계: 꽃밭 확장·연못 연잎 |
| village/bg-stage3.png | 2160×2700 | 아니요 | 좌상단 | 0 | 3단계: 풍성한 자연·정원 입구 |
| buildings/home-stage1.png · -stage3.png | 520×560 | 예 | 하단 중앙 | 20+y | 나의 집 (3단계 외관: 꽃 화분·굴뚝 연기) |
| buildings/library-stage1.png · -stage3.png | 600×640 | 예 | 하단 중앙 | 20+y | 도서관 (3단계: 깃발·현수막) |
| buildings/wordforest-stage1.png · -stage3.png | 560×600 | 예 | 하단 중앙 | 20+y | 단어 숲 (나무 집 + 책 간판) |
| buildings/exam-stage1.png · -stage3.png | 560×620 | 예 | 하단 중앙 | 20+y | 시험장 (트로피 간판) |
| village/deco-flowerbed-a.png, -b.png | 220×140 | 예 | 하단 중앙 | 10+y | 꽃밭 장식 (장식 'flowers') |
| village/deco-bigtree.png | 360×460 | 예 | 하단 중앙 | 20+y | 큰 나무 ('tree') |
| village/deco-lamp.png | 80×240 | 예 | 하단 중앙 | 20+y | 가로등 (2단계, ×4 배치) |
| village/deco-lilypad.png | 160×80 | 예 | 중앙 | 5 | 연못 연잎 (2단계) |
| village/deco-bridge.png | 420×200 | 예 | 하단 중앙 | 15 | 연못 다리 ('pond-bridge') |
| village/deco-garden-arch.png | 220×260 | 예 | 하단 중앙 | 20+y | 정원 아치 (3단계/'garden') |
| village/deco-fence.png | 300×120 | 예 | 하단 중앙 | 10+y | 울타리 |
| village/label-plate.png | 9-slice 120×56 | 예 | 중앙 | 800 | 건물 이름표 배경 (글자는 HTML) |

### 5-2. 캐릭터 (`public/assets/game/characters/`)
6종(mossy, plip, lumi, cobi, whisk, stella) × Lv.1/Lv.2 + 안내 캐릭터 guide

| 파일 | 크기(px) | 투명 | 기준점 | 설명 |
|---|---|---|---|---|
| {id}-lv{1,2}-idle.png | 스프라이트 시트 4프레임 × 256×256 = 1024×256 | 예 | 프레임별 하단 중앙 | 숨쉬기 루프 (8fps) |
| {id}-lv{1,2}-walk.png | 6프레임 × 256×256 = 1536×256 | 예 | 하단 중앙 | 오른쪽 방향 걷기. 왼쪽은 좌우 반전 |
| {id}-lv{1,2}-react.png | 4프레임 × 256×256 | 예 | 하단 중앙 | 인사·정답 반응 (터치 시) |
| {id}-lv{1,2}-portrait.png | 512×512 | 예 | 중앙 | 도감·파트너 말풍선·획득/진화 모달용 정지 이미지 |
| guide-idle.png, guide-portrait.png | 1024×256 / 512×512 | 예 | 하단 중앙 / 중앙 | 숲지기 등불 |

→ 6종 × 2단계 × 4종 = 48 + 안내 2 = **50개.** 학습 UI 상태(정답·오답·힌트 등)는 1차에서 portrait + CSS 모션으로 처리하고, 상태별 이미지는 2차로 미룹니다.

### 5-3. 집 (`public/assets/game/house/`, `furniture/`)

| 파일 | 크기(px) | 투명 | 기준점 | 레이어 | 설명 |
|---|---|---|---|---|---|
| house/room-lv1.png · lv2.png · lv3.png | 2160×1728 | 아니요 | 좌상단 | 0 | 빈 방(벽 2면 + 바닥 + 창문 + 문). Lv.2 커튼, Lv.3 창밖 정원 |
| house/wall-basic.png · wall-mint.png · wall-flower.png | 2160×1728 | 예(벽 영역만) | 좌상단 | 1 | 방 이미지와 정확히 겹치는 벽지 오버레이 |
| house/floor-basic.png · floor-tile.png · floor-warm.png | 2160×1728 | 예(바닥 영역만) | 좌상단 | 2 | 바닥 오버레이 |
| furniture/{itemId}.png | 아래 표 | 예 | 하단 중앙(액자는 벽 부착점) | 10+y | 방 안 배치용. 모두 같은 각도(방 오른쪽 벽과 평행) |

가구 29종 (기본 2 + 판매 17 + 업적 보상 4 + 진화 특별 6, 벽지·바닥 제외):
`bed-old, bed-wood, bed-flower` (520×400) · `desk-small, desk-study` (360×320) · `chair-wood, chair-cushion, sp-mossy` (200×280) · `shelf-small, shelf-big, sp-cobi` (300×520) · `sofa-pink, sofa-green, sp-whisk` (480×320) · `lamp-stand, lamp-mushroom, lamp-star, sp-lumi` (160×400) · `rug-round, rug-check, rug-paw, sp-plip` (520×260, 기준점 중앙) · `plant-small, plant-monstera, plant-sprout` (160×320) · `frame-forest, frame-sea, frame-certificate, sp-stella` (200×160, 기준점 상단 중앙=벽 못)
→ 방 3 + 벽지 3 + 바닥 3 + 가구 29 = **38개.** 상점 썸네일(256×256)은 빌드 때 자동 생성합니다.

### 5-4. 정원 (`public/assets/game/garden/`)

| 파일 | 크기(px) | 투명 | 기준점 | 설명 |
|---|---|---|---|---|
| garden/bg.png | 2160×1728 | 아니요 | 좌상단 | 정원 바탕(잔디·산책로·울타리) |
| garden/bg-locked.png | 2160×1728 | 아니요 | 좌상단 | 잠긴 정원(덩굴 문) |
| garden/{itemId}.png | 아래 | 예 | 하단 중앙 | 장식 13종 |

`g-bed-tulip, g-bed-daisy, g-bed-lavender` (360×220) · `g-tree-cherry, g-tree-apple, g-tree-maple` (400×520) · `g-bench-wood, g-bench-white` (360×240) · `g-fountain` (440×420) · `g-light-lamp, g-light-firefly` (120×360) · `g-path-stone` (360×180) · `g-arch` (320×400)
→ **15개**

### 5-5. 이펙트 (`public/assets/game/effects/`)

| 파일 | 크기 | 설명 |
|---|---|---|
| sparkle.png | 8프레임 × 128 = 1024×128 | 반짝임 (발견, 희귀 아이템) |
| tap-ring.png | 6프레임 × 192 | 건물 탭 링 |
| star-burst.png | 8프레임 × 256 | 별 획득 |
| levelup-glow.png | 8프레임 × 512 | 진화 광채 |
| reward-rays.png | 1024×1024 | 퀘스트 보상 배경 빛줄기 (회전) |
| confetti.png | 12프레임 × 256 | 축하 |
| slot-marker.png | 128×128 | 꾸미기 모드 빈 슬롯 표시 |
| icon-star.png | 128×128 | 별 재화 아이콘 |

→ **8개**

합계: 마을 20 + 캐릭터 50 + 집 38 + 정원 15 + 이펙트 8 = **131개 파일.**

### 5-6. 매니페스트 예시 (`public/assets/game/manifest.json`)
```json
{
  "village": {
    "stage": { "width": 1080, "height": 1350 },
    "background": { "1": "village/bg-stage1.webp", "2": "village/bg-stage2.webp", "3": "village/bg-stage3.webp" },
    "buildings": [
      { "id": "library", "route": "/grammar", "x": 790, "y": 610,
        "image": { "1": "buildings/library-stage1.webp", "3": "buildings/library-stage3.webp" },
        "size": [300, 320], "anchor": [150, 315],
        "hitPolygon": [[650,600],[790,530],[930,600],[930,380],[790,300],[650,380]], "label": [790, 640] }
    ],
    "walkArea": [[380,700],[700,700],[760,860],[320,860]]
  }
}
```

## 6. 기존 기능에 영향을 주지 않는 마이그레이션 계획

| 단계 | 작업 | 기존 기능 보호 장치 |
|---|---|---|
| 0. 준비 | `src/game/` 폴더 신설: `GameAssetManager`, `manifest` 타입, 스프라이트 애니메이터. `CelebrationLayer` 에서 `QuestRewardOverlay` 분리 | 도메인·스토어 변경 없음. 단위 85 + E2E 13 그대로 통과해야 진행 |
| 1. **마을 (먼저 완성)** | `VillageScene · VillageBackground · VillageBuilding · VillageCharacter` 구현, 마을 에셋 20개 + 캐릭터 50개 적용 → 고품질 확인 후 다음 단계 | 같은 `data-testid`, 라우팅·터치 E2E 회귀, 360~768px 레이아웃 테스트, 60fps 측정 |
| 2. 집 | `HouseScene · HouseFurniture`, 일반/꾸미기 모드 분리, 슬롯 좌표를 매니페스트로 이전 | `placements{slotId:itemId}` 형식 유지 → 저장 데이터 그대로. 구매·배치·복원 E2E 회귀 |
| 3. 정원 | `GardenScene · GardenDecoration` | 해금 조건은 기존 `SPACES.garden` 로직 그대로 |
| 4. 정리 | 게임 화면에서 SVG 도형 컴포넌트 제거. 학습 UI 캐릭터를 portrait 이미지로 교체 | 에셋 존재·크기 검사 테스트 추가 |

롤백: 단계마다 별도 커밋으로 진행합니다. 에셋이 없는 단계는 착수하지 않습니다. 임시 도형을 최종 결과로 내지 않습니다.

## 7. 에셋 확보 방법 (결정 필요)

| 방법 | 품질·일관성 | 권리 | 비고 |
|---|---|---|---|
| A. 일러스트레이터 외주 / 직접 제작 | 가장 높음 | 계약으로 명확 | 이 문서를 그대로 작업 지시서로 사용 |
| B. AI 이미지 생성 (세션의 이미지 생성 도구 또는 사용자 도구) | 장면 단위는 좋으나, 각도·크기·캐릭터 일관성과 투명 배경은 후처리 필요 | 생성 도구 약관상 상업적 이용 가능 여부를 사용자가 확인해야 함 | 마을 1장면으로 시험 제작 후 판단 권장 |
| C. 상업용 에셋 팩 구매 | 중간 (스타일 혼합 위험) | 라이선스별로 '앱 내 재배포' 허용 확인 필요 | 오리지널 캐릭터와 화풍을 맞추기 어려움 |
