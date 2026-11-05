// ───────────────────────────── 콘텐츠 (정적 데이터) ─────────────────────────────
export type Level = 'A1' | 'A2' | 'B1' | 'B2';

/** 콘텐츠 검수 상태 — 교육 전문가 검수 없이 'published' 로 두지 않는다. */
export type ContentReviewStatus = 'drafting' | 'auto-verified' | 'expert-review-needed' | 'expert-reviewed' | 'published';

export type QuestionType =
  | 'mc' // 객관식
  | 'blank' // 빈칸 채우기 (직접 입력)
  | 'order' // 단어 배열
  | 'translate' // 문장 해석 (객관식)
  | 'writing' // 정답형 영작
  | 'dictation'; // 받아쓰기

export interface Question {
  id: string;
  type: QuestionType;
  /** 문제 지시문 (한국어) */
  prompt: string;
  /** 문제에 보여줄 영어/한국어 문장. 빈칸은 ___ */
  sentence?: string;
  choices?: string[];
  /** 인정되는 모든 정답 (복수 정답). mc/translate 는 choices 중 하나와 같아야 한다. */
  answers: string[];
  /** 단어 배열용 조각 (정답 순서와 무관하게 섞어서 표시) */
  tokens?: string[];
  explanation: string;
  /** 연결된 개념 (문법 단원 id) */
  conceptId: string;
  /** 듣기 문제용 음성 */
  audio?: string;
  hint?: string;
}

export interface Example {
  en: string;
  ko: string;
  audio?: string;
}

export interface Vocabulary {
  id: string;
  word: string;
  pos: string; // 품사 (한국어 약어: 명, 동, 형, 부, 대, 전, 접, 감, 조)
  meaning: string;
  ipa: string;
  koPron: string; // 한글 발음 참고
  example: string;
  exampleKo: string;
  grammarId: string; // 관련 문법 단원
  /** 단어와 문법을 잇는 패턴 (예: can't afford to ~) */
  pattern?: string;
  audio: string;
  exampleAudio: string;
  /** 영단어 사전(초·중·고급) 단어의 CEFR 레벨 */
  level?: string;
}

export interface GrammarUnit {
  id: string;
  level: Level;
  order: number;
  title: string;
  titleEn: string;
  goal: string[];
  /** 쉽게 설명하기 */
  easy: string;
  /** 자세히 설명하기 */
  detail: string;
  terms: { term: string; plain: string }[];
  structure: { pattern: string; parts: { label: string; text: string }[]; note?: string }[];
  examples: Example[];
  moreExamples: Example[];
  compare: { title: string; body: string; examples: Example[] };
  mistakes: { wrong: string; right: string; why: string }[];
  /** '이해가 안 돼요' / '파트너에게 물어보기' — 검수된 보충 설명 */
  helpTips: string[];
  practice: Question[]; // 단계별 연습문제 (확인 문제)
  writing: Question[]; // 영작
  unitTest: Question[]; // 단원 마무리 테스트
  prerequisites: string[];
  reviewStatus: ContentReviewStatus;
}

export interface CurriculumUnitOutline {
  id: string;
  level: Level;
  title: string;
  available: boolean;
}

export interface DialogueLine {
  speaker: 'A' | 'B';
  name: string;
  en: string;
  ko: string;
  audio: string;
}

export interface Dialogue {
  id: string;
  level: Level;
  title: string;
  titleEn: string;
  grammarId: string;
  situation: string;
  lines: DialogueLine[];
  audio: string; // 전체 대화 음성
  keyWords: { word: string; meaning: string }[];
  keyExpressions: Example[];
  questions: Question[]; // 듣기 이해도
  dictation: Question[]; // 빈칸 받아쓰기 (type: 'dictation')
  reviewStatus: ContentReviewStatus;
}

export interface SpeakingSentence {
  id: string;
  level: Level;
  en: string;
  ko: string;
  grammarId: string;
  tip: string;
  audio: string;
}

export interface Reading {
  id: string;
  level: Level;
  title: string;
  grammarId: string;
  paragraphs: Example[];
  questions: Question[];
}

export interface LevelTestQuestion extends Question {
  level: Level;
}

