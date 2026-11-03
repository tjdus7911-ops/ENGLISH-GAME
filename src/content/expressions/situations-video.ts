import type { Dialogue, DialogueLine, Example, Level, Question } from '@/domain/types';
import { tts } from '../audio';
import CUES from './video-cues.json' with { type: 'json' };

type L = [speaker: 'A' | 'B', en: string, ko: string];
const C = 'expr-situation';

function mk(id: string, level: Level, title: string, titleEn: string, situation: string, names: [string, string], ls: L[],
  keyExpr: [string, string][], qs: [string, string[], string, string][], dictLine: number, dictSentence: string, dictAnswers: string[]): Dialogue {
  const lines: DialogueLine[] = ls.map(([speaker, en, ko]) => ({ speaker, name: speaker === 'A' ? names[0] : names[1], en, ko, audio: tts(en, speaker === 'A' ? 'f2' : 'm2') }));
  const questions: Question[] = qs.map(([prompt, choices, answer, explanation], i) => ({ id: `${id}-q${i + 1}`, type: 'mc', prompt, choices, answers: [answer], explanation, conceptId: C }));
  return {
    id, level, title, titleEn, grammarId: C, situation, lines,
    audio: `audio/dialogue-${id}.mp3`,
    keyWords: [],
    keyExpressions: keyExpr.map(([en, ko]): Example => ({ en, ko, audio: tts(en) })),
    questions,
    dictation: [{ id: `${id}-d1`, type: 'dictation', prompt: '잘 듣고 빈칸에 들어갈 단어를 쓰세요.', sentence: dictSentence, answers: dictAnswers, explanation: `정답: ${dictAnswers[0]}`, conceptId: C, audio: lines[dictLine].audio }],
    reviewStatus: 'expert-review-needed',
  };
}

