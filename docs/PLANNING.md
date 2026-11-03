# 혼자영어(가칭) · Wordlings — 기획·설계 문서

> 상태 구분: **기획 완료 / 디자인 완료(코드 기반 SVG) / 개발 완료(MVP 범위) / QA: 자동화 완료 · 전문가 콘텐츠 검수 미진행 · 실사용자 테스트 미진행**

## 1. 서비스 IA

```
앱 실행
├─ 온보딩: 학습 목적 → 학습 목표 설정(현재 수준·하루 10/20/30분·학습량·알림) → 레벨 진단 → 진단 결과
└─ 영어 마을 홈 (A1 시작의 숲)
   ├─ 상단: 마을 단계 · 레벨 · 오늘 진도 · 복습 예정 · 별
   ├─ 마을(터치 가능한 건물 4개)
   │  ├─ 나의 집 → 집 꾸미기 · 가구 상점 · 보관함 · 비밀 정원 · 대표 파트너
   │  ├─ 도서관 → 문법 강의(10단원) · A1 독해 · A2~B2(준비 중)
   │  ├─ 단어 숲 → 단원별 영단어 · 단어 퀴즈
   │  └─ 시험장 → 단원 평가 · A1 종합평가 · 레벨 진단 다시 하기
   ├─ 퀘스트 게시판(일일·주간·업적·공간 개방)   ├─ 공간 지도(정원·온실·호숫가·향후 공간)
   ├─ 자유학습: 단어·문법·듣기·말하기·독해·영작·표현 학습관
   ├─ 표현 학습관: 필수회화·여행·비즈니스·구동사/숙어·상황별 듣기말하기·영상 속 영어
   ├─ 오답노트(영역 필터) · 실력 분석(학습 시간·영역 현황·취약 개념/어휘) · 학습 기록
   └─ 하단 고정: 오늘의 복습 · 이어서 공부하기 · 도감 · 학습 기록 · MY
```

## 2. 핵심 사용자 플로우

1. **하루 학습**: 예정된 복습 → 신규 영단어 → 문법 강의 → 확인 문제 → 대화 듣기 → 따라 말하기 → 영작 → 종합 테스트 → 퀘스트 보상
2. **학습 → 게임 루프**: 학습 완료 이벤트 → (XP·발견 조건·마을 단계·집 단계 갱신) → 퀘스트 완료 → 별·아이템 수령 → 가구 구매·배치 → 집 Lv.2 → 정원 개방 퀘스트 → 정원 꾸미기
3. **캐릭터**: 학습 성취(첫 단어 10개/첫 문법/첫 듣기/말하기 5문장) → 발견 이벤트 → 퀴즈 3문제 중 2개 정답 → 획득·도감 등록 → 첫 캐릭터 자동 파트너 → 서로 다른 날 복습 + XP → 진화 + 특별 가구
4. **다음 날**: 홈 복습 우선 추천 → 복습(단계별 문항 유형 순환) → 다음 복습일 갱신 → 학습량 조절 추천(수락/직접 설정) → 신규 학습

## 3. 기능 정의 (요약)

| 영역 | 기능 | 구현 위치 |
|---|---|---|
| 진단 | A1~B2 20문항, 레벨별 정답률, 문법·어휘만 평가(듣기·말하기 미평가 명시) | `screens/Onboarding.tsx`, `content/reading-leveltest.ts` |
| 영단어 | 철자·품사·뜻·IPA·한글 발음·CEFR·발음 듣기·예문/해석·관련 문법·학습 상태·다음 복습일, 퀴즈 5유형(뜻/영어/빈칸/문장 속 의미/듣고 고르기) | `screens/Words.tsx`, `lib/questions.ts` |
| 문법 | 목표·쉽게/자세히·용어 풀이·구조 분석·예문(+더 보기)·비교·실수·이해가 안 돼요/파트너에게 물어보기(사전 작성 설명, AI 아님)·연습15·영작3·평가8 | `screens/Grammar.tsx` |
| 듣기 | 실제 mp3, 재생/일시정지/반복/0.75~1.2x, 스크립트 숨김, 해석, 이해도 문제, 받아쓰기, 재청취 추천 | `screens/Listening.tsx` |
| 말하기 | 예시 음성, 녹음 동의, 녹음(MediaRecorder), STT(Web Speech), 누락/추가/다르게 인식 표시, 다시 말하기, 미지원·권한 거부 처리, 발음 평가는 '준비 중' 인터페이스 | `screens/Speaking.tsx`, `domain/speech/*` |
| 읽기·쓰기 | A1 지문 3편, 단어 배열·빈칸·한→영 영작(복수 정답·축약형 동일 처리) | `screens/Study.tsx`, `screens/Grammar.tsx` |
| 표현 학습관 | 6카테고리, 레벨 필터·검색·저장(복습 등록)·완료 상태, 표현별 뜻·뉘앙스·상황·발음·대화·듣기 문제·따라 말하기·응용 영작 | `screens/Expressions.tsx` |
| 영상 영어 | 오리지널 미니 드라마 3편(38~42초), EN/KO 자막 토글, 구간 반복, 쉐도잉, 이해도 문제, 권리 확인 기록 | `screens/Video.tsx`, `scripts/render_dramas.tsx` |
| 복습 | 0·1·3·7·14·30일, 정답률별 단계 조정, 중복 생성 방지, 우선순위·15개 분할, 건너뛰기 | `domain/learning/srs.ts` |
| 캐릭터 | 6종×2단계, 발견·획득·도감·파트너·진화(XP 60 + 서로 다른 2일 복습 + 정답률 70%) | `domain/game/state.ts` |
| 퀘스트·별 | 일일6·주간3·업적7·공간1, 상태 5종, 1회 수령, 별 거래 기록, 음수 불가 | `domain/game/quests.ts` |
| 집·정원 | 가구29·벽지3·바닥3·정원13, 상점·보관함·슬롯 배치(미리보기/취소/확정/비우기), 집 Lv.1~3, 정원 해금·꾸미기·산책 | `domain/game/home.ts`, `screens/HomeDecor.tsx` |
| 마을 | 아이소메트릭 SVG, 건물 4개 터치 이동, 이동 영역 제한, 3단계 성장 + 장식 6종 | `components/Village.tsx` |