// ───────────────────────────── 사용자 학습 데이터 ─────────────────────────────
export type ReviewKind = 'word' | 'grammar' | 'dialogue' | 'speaking' | 'reading' | 'expression';

export interface UserAnswer {
  id: string; // 고유 응답 id
  questionId: string;
  conceptId: string;
  correct: boolean;
  given: string;
  date: string; // YYYY-MM-DD (로컬)
  at: number; // epoch ms
  source: 'lesson' | 'review' | 'test' | 'listening' | 'speaking' | 'level-test' | 'discovery' | 'free' | 'reading' | 'expression' | 'video';
}

export interface ReviewItem {
  key: string; // `${kind}:${refId}` — 항목당 하나 (중복 방지)
  kind: ReviewKind;
  refId: string;
  conceptId: string;
  stage: number; // 0..5 → INTERVALS 인덱스
  due: string; // YYYY-MM-DD
  createdOn: string;
  lastReviewedOn?: string;
  correct: number;
  wrong: number;
  lapses: number; // 연속/반복 오답 횟수
  difficult: boolean;
  history: { date: string; accuracy: number }[];
}

export interface WrongNote {
  questionId: string;
  conceptId: string;
  firstWrongOn: string;
  lastWrongOn: string;
  wrongCount: number;
  lastGiven: string;
  resolved: boolean;
  source: UserAnswer['source'];
  /** 듣기/말하기 오답일 때 재청취·재연습 대상 */
  relatedRef?: string;
}

export interface SpeakingAttempt {
  sentenceId: string;
  date: string;
  at: number;
  recognized: string | null; // STT 미지원/실패 시 null
  matchedWords: number;
  totalWords: number;
  missing: string[];
  extra: string[];
  substituted: { expected: string; heard: string }[];
  mode: 'stt' | 'self-check';
}

export type StepKind = 'words' | 'grammar' | 'practice' | 'listening' | 'speaking' | 'writing' | 'test';

export interface StudyLogEntry {
  id: string;
  date: string;
  at: number;
  kind: StepKind | 'review' | 'reading' | 'level-test' | 'free' | 'a1-exam' | 'expression' | 'situation' | 'video' | 'book' | 'mywords';
  refId: string;
  title: string;
  correct: number;
  total: number;
  /** 확인 문제: 강의 열람 + 전체 문항 수행으로 완료 인정됐는지 */
  completed?: boolean;
}

export interface Settings {
  dailyNewWords: number;
  notificationsOn: boolean;
  notifyTime: string; // HH:mm
  reduceMotion: boolean;
  recordingConsent: boolean;
  speechRate: number;
}

// ───────────────────────────── 게임 데이터 ─────────────────────────────
export type Rarity = 'common' | 'rare' | 'special';

export type CharacterAnimState =
  | 'idle' | 'walking' | 'greeting' | 'studying' | 'correct' | 'incorrect' | 'hint' | 'review' | 'completed' | 'levelup';

export interface Character {
  id: string;
  name: string;
  species: string;
  look: string;
  personality: string;
  conceptId: string;
  conceptLabel: string;
  rarity: Rarity;
  acquireRule: string;
  palette: { body: string; accent: string; cheek: string };
  lines: Partial<Record<CharacterAnimState, string[]>>;
}

export interface UserCharacter {
  id: string;
  acquiredOn: string;
  level: 1 | 2;
  xp: number;
  leveledUpOn?: string;
}

export type RewardType = 'growth-xp' | 'character' | 'item';

export interface RewardTransaction {
  eventId: string; // 고유 학습 이벤트 id — 중복 지급 방지 키
  type: RewardType;
  amount: number;
  characterId?: string;
  reason: string;
  at: number;
}

export interface DiscoveryState {
  /** 학습 성취로 발견 이벤트가 열린 캐릭터 */
  unlocked: string[];
  /** 퀴즈 실패 후 재학습이 필요한 캐릭터 → 실패일 */
  restudy: Record<string, string>;
  attempts: number;
}

export type DecorationId = 'flowers' | 'tree' | 'library-banner' | 'residents' | 'garden' | 'pond-bridge';

export interface VillageProgress {
  unlocked: DecorationId[];
  seen: DecorationId[]; // 새로 생긴 장식 알림용
  level: 1 | 2 | 3;
}