/** 상황별 듣기·말하기 10개 */
export const SITUATIONS: Dialogue[] = [
  mk('sit-01', 'A2', '약국에서', 'At the Pharmacy', '감기약을 사러 약국에 갔어요.', ['Pharmacist', 'Customer'], [
    ['A', 'Hi. How can I help you?', '안녕하세요. 무엇을 도와드릴까요?'],
    ['B', 'I have a sore throat and a runny nose.', '목이 아프고 콧물이 나요.'],
    ['A', 'Do you have a fever?', '열이 있으세요?'],
    ['B', 'No, I don\'t.', '아니요, 없어요.'],
    ['A', 'Take this medicine three times a day after meals.', '이 약을 하루 세 번 식후에 드세요.'],
  ], [['I have a sore throat.', '목이 아파요.'], ['three times a day', '하루 세 번']],
    [['손님의 증상이 아닌 것은?', ['목 통증', '콧물', '열'], '열', '"No, I don\'t." — 열은 없어요.'], ['약은 언제 먹어야 하나요?', ['하루 두 번 식전', '하루 세 번 식후', '자기 전 한 번'], '하루 세 번 식후', '"three times a day after meals"']],
    4, 'Take this medicine three ___ a day after meals.', ['times']),
  mk('sit-02', 'A2', '호텔 방 문제', 'A Problem With the Room', '호텔 방 에어컨이 고장 났어요.', ['Guest', 'Front desk'], [
    ['A', 'Hello, this is room 512.', '여보세요, 512호인데요.'],
    ['B', 'Yes, how can I help?', '네, 무엇을 도와드릴까요?'],
    ['A', "The air conditioner doesn't work. It's really hot.", '에어컨이 안 돼요. 정말 더워요.'],
    ['B', "I'm sorry. I'll send someone right away.", '죄송합니다. 바로 사람을 보내 드릴게요.'],
    ['A', 'Thank you. How long will it take?', '감사해요. 얼마나 걸릴까요?'],
    ['B', 'About ten minutes.', '10분 정도요.'],
  ], [["It doesn't work.", '작동이 안 돼요.'], ["I'll send someone right away.", '바로 사람을 보내 드릴게요.']],
    [['무엇이 고장 났나요?', ['TV', '에어컨', '샤워기'], '에어컨', '"The air conditioner doesn\'t work."'], ['직원이 오기까지 얼마나 걸리나요?', ['5분', '10분', '30분'], '10분', '"About ten minutes."']],
    2, "The air conditioner doesn't ___.", ['work']),
  mk('sit-03', 'A2', '전화로 피자 주문', 'Ordering Pizza by Phone', '전화로 피자를 배달 주문해요.', ['Staff', 'Customer'], [
    ['A', "Tony's Pizza. What can I get for you?", '토니스 피자입니다. 뭘 드릴까요?'],
    ['B', "I'd like a large pepperoni pizza, please.", '라지 페퍼로니 피자 하나 주세요.'],
    ['A', 'Anything to drink?', '음료는요?'],
    ['B', 'Two colas, please. How long will it take?', '콜라 두 개요. 얼마나 걸려요?'],
    ['A', 'About thirty minutes. What is your address?', '30분 정도요. 주소가 어떻게 되세요?'],
    ['B', "It's 25 Park Street, apartment 3B.", '파크 스트리트 25번지 3B호예요.'],
  ], [["I'd like a large pepperoni pizza.", '라지 페퍼로니 피자 하나 주세요.'], ['Anything to drink?', '음료는요?']],
    [['주문한 피자 크기는?', ['스몰', '미디엄', '라지'], '라지', '"a large pepperoni pizza"'], ['콜라는 몇 개 주문했나요?', ['1개', '2개', '3개'], '2개', '"Two colas, please."']],
    4, 'About thirty ___.', ['minutes']),
  mk('sit-04', 'A2', '병원 예약', 'Making an Appointment', '전화로 진료 예약을 해요.', ['Receptionist', 'Patient'], [
    ['A', 'Good morning, City Clinic.', '안녕하세요, 시티 클리닉입니다.'],
    ['B', "Hi. I'd like to make an appointment.", '안녕하세요. 진료 예약을 하고 싶어요.'],
    ['A', 'Sure. Is tomorrow at two okay?', '네. 내일 2시 괜찮으세요?'],
    ['B', 'Sorry, I work then. How about Friday morning?', '죄송해요, 그때 일해요. 금요일 오전은 어때요?'],
    ['A', 'Friday at ten is available.', '금요일 10시 가능합니다.'],
    ['B', 'Perfect. Thank you.', '좋아요. 감사합니다.'],
  ], [["I'd like to make an appointment.", '예약을 하고 싶어요.'], ['How about Friday morning?', '금요일 오전은 어때요?']],
    [['처음 제안된 시간은?', ['내일 2시', '금요일 10시', '오늘 오후'], '내일 2시', '"Is tomorrow at two okay?"'], ['최종 예약 시간은?', ['금요일 9시', '금요일 10시', '목요일 10시'], '금요일 10시', '"Friday at ten is available."']],
    1, "I'd like to make an ___.", ['appointment']),
  mk('sit-05', 'A2', '분실물 센터', 'Lost and Found', '지하철에 가방을 두고 내렸어요.', ['Staff', 'Passenger'], [
    ['A', 'Lost and found. Can I help you?', '분실물 센터입니다. 도와드릴까요?'],
    ['B', 'Yes. I left my bag on the subway.', '네. 지하철에 가방을 두고 내렸어요.'],
    ['A', 'What does it look like?', '어떻게 생겼어요?'],
    ['B', "It's a small black backpack.", '작은 검은색 배낭이에요.'],
    ['A', 'Is this yours?', '이거 손님 거예요?'],
    ['B', "Yes, that's it! Thank you so much.", '네, 그거예요! 정말 감사해요.'],
  ], [['I left my bag on the subway.', '지하철에 가방을 두고 내렸어요.'], ['What does it look like?', '어떻게 생겼어요?']],
    [['승객이 잃어버린 것은?', ['지갑', '배낭', '우산'], '배낭', '"a small black backpack"'], ['가방의 색깔은?', ['검은색', '파란색', '빨간색'], '검은색', '"black backpack"']],
    1, 'I ___ my bag on the subway.', ['left']),
  mk('sit-06', 'A2', '은행에서', 'At the Bank', '은행에서 계좌를 만들어요.', ['Clerk', 'Customer'], [
    ['A', 'Next, please. How can I help you?', '다음 분이요. 무엇을 도와드릴까요?'],
    ['B', "I'd like to open an account.", '계좌를 개설하고 싶어요.'],
    ['A', 'Do you have your ID with you?', '신분증 가지고 오셨어요?'],
    ['B', 'Yes. Here is my passport.', '네. 여기 여권이요.'],
    ['A', 'Thank you. Please fill out this form.', '감사합니다. 이 양식을 작성해 주세요.'],
  ], [["I'd like to open an account.", '계좌를 개설하고 싶어요.'], ['Please fill out this form.', '이 양식을 작성해 주세요.']],
    [['손님이 은행에 온 목적은?', ['환전', '계좌 개설', '대출 상담'], '계좌 개설', '"open an account"'], ['손님이 보여 준 신분증은?', ['운전면허증', '여권', '학생증'], '여권', '"Here is my passport."']],
    4, 'Please ___ out this form.', ['fill']),
  mk('sit-07', 'A2', '헬스장 등록', 'Joining a Gym', '헬스장에 등록하려고 해요.', ['Staff', 'Visitor'], [
    ['A', 'Welcome! Are you interested in a membership?', '어서 오세요! 회원 등록에 관심 있으세요?'],
    ['B', 'Yes. How much is it a month?', '네. 한 달에 얼마예요?'],
    ['A', "It's fifty dollars a month. Classes are free.", '한 달에 50달러예요. 수업은 무료예요.'],
    ['B', 'What time do you open?', '몇 시에 여세요?'],
    ['A', "We're open from six a.m. to eleven p.m.", '오전 6시부터 오후 11시까지 열어요.'],
    ['B', 'Great. Can I try it today?', '좋네요. 오늘 체험해 볼 수 있어요?'],
  ], [['How much is it a month?', '한 달에 얼마예요?'], ['Can I try it today?', '오늘 체험해 볼 수 있어요?']],
    [['한 달 회비는?', ['30달러', '50달러', '15달러'], '50달러', '"fifty dollars a month"'], ['헬스장이 닫는 시간은?', ['오후 10시', '오후 11시', '자정'], '오후 11시', '"to eleven p.m."']],
    2, "It's fifty dollars a ___.", ['month']),
  mk('sit-08', 'A2', '공항 체크인', 'Airport Check-in', '공항 카운터에서 체크인해요.', ['Agent', 'Traveler'], [
    ['A', 'Good afternoon. Where are you flying today?', '안녕하세요. 오늘 어디로 가세요?'],
    ['B', 'To Tokyo. Here is my passport.', '도쿄요. 여기 여권이요.'],
    ['A', 'Do you have any bags to check?', '부치실 짐 있으세요?'],
    ['B', 'Just one suitcase.', '여행 가방 하나만요.'],
    ['A', 'Here is your boarding pass. Your gate is 23.', '탑승권 여기 있습니다. 게이트는 23번입니다.'],
  ], [['Do you have any bags to check?', '부치실 짐 있으세요?'], ['Here is your boarding pass.', '탑승권 여기 있습니다.']],
    [['여행자의 목적지는?', ['도쿄', '오사카', '방콕'], '도쿄', '"To Tokyo."'], ['탑승 게이트는?', ['13번', '23번', '32번'], '23번', '"Your gate is 23."']],
    3, 'Just one ___.', ['suitcase']),
  mk('sit-09', 'A2', '반품하기', 'Returning an Item', '산 셔츠를 반품하려고 해요.', ['Customer', 'Clerk'], [
    ['A', "Hi. I'd like to return this shirt.", '안녕하세요. 이 셔츠를 반품하고 싶어요.'],
    ['B', "Sure. What's wrong with it?", '네. 무슨 문제가 있나요?'],
    ['A', "It's too big for me.", '저한테 너무 커요.'],
    ['B', 'Do you have the receipt?', '영수증 있으세요?'],
    ['A', 'Yes, here it is.', '네, 여기요.'],
    ['B', 'Would you like a refund or an exchange?', '환불해 드릴까요, 교환해 드릴까요?'],
  ], [["I'd like to return this shirt.", '이 셔츠를 반품하고 싶어요.'], ['a refund or an exchange', '환불 또는 교환']],
    [['반품 이유는?', ['너무 작아서', '너무 커서', '색이 달라서'], '너무 커서', '"It\'s too big for me."'], ['직원이 요청한 것은?', ['신분증', '영수증', '카드'], '영수증', '"Do you have the receipt?"']],
    3, 'Do you have the ___?', ['receipt']),
  mk('sit-10', 'A2', '이웃과 인사', 'Meeting a Neighbor', '새로 이사 온 이웃과 엘리베이터에서 만났어요.', ['Neighbor', 'Newcomer'], [
    ['A', 'Hi! Are you new here?', '안녕하세요! 새로 이사 오셨어요?'],
    ['B', 'Yes. I just moved into 702.', '네. 702호에 막 이사 왔어요.'],
    ['A', "Welcome! I'm Grace from 705.", '환영해요! 저는 705호 그레이스예요.'],
    ['B', "Nice to meet you. I'm Daniel.", '만나서 반가워요. 저는 다니엘이에요.'],
    ['A', 'If you need anything, just knock on my door.', '필요한 거 있으면 그냥 문 두드리세요.'],
  ], [['I just moved into 702.', '702호에 막 이사 왔어요.'], ['If you need anything, just knock on my door.', '필요한 거 있으면 문 두드리세요.']],
    [['다니엘은 몇 호에 사나요?', ['702호', '705호', '507호'], '702호', '"I just moved into 702."'], ['그레이스가 제안한 것은?', ['같이 저녁 먹기', '필요하면 문 두드리기', '전화번호 교환'], '필요하면 문 두드리기', '"just knock on my door"']],
    1, 'I just ___ into 702.', ['moved']),
];