## 4. 화면 목록 (구현 40개 라우트)

학습: 온보딩 · 학습 목표 설정 · 레벨 진단 · 진단 결과 · 오늘의 학습 · 단어 숲 · 영단어 학습 · 영단어 퀴즈 · 도서관 · 문법 강의 · 문법 문제 · 영작 · 단원 평가 · 듣기 목록/학습 · 말하기 목록/학습 · 독해 목록/학습 · 학습 결과(공통) · 복습 · 오답노트 · 자유학습 · 실력 분석 · 학습 기록 · 표현 학습관/목록/상세/저장/상황 대화 · 영상 학습
게임: 영어 마을 홈 · 캐릭터 발견 · 획득(모달) · 도감 · 상세 · 대표 파트너 · 진화(성장) · 퀘스트 목록 · 퀘스트 완료/보상 수령(모달) · 나의 집 · 가구 상점 · 보관함 · 가구 배치(집 화면 내 시트) · 집 성장(집 화면) · 비밀 정원 · 정원 꾸미기 · 공간 해금 스토리(모달) · 잠긴 공간 안내(공간 지도) · 시험장 · MY/설정

## 5. 데이터 모델 (요청서 명칭 → 구현 타입)

| 요청서 | 구현 | 파일 |
|---|---|---|
| UserLearningProfile | `Profile` + `Settings` | store/app.ts, domain/types.ts |
| CurriculumUnit / GrammarLesson | `CurriculumUnitOutline` / `GrammarUnit` | domain/types.ts |
| VocabularyItem | `Vocabulary` | domain/types.ts |
| LearningQuestion / LearningAttempt | `Question` / `UserAnswer` | domain/types.ts |
| ReviewSchedule | `ReviewItem` (key=`kind:refId` 유일) | domain/learning/srs.ts |
| WrongAnswer | `WrongNote` | domain/types.ts |
| LearningProgress | `LearningState.steps/log/learnedWords/studySeconds` | store/app.ts |
| CharacterDefinition / UserCharacter / CharacterEvolution | `Character` / `UserCharacter(level, xp, leveledUpOn)` / `growthCheck` | content/characters.ts |
| PartnerSelection | `GameState.partnerId` | domain/game/state.ts |
| QuestDefinition / UserQuestProgress / QuestRewardClaim | `QuestDef` / `questContext()`(실제 기록에서 계산) / `questClaims[claimKey]` | domain/game/quests.ts |
| CurrencyTransaction | `StarTx` (`game.stars[eventId]`) | domain/game/state.ts |
| FurnitureItem / UserInventory | `FurnitureItem` / `HomeState.inventory` | domain/game/home.ts |
| House / HousePlacement / GardenPlacement / HouseGrowth | `HomeState.placements.house/garden`, `houseLevel`, `decorateCount` | domain/game/home.ts |
| SpaceDefinition / SpaceUnlockCondition / UserSpaceProgress | `SpaceDef.conditions` / `HomeState.spaces` | domain/game/home.ts |
| VillageGrowthState | `VillageProgress(level, unlocked)` | domain/game/state.ts |

데이터 원칙: 모든 보상은 고유 eventId(`vocab10:3`, `quest:d-words:2026-11-03`, `buy:sofa-pink` …)로 1회만 처리. 별 소비는 잔액 확인 후에만. 미보유 아이템·캐릭터 사용 불가. 공간·마을·집 단계는 단조 증가. 저장은 IndexedDB(zustand persist, 버전 3 + 마이그레이션 + 손상 데이터 백업 후 복구). 백엔드(Supabase 등) 연동 시 `store/app.ts` 의 storage 어댑터만 교체하면 되도록 도메인 로직(순수 함수)과 분리.

## 6. 커리큘럼

A1 10단원(인칭대명사 → be동사 → 일반동사 → 현재시제 → 부정문 → 의문문 → 관사 → 기초 전치사 → can → 기초 문장 만들기), 선행 단원 지정. 단원당 단어 30·대화 1·말하기 3. A2(8)·B1(7)·B2(6) 단원 목록은 '준비 중'.

