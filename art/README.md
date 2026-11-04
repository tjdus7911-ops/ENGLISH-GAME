# art/ — 디자인 원본 (배포 제외)

- `sheets/` Figma AI 생성 원본 시트 34장 (기존 20 + 신규 14: 진화형 6 · 기본형 행동 6 · 온실/호숫가 콘셉트 2). 배경 마젠타(#FF00FF)는 원본 그대로.
- `game/` `scripts/process_assets.py` 로 분리한 **투명 PNG** (앱은 `public/assets/game/*.webp` 사용)
- `mockups/` 실제 React 장면 컴포넌트를 `harness.html` 로 렌더한 시안 (`node scripts/render_mockups.cjs art/mockups`, dev 서버 5199 필요)

재생성: `python3 scripts/process_assets.py art/sheets`