// ─────────────────────────── 오리지널 미니 드라마 (영상 속 영어) ───────────────────────────
export interface RightsRecord {
  source: 'self-produced' | 'ai-generated-licensed' | 'licensed-stock' | 'permission-granted';
  script: string;
  visuals: string;
  voices: string;
  music: string;
  producedOn: string;
  thirdPartyMaterial: boolean;
  notes: string;
}

export interface DramaCue { start: number; end: number; speaker: string; en: string; ko: string }

export interface MiniDrama {
  id: string;
  title: string;
  titleEn: string;
  level: Level;
  synopsis: string;
  grammarId: string;
  targetSeconds: [number, number];
  cast: { id: 'A' | 'B'; name: string; voice: 'f' | 'm' }[];
  script: { speaker: 'A' | 'B'; en: string; ko: string; scene: string }[];
  keyExpressions: { en: string; ko: string; note: string }[];
  questions: Question[];
  shadowing: number[]; // 쉐도잉 대상 대사 인덱스
  rights: RightsRecord;
  /** 렌더링된 영상 경로. 실제 파일이 없으면 null → '준비 중' */
  video: string | null;
  poster: string | null;
  cues: DramaCue[];
  durationSec: number | null;
}

const RIGHTS = (date: string): RightsRecord => ({
  source: 'self-produced',
  script: '앱 제작팀(Claude) 오리지널 대본 — 기존 영화·드라마 대사 인용 없음',
  visuals: '앱 자체 제작 SVG 일러스트를 코드로 렌더링 (외부 이미지 미사용)',
  voices: 'Piper TTS · LibriTTS 학습 모델 (데이터셋 CC BY 4.0) 합성 음성 — 실존 인물 음성 복제 아님',
  music: '음악 없음',
  producedOn: date,
  thirdPartyMaterial: false,
  notes: '공개 전 법무 검토 권장: TTS 모델 라이선스(CC BY 4.0) 출처 표기를 앱 정보 화면에 게시함.',
});

