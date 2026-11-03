# 혼자영어 (가칭) · Wordlings

영어를 공부할수록 캐릭터를 모으고, 나만의 집·정원·마을이 자라는 모바일 우선 영어 독학 RPG 웹앱 (CEFR A1 콘텐츠 우선).

- 기획·설계: [`docs/PLANNING.md`](docs/PLANNING.md)
- QA 결과: [`docs/QA_REPORT.md`](docs/QA_REPORT.md)

## 실행

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 타입 검사 + 프로덕션 빌드 → dist/
npm run preview      # 빌드 결과 미리보기 (http://localhost:4173)
```

마이크·음성 인식은 **HTTPS 또는 localhost** 에서만 동작합니다. `dist/` 는 정적 파일이라 GitHub Pages·Netlify 등 아무 정적 호스팅에 올릴 수 있습니다(HashRouter, 상대 경로 base).

## 테스트

```bash
npm test             # 단위·콘텐츠·통합 테스트 (Vitest)
npm run test:e2e     # E2E (Playwright, 빌드 후 vite preview 자동 실행)
```

## 기술 구조

React 18 · TypeScript · Vite 6 · Tailwind CSS 3 · React Router(Hash) · Zustand(persist → IndexedDB)

```
src/
  domain/            # 순수 비즈니스 로직 (UI·저장소 무관)
    learning/        # 채점, 간격 반복(SRS), 학습량 조절, 숙련도
    game/            # 별·캐릭터·진화·마을(state), 퀘스트(quests), 집·정원·공간(home)
    speech/          # STT 단어 비교, 발음 평가 확장 인터페이스
  content/           # 학습 콘텐츠 데이터 (문법·단어·대화·표현·드라마·캐릭터·가구)
  store/app.ts       # 학습 이벤트 → 보상·발견·진화·마을·집 연동, IndexedDB 저장·마이그레이션
  components/        # UI, 캐릭터·마을·집·가구 SVG 에셋
  screens/           # 화면
public/audio, video  # 생성된 음성·영상 에셋
scripts/             # 음성·IPA·영상 생성 스크립트
tests/, e2e/         # Vitest / Playwright
```

## 에셋 생성 (재생성 시)

- 음성: Piper TTS + LibriTTS 모델(데이터셋 CC BY 4.0)을 `PIPER_DIR` 에 두고 `npx tsx scripts/export-audio-manifest.ts && python3 scripts/generate_audio.py` (기존 파일은 건너뜀). **합성 음성이며 원어민 녹음이 아닙니다.**
- 발음기호: `pip install cmudict && python3 scripts/gen_ipa.py` (CMU Pronouncing Dictionary, BSD)
- 미니 드라마: `npx tsx scripts/render_dramas.tsx` (ffmpeg, sharp 필요). 대본·그림 모두 자체 제작, 제3자 영상 미사용.

## 라이선스·출처

- 음성 모델 학습 데이터: LibriTTS (Zen et al., CC BY 4.0, openslr.org/60) — 앱 MY 화면에 출처 표기
- 발음 사전: CMU Pronouncing Dictionary (BSD)
- 캐릭터·마을·가구·영상 그림: 프로젝트 자체 제작 SVG
- 환경변수·비밀키 없음