## 7. 캐릭터 수집·성장 정책

| 캐릭터 | 희귀도 | 관련 개념 | 획득 조건 |
|---|---|---|---|
| 모시(이끼곰 정령) | 일반 | 인칭대명사 | 첫 영단어 10개 학습 → 발견 퀴즈 |
| 플립(물방울 개구리) | 일반 | be동사 | 첫 문법 강의+확인 문제 → 발견 퀴즈 |
| 루미(반딧불 버섯) | 일반 | 일반동사 | 첫 듣기 수업 → 발견 퀴즈 |
| 코비(솔방울 고슴도치) | 일반 | 부정문 | 서로 다른 말하기 문장 5개 → 발견 퀴즈 |
| 위스크(구름 여우) | 희귀 | 의문문 | 첫 단원 평가 통과 (확정) |
| 스텔라(별빛 사슴) | 특별 | 기초 문장 | A1 종합평가 80% 이상 (확정) |

XP(대표 파트너에게, 이벤트당 1회): 신규 단어 10개마다 5 · 문법 강의+확인 10 · 듣기 5 · 말하기 5 · 독해 5 · 표현 3 · 영상 5 · 단원 평가 10 · 오늘의 복습 완료 20(하루 1회) · 주간 퀘스트 15. 진화: XP 60 + 관련 개념을 **서로 다른 2일 이상 복습** + 최근 정답률 70%. 진화 시 외형 변경·애니메이션·도감 갱신·특별 가구 지급·새 대사.

## 8. 퀘스트·별·집·정원·마을 정책

- 일일: 단어10(★10) · 문법1강(★15) · 듣기1(★10) · 말하기5문장(★10) · 오늘 복습(★20, 대상 없으면 잠김) · 표현1(★15)
- 주간(월요일 시작): 서로 다른 3일(★40) · 문법 3단원(★40) · 듣기·말하기 5회(★40)
- 업적: 첫 학습 · 첫 단원 평가 · 첫 캐릭터 · 첫 진화 · 첫 구매 · 첫 꾸미기 · 첫 정원 개방 (별 + 테마 아이템)
- 공간 개방: 비밀 정원(★20 + 튤립 꽃밭)
- 단원 평가 첫 통과 ★10, A1 종합평가 통과 ★30
- 집: Lv.1 낡은 작은 방 → Lv.2 새 가구 3개 배치 + 문법 2단원 → Lv.3 정원 개방 (Lv.4·5 준비 중). 가구를 빼도 내려가지 않음
- 정원 해금: 문법 3단원 + 꾸미기 3회 + 집 Lv.2 → 공간 개방 퀘스트 수령 시 개방
- 온실(문법 6단원·정원 장식 4·공간 퀘스트) · 호숫가(문법 10단원·A1 80점): 조건 안내만, 이용 불가로 명시
- 마을 1단계(기본) → 2단계(문법 2강 + 단어 30: 꽃밭·연못 장식·가로등) → 3단계(정원 개방 또는 단원 평가 3개: 정원 아치·외관 변화·나무)

## 9. 디자인 시스템

- 학습 화면: White/Light Gray(#F5F6F8), 카드 18px 라운드, 버튼 44px 이상, Accent #E9513B (진한 강조 #B3361F), 파스텔 보조(mint/sky/butter/lilac/peach), Pretendard → 시스템 산세리프
- 게임 화면: 2D 아이소메트릭 SVG, 파스텔 자연 색감, 오리지널 캐릭터 6종×2단계, 가구 45종 SVG
- 반응형: 360/390/430/768px 검증, 최대 폭 560px 중앙 정렬, safe-area 대응

## 10. 마이크로 인터랙션

| 상황 | 동작 |
|---|---|
| 캐릭터 상태 | idle(숨쉬기) · walking(뒤뚱) · greeting/correct/completed(통통) · incorrect/hint(갸웃) · levelup(커짐+빛) |
| 마을 | 건물 누름 확대 → 이동, 캐릭터 이동(2.2s 보간)·방향 전환·터치 시 인사 말풍선 |
| 보상 | 토스트(별·XP·장식), 획득/진화 모달, 퀘스트 보상 모달, 스토리 모달(건너뛰기) |
| 학습 | 정답/오답 색 피드백 + 해설, 진도 바 전환 |
| 접근성 | transform/opacity 만 사용, `prefers-reduced-motion` + 앱 설정 '애니메이션 최소화'로 전부 정지 |

## 11. 향후 확장 계획

1. 교육 전문가 콘텐츠 검수 → 상태를 '검수 완료/공개 가능'으로 전환
2. A2 커리큘럼 콘텐츠 제작, 온실·호숫가·작업실 공간 구현
3. 원어민 녹음 또는 상용 TTS 교체, 발음 평가 API(`PronunciationAssessor`) 연결
4. Supabase 동기화(기기 변경 시 데이터 보존), Capacitor Android 앱 + 로컬 푸시 알림
5. 자유 영작 의미 평가(검증된 기술 확보 시에만)
