/**
 * 단어 숲 주제·난이도 분류 (기존 A1 300단어에 태그만 추가 — 단어 DB·학습 기록은 그대로)
 * - 한 단어가 여러 주제에 들어갈 수 있다. 학습 기록은 단어 id 하나로 통합 관리된다.
 * - 난이도: 현재 DB 는 모두 A1 범위. 그중 가장 기초적인 단어를 Pre-A1(왕초보)로 표시한다.
 *   A2·B1·B2+ 단어는 아직 없으므로 화면에서 '준비 중'으로만 보이고 학습 가능한 것처럼 표시하지 않는다.
 * - id 규칙: 소문자 + 공백→하이픈, 같은 철자 두 번째 품사는 접미사(open-adj, park-v, clean-adj)
 */
export type TopicId = 'people' | 'food' | 'home' | 'feelings' | 'travel' | 'talk' | 'shopping' | 'nature' | 'core';
export type WordLevel = 'pre-a1' | 'a1' | 'a2' | 'b1' | 'b2';

export const LEVELS: { id: WordLevel; label: string; cefr: string; desc: string }[] = [
  { id: 'pre-a1', label: '왕초보', cefr: 'Pre-A1', desc: '처음 시작하는 기본 단어' },
  { id: 'a1', label: '기초', cefr: 'A1', desc: '일상생활 필수 단어' },
  { id: 'a2', label: '초급', cefr: 'A2', desc: '익숙한 상황을 말하는 단어' },
  { id: 'b1', label: '중급', cefr: 'B1', desc: '생각과 경험을 말하는 단어' },
  { id: 'b2', label: '고급', cefr: 'B2~C2', desc: '깊이 있는 표현 (내부 B2·C1·C2 구분)' },
];

export const TOPICS: { id: TopicId; label: string; emoji: string; tint: string; desc: string }[] = [
  { id: 'people', label: '사람과 가족', emoji: '👨‍👩‍👧', tint: 'bg-peach', desc: '가족·친구·직업' },
  { id: 'food', label: '음식과 음료', emoji: '🍎', tint: 'bg-accent-soft', desc: '먹고 마시는 것' },
  { id: 'home', label: '집과 생활', emoji: '🏠', tint: 'bg-butter', desc: '집·학교·하루 일과' },
  { id: 'feelings', label: '감정과 상태', emoji: '😊', tint: 'bg-lilac', desc: '기분·상태·성격' },
  { id: 'travel', label: '여행과 교통', emoji: '🚌', tint: 'bg-sky', desc: '장소·이동·길 찾기' },
  { id: 'talk', label: '일상 대화', emoji: '💬', tint: 'bg-mint', desc: '묻고 답하는 말' },
  { id: 'shopping', label: '쇼핑과 옷', emoji: '🛍', tint: 'bg-peach', desc: '사고팔기·가격·색깔' },
  { id: 'nature', label: '자연과 동물', emoji: '🌿', tint: 'bg-mint', desc: '날씨·계절·자연' },
];
export const CORE_TOPIC = { id: 'core' as const, label: '문장 만들기 필수 단어', emoji: '🧩', tint: 'bg-sky', desc: '대명사·의문사·전치사·접속사·핵심 동사' };

const L = (s: string) => s.trim().split(/\s+/);

export const TOPIC_WORDS: Record<TopicId, string[]> = {
  people: L(`friend family mother father brother sister baby name people man woman boy girl child parent husband wife son daughter
    grandmother neighbor classmate everyone together meet love student teacher doctor nurse artist engineer actor age job birthday kind honest young old tall short`),
  food: L(`eat drink cook have breakfast lunch dinner hungry thirsty meat fish milk sugar salt water coffee cup apple banana egg orange menu spicy delicious cafe kitchen table`),
  home: L(`home house apartment room kitchen table wall floor door window garden key clean clean-adj dirty wash brush sleep get-up live work study homework class school university
    library office book bag phone picture use open open-adj close fix carry start finish morning afternoon evening night day week weekend noon monday hour time early late
    always usually often sometimes never every quiet noisy heavy light play watch read write listen sing dance draw piano guitar hobby restroom smoke learn teach`),
  feelings: L(`happy sad tired hungry thirsty busy ready sick fine afraid sure worry care mind matter believe agree okay great good bad nice fun interesting important easy beautiful
    kind honest famous true right wrong like want need love favorite`),
  travel: L(`go come leave arrive take ride drive walk run car bike bus-stop station ticket seat street city country world far near visit stay wait park park-v umbrella fast slow
    hospital bank restroom address language chinese japanese here there swim fly`),
  talk: L(`call help thank know understand remember forget mean ask answer question problem idea speak listen repeat slowly again well anytime sure okay true right wrong free
    what where when who why how which number name meet agree believe mind try hear see find favorite`),
  shopping: L(`buy sell money price expensive cheap cost pay card bag much how-much how-many afford free color red blue big small long heavy light new old umbrella borrow ticket`),
  nature: L(`sun moon sky weather rain snow summer winter cold hot warm fish garden park world country fly swim jump beautiful light water`),
  core: L(`everyone together from in on at under next-to between behind in-front-of near can do have go come like want need make take use what where when who why how how-much
    how-many which because and but so or there here very always usually often sometimes never every much again well`),
};

/** 왕초보(Pre-A1): 가장 기본 단어. 나머지는 A1 */
export const PRE_A1 = new Set(L(`friend family mother father brother sister baby name man woman boy girl child happy sad hungry big small tall old new nice good bad cold hot
  eat drink go come like want have play read write listen sing dance run walk swim jump draw see sleep apple banana egg orange fish milk water meat book bag door window
  sun moon sky home house school park room table kitchen garden car bike phone red blue color morning night day what where who how in on under and but very here there
  can teacher student birthday number ride fly`));

export const CHAPTER_SIZE = 5;