type CueMap = Record<string, { duration: number; cues: DramaCue[] }>;
const cueData = CUES as CueMap;

function drama(d: Omit<MiniDrama, 'video' | 'poster' | 'cues' | 'durationSec'>): MiniDrama {
  const c = cueData[d.id];
  return { ...d, video: c ? `video/${d.id}.mp4` : null, poster: c ? `video/${d.id}.jpg` : null, cues: c?.cues ?? [], durationSec: c?.duration ?? null };
}

const vq = (id: string, prompt: string, choices: string[], answer: string, explanation: string): Question =>
  ({ id, type: 'mc', prompt, choices, answers: [answer], explanation, conceptId: 'expr-video' });

export const DRAMAS: MiniDrama[] = [
  drama({
    id: 'drama-01', title: '첫 출근', titleEn: 'First Day', level: 'A2', grammarId: 'expr-video', targetSeconds: [30, 60],
    synopsis: '새 회사 첫날, 지우는 엘리베이터에서 팀장 마크를 만나요.',
    cast: [{ id: 'A', name: 'Jiwoo', voice: 'f' }, { id: 'B', name: 'Mark', voice: 'm' }],
    script: [
      { speaker: 'B', en: 'Good morning! Are you new here?', ko: '좋은 아침이에요! 새로 오셨어요?', scene: 'elevator' },
      { speaker: 'A', en: "Yes, it's my first day. I'm Jiwoo.", ko: '네, 오늘 첫날이에요. 지우라고 합니다.', scene: 'elevator' },
      { speaker: 'B', en: "Nice to meet you. I'm Mark, the team leader.", ko: '반가워요. 저는 팀장 마크예요.', scene: 'elevator' },
      { speaker: 'A', en: "Oh! Nice to meet you, too. I'm a little nervous.", ko: '아! 저도 반갑습니다. 조금 긴장돼요.', scene: 'elevator' },
      { speaker: 'B', en: "Don't worry. Everyone is friendly.", ko: '걱정 마세요. 다들 친절해요.', scene: 'office' },
      { speaker: 'B', en: "Let's grab a coffee before the meeting.", ko: '회의 전에 커피 한잔해요.', scene: 'office' },
      { speaker: 'A', en: 'Sounds good. Thank you so much!', ko: '좋아요. 정말 감사합니다!', scene: 'office' },
      { speaker: 'B', en: 'The meeting starts at ten. The coffee is on me!', ko: '회의는 10시에 시작해요. 커피는 제가 살게요!', scene: 'office' },
      { speaker: 'A', en: "Wow, thanks! I'm not nervous anymore.", ko: '와, 감사해요! 이제 긴장 안 돼요.', scene: 'office' },
    ],
    keyExpressions: [
      { en: 'Are you new here?', ko: '새로 오셨어요?', note: '처음 보는 사람에게 자연스럽게 말 걸기' },
      { en: "I'm a little nervous.", ko: '조금 긴장돼요.', note: 'a little 로 감정을 부드럽게' },
      { en: "Let's grab a coffee.", ko: '커피 한잔해요.', note: 'grab = 가볍게 ~하다' },
    ],
    questions: [
      vq('drama-01-q1', '마크는 어떤 사람인가요?', ['신입 사원', '팀장', '경비원'], '팀장', '"I\'m Mark, the team leader."'),
      vq('drama-01-q2', '지우의 기분은?', ['조금 긴장된다', '아주 피곤하다', '화가 난다'], '조금 긴장된다', '"I\'m a little nervous."'),
      vq('drama-01-q3', '두 사람은 회의 전에 무엇을 하기로 했나요?', ['점심 먹기', '커피 마시기', '산책하기'], '커피 마시기', '"Let\'s grab a coffee before the meeting."'),
    ],
    shadowing: [0, 3, 5],
    rights: RIGHTS('2026-11-03'),
  }),
  drama({
    id: 'drama-02', title: '비 오는 날의 우산', titleEn: 'The Umbrella', level: 'A2', grammarId: 'expr-video', targetSeconds: [30, 60],
    synopsis: '갑자기 비가 오는 버스 정류장. 하준은 옆 사람 엠마에게 우산을 함께 쓰자고 해요.',
    cast: [{ id: 'A', name: 'Emma', voice: 'f' }, { id: 'B', name: 'Hajun', voice: 'm' }],
    script: [
      { speaker: 'A', en: 'Oh no. It\'s raining, and I don\'t have an umbrella.', ko: '이런. 비가 오는데 우산이 없어요.', scene: 'busstop' },
      { speaker: 'B', en: 'Where are you going?', ko: '어디 가세요?', scene: 'busstop' },
      { speaker: 'A', en: "To the library. It's next to the park.", ko: '도서관이요. 공원 옆에 있어요.', scene: 'busstop' },
      { speaker: 'B', en: "Me too! We can share my umbrella.", ko: '저도요! 제 우산 같이 써요.', scene: 'street' },
      { speaker: 'A', en: 'Really? Are you sure?', ko: '정말요? 괜찮으세요?', scene: 'street' },
      { speaker: 'B', en: 'Of course. No big deal.', ko: '물론이죠. 별일 아니에요.', scene: 'street' },
      { speaker: 'A', en: "Thank you. You're so kind.", ko: '고마워요. 정말 친절하시네요.', scene: 'street' },
      { speaker: 'B', en: 'Here we are. The library is right there.', ko: '다 왔어요. 도서관이 바로 저기예요.', scene: 'street' },
      { speaker: 'A', en: 'Thanks again! Have a good day.', ko: '다시 한번 고마워요! 좋은 하루 보내세요.', scene: 'street' },
    ],
    keyExpressions: [
      { en: 'Where are you going?', ko: '어디 가세요?', note: '현재진행형으로 지금 가는 곳 묻기' },
      { en: 'We can share my umbrella.', ko: '제 우산 같이 써요.', note: 'can 으로 제안하기' },
      { en: 'No big deal.', ko: '별일 아니에요.', note: '상대의 부담을 덜어 주는 말' },
    ],
    questions: [
      vq('drama-02-q1', '엠마에게 없는 것은?', ['버스 카드', '우산', '휴대폰'], '우산', '"I don\'t have an umbrella."'),
      vq('drama-02-q2', '도서관은 어디에 있나요?', ['공원 옆', '역 앞', '학교 뒤'], '공원 옆', '"It\'s next to the park."'),
      vq('drama-02-q3', '하준의 제안은?', ['택시 타기', '우산 같이 쓰기', '비 그칠 때까지 기다리기'], '우산 같이 쓰기', '"We can share my umbrella."'),
    ],
    shadowing: [1, 3, 5],
    rights: RIGHTS('2026-11-03'),
  }),
  drama({
    id: 'drama-03', title: '생일 케이크', titleEn: 'The Birthday Cake', level: 'A2', grammarId: 'expr-video', targetSeconds: [30, 60],
    synopsis: '친구 생일을 위해 빵집에서 케이크를 주문하지만, 원하는 케이크가 다 팔렸어요.',
    cast: [{ id: 'A', name: 'Baker', voice: 'f' }, { id: 'B', name: 'Minho', voice: 'm' }],
    script: [
      { speaker: 'A', en: 'Hi there! What can I get for you?', ko: '안녕하세요! 뭘 드릴까요?', scene: 'bakery' },
      { speaker: 'B', en: "I'd like a chocolate cake. It's my friend's birthday.", ko: '초콜릿 케이크 주세요. 친구 생일이에요.', scene: 'bakery' },
      { speaker: 'A', en: "I'm sorry. We ran out of chocolate cake.", ko: '죄송해요. 초콜릿 케이크가 다 떨어졌어요.', scene: 'bakery' },
      { speaker: 'B', en: 'Oh no. What do you recommend?', ko: '아이고. 뭘 추천하세요?', scene: 'bakery' },
      { speaker: 'A', en: 'The strawberry cake is very popular.', ko: '딸기 케이크가 아주 인기 많아요.', scene: 'bakery' },
      { speaker: 'B', en: "Great. I'll take it. Can you write \"Happy Birthday, Sora\"?", ko: '좋아요. 그걸로 할게요. "생일 축하해, 소라"라고 써 주실 수 있어요?', scene: 'counter' },
      { speaker: 'A', en: 'Sure. It will be ready in ten minutes.', ko: '그럼요. 10분이면 준비돼요.', scene: 'counter' },
      { speaker: 'B', en: 'Perfect. Can I pay by card?', ko: '좋아요. 카드로 계산할 수 있나요?', scene: 'counter' },
      { speaker: 'A', en: 'Of course. I hope your friend loves it!', ko: '물론이죠. 친구분이 좋아하시면 좋겠어요!', scene: 'counter' },
    ],
    keyExpressions: [
      { en: 'We ran out of chocolate cake.', ko: '초콜릿 케이크가 다 떨어졌어요.', note: 'run out of = ~이 다 떨어지다' },
      { en: 'What do you recommend?', ko: '뭘 추천하세요?', note: '가게·식당에서 유용한 질문' },
      { en: "I'll take it.", ko: '그걸로 할게요.', note: '구매를 결정할 때' },
    ],
    questions: [
      vq('drama-03-q1', '민호가 처음 원한 케이크는?', ['딸기 케이크', '치즈 케이크', '초콜릿 케이크'], '초콜릿 케이크', '"I\'d like a chocolate cake."'),
      vq('drama-03-q2', '왜 처음 케이크를 살 수 없었나요?', ['너무 비싸서', '다 팔려서', '가게가 닫아서'], '다 팔려서', '"We ran out of chocolate cake."'),
      vq('drama-03-q3', '케이크는 언제 준비되나요?', ['5분 후', '10분 후', '내일'], '10분 후', '"in ten minutes"'),
    ],
    shadowing: [2, 3, 5],
    rights: RIGHTS('2026-11-03'),
  }),
];

/** 영상 대사 음성 (렌더링 스크립트가 이 경로의 mp3 를 이어 붙여 영상 음성 트랙을 만든다) */
export const DRAMA_LINE_AUDIO: Record<string, string[]> = Object.fromEntries(
  DRAMAS.map((d) => [d.id, d.script.map((l) => tts(l.en, d.cast.find((c) => c.id === l.speaker)!.voice))]),
);
