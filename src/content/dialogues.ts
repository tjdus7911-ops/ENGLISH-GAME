import type { Dialogue, DialogueLine, Question, SpeakingSentence } from '@/domain/types';
import { tts } from './audio';

type L = [speaker: 'A' | 'B', en: string, ko: string];

function lines(names: [string, string], ls: L[]): DialogueLine[] {
  return ls.map(([speaker, en, ko]) => ({ speaker, name: speaker === 'A' ? names[0] : names[1], en, ko, audio: tts(en, speaker === 'A' ? 'f' : 'm') }));
}

function dq(id: string, conceptId: string, prompt: string, choices: string[], answer: string, explanation: string): Question {
  return { id, type: 'mc', prompt, choices, answers: [answer], explanation, conceptId };
}
/** 받아쓰기: sentence 는 빈칸(___)을 포함한 대화 문장, audio 는 해당 줄 음성 */
function dict(id: string, conceptId: string, sentence: string, answers: string[], audio: string, explanation: string): Question {
  return { id, type: 'dictation', prompt: '잘 듣고 빈칸에 들어갈 단어를 쓰세요.', sentence, answers, explanation, conceptId, audio };
}

function make(d: Omit<Dialogue, 'audio' | 'reviewStatus' | 'dictation'> & { dictation: (ls: DialogueLine[]) => Question[] }): Dialogue {
  // 전체 대화 음성: 각 줄 음성을 0.5초 간격으로 이어 붙인 파일 (scripts/generate_audio.py)
  return { ...d, dictation: d.dictation(d.lines), audio: `audio/dialogue-${d.id}.mp3`, reviewStatus: 'expert-review-needed' };
}

export const DIALOGUES: Dialogue[] = [
  make({
    id: 'dlg-01', level: 'A1', title: '첫 만남', titleEn: 'Nice to Meet You', grammarId: 'a1-u01', situation: '어학원 첫날, 옆자리 친구와 인사해요.',
    lines: lines(['Mina', 'Leo'], [
      ['A', 'Hi! I am Mina. What is your name?', '안녕! 나는 미나야. 너는 이름이 뭐야?'],
      ['B', 'Hi, Mina. My name is Leo.', '안녕, 미나. 내 이름은 레오야.'],
      ['A', 'Nice to meet you, Leo.', '만나서 반가워, 레오.'],
      ['B', 'Nice to meet you, too. Who is that woman?', '나도 반가워. 저 여자분은 누구야?'],
      ['A', 'She is our teacher. Her name is Ms. Park.', '우리 선생님이셔. 성함은 박 선생님이야.'],
      ['B', 'Oh, I know her. She is very kind.', '아, 나 그분 알아. 정말 친절하셔.'],
    ]),
    keyWords: [{ word: 'name', meaning: '이름' }, { word: 'meet', meaning: '만나다' }, { word: 'teacher', meaning: '선생님' }, { word: 'kind', meaning: '친절한' }],
    keyExpressions: [{ en: 'Nice to meet you.', ko: '만나서 반가워요.', audio: tts('Nice to meet you.') }, { en: 'Who is that woman?', ko: '저 여자분은 누구예요?', audio: tts('Who is that woman?') }],
    questions: [
      dq('dlg-01-q1', 'a1-u01', '남자의 이름은 무엇인가요?', ['Mina', 'Leo', 'Ms. Park'], 'Leo', '"My name is Leo."라고 말했어요.'),
      dq('dlg-01-q2', 'a1-u01', '두 사람이 이야기하는 여자는 누구인가요?', ['미나의 언니', '그들의 선생님', '레오의 친구'], '그들의 선생님', '"She is our teacher."(우리 선생님이야)'),
      dq('dlg-01-q3', 'a1-u01', '레오는 선생님에 대해 뭐라고 했나요?', ['아주 친절하다', '키가 크다', '잘 모른다'], '아주 친절하다', '"She is very kind."'),
    ],
    dictation: (ls) => [
      dict('dlg-01-d1', 'a1-u01', '___ name is Leo.', ['My', 'my'], ls[1].audio, '소유격 my(나의).'),
      dict('dlg-01-d2', 'a1-u01', 'Oh, I know ___.', ['her'], ls[5].audio, '동사 know 뒤 목적격 her.'),
    ],
  }),
  make({
    id: 'dlg-02', level: 'A1', title: '자기소개', titleEn: 'Where Are You From?', grammarId: 'a1-u02', situation: '공항 라운지에서 여행자와 대화해요.',
    lines: lines(['Sora', 'Tom'], [
      ['A', 'Excuse me. Is this seat free?', '실례합니다. 이 자리 비어 있나요?'],
      ['B', 'Yes, it is. Please sit down.', '네, 비어 있어요. 앉으세요.'],
      ['A', 'Thank you. Are you from England?', '고마워요. 영국에서 오셨어요?'],
      ['B', "No, I'm not. I'm from Canada. And you?", '아니요. 캐나다에서 왔어요. 당신은요?'],
      ['A', "I'm from Korea. I'm a nurse.", '저는 한국에서 왔어요. 간호사예요.'],
      ['B', "Really? My sister is a nurse, too. Oh, I'm so tired!", '정말요? 제 여동생도 간호사예요. 아, 너무 피곤하네요!'],
    ]),
    keyWords: [{ word: 'seat', meaning: '자리' }, { word: 'free', meaning: '비어 있는' }, { word: 'nurse', meaning: '간호사' }, { word: 'tired', meaning: '피곤한' }],
    keyExpressions: [{ en: 'Is this seat free?', ko: '이 자리 비어 있나요?', audio: tts('Is this seat free?') }, { en: "I'm from Korea.", ko: '저는 한국에서 왔어요.', audio: tts("I'm from Korea.") }],
    questions: [
      dq('dlg-02-q1', 'a1-u02', '남자는 어디에서 왔나요?', ['영국', '캐나다', '한국'], '캐나다', '"I\'m from Canada."'),
      dq('dlg-02-q2', 'a1-u02', '여자의 직업은 무엇인가요?', ['선생님', '의사', '간호사'], '간호사', '"I\'m a nurse."'),
      dq('dlg-02-q3', 'a1-u02', '남자의 지금 상태는?', ['배고프다', '피곤하다', '행복하다'], '피곤하다', '"I\'m so tired!"'),
    ],
    dictation: (ls) => [
      dict('dlg-02-d1', 'a1-u02', 'Yes, it ___. Please sit down.', ['is'], ls[1].audio, 'it 에는 is.'),
      dict('dlg-02-d2', 'a1-u02', 'My sister ___ a nurse, too.', ['is'], ls[5].audio, 'My sister(단수) → is.'),
    ],
  }),
  make({
    id: 'dlg-03', level: 'A1', title: '주말에 뭐 해?', titleEn: 'Weekend Plans', grammarId: 'a1-u03', situation: '회사 동료와 금요일 오후에 이야기해요.',
    lines: lines(['Jina', 'Sam'], [
      ['A', 'Sam, what do you do on weekends?', '샘, 주말에 뭐 해요?'],
      ['B', 'I play tennis with my friends.', '친구들이랑 테니스 쳐요.'],
      ['A', 'Cool! I like tennis, too.', '멋지다! 저도 테니스 좋아해요.'],
      ['B', 'Really? We play in the park near the station.', '정말요? 우리 역 근처 공원에서 쳐요.'],
      ['A', 'I want to try. I have a racket.', '저도 해 보고 싶어요. 라켓도 있어요.'],
      ['B', 'Great. We meet at nine on Saturday.', '좋아요. 토요일 9시에 만나요.'],
    ]),
    keyWords: [{ word: 'weekend', meaning: '주말' }, { word: 'play', meaning: '(운동을) 하다' }, { word: 'park', meaning: '공원' }, { word: 'want', meaning: '원하다' }],
    keyExpressions: [{ en: 'What do you do on weekends?', ko: '주말에 뭐 해요?', audio: tts('What do you do on weekends?') }, { en: 'I want to try.', ko: '저도 해 보고 싶어요.', audio: tts('I want to try.') }],
    questions: [
      dq('dlg-03-q1', 'a1-u03', '샘은 주말에 무엇을 하나요?', ['축구', '테니스', '수영'], '테니스', '"I play tennis with my friends."'),
      dq('dlg-03-q2', 'a1-u03', '그들은 어디에서 테니스를 치나요?', ['학교 체육관', '역 근처 공원', '회사 옥상'], '역 근처 공원', '"in the park near the station"'),
      dq('dlg-03-q3', 'a1-u03', '언제 만나기로 했나요?', ['토요일 9시', '일요일 9시', '토요일 오후'], '토요일 9시', '"We meet at nine on Saturday."'),
    ],
    dictation: (ls) => [
      dict('dlg-03-d1', 'a1-u03', 'I ___ tennis with my friends.', ['play'], ls[1].audio, '운동 경기 → play.'),
      dict('dlg-03-d2', 'a1-u03', 'I ___ a racket.', ['have'], ls[4].audio, '가지고 있다 → have.'),
    ],
  }),
  make({
    id: 'dlg-04', level: 'A1', title: '하루 일과', titleEn: 'Daily Routine', grammarId: 'a1-u04', situation: '친구에게 형의 생활을 이야기해요.',
    lines: lines(['Yuna', 'Ben'], [
      ['A', 'Your brother looks so healthy.', '너희 형 정말 건강해 보인다.'],
      ['B', 'He gets up at six every day.', '형은 매일 6시에 일어나.'],
      ['A', 'Wow. Does he exercise?', '와. 운동도 해?'],
      ['B', 'Yes. He runs in the park before work.', '응. 출근 전에 공원에서 달려.'],
      ['A', 'And what does he eat for breakfast?', '그럼 아침은 뭐 먹어?'],
      ['B', 'He usually eats eggs and fruit. He never drinks soda.', '보통 달걀이랑 과일 먹어. 탄산음료는 절대 안 마셔.'],
    ]),
    keyWords: [{ word: 'get up', meaning: '일어나다' }, { word: 'usually', meaning: '보통' }, { word: 'never', meaning: '절대 ~않다' }, { word: 'breakfast', meaning: '아침 식사' }],
    keyExpressions: [{ en: 'He gets up at six every day.', ko: '그는 매일 6시에 일어나요.', audio: tts('He gets up at six every day.') }, { en: 'He never drinks soda.', ko: '그는 탄산음료를 절대 안 마셔요.', audio: tts('He never drinks soda.') }],
    questions: [
      dq('dlg-04-q1', 'a1-u04', '형은 몇 시에 일어나나요?', ['5시', '6시', '7시'], '6시', '"He gets up at six every day."'),
      dq('dlg-04-q2', 'a1-u04', '형은 출근 전에 무엇을 하나요?', ['공원에서 달린다', '수영을 한다', '요가를 한다'], '공원에서 달린다', '"He runs in the park before work."'),
      dq('dlg-04-q3', 'a1-u04', '형이 절대 하지 않는 것은?', ['달걀 먹기', '과일 먹기', '탄산음료 마시기'], '탄산음료 마시기', '"He never drinks soda."'),
    ],
    dictation: (ls) => [
      dict('dlg-04-d1', 'a1-u04', 'He ___ up at six every day.', ['gets'], ls[1].audio, '3인칭 단수 → gets.'),
      dict('dlg-04-d2', 'a1-u04', 'He ___ in the park before work.', ['runs'], ls[3].audio, '3인칭 단수 → runs.'),
    ],
  }),
  make({
    id: 'dlg-05', level: 'A1', title: '카페에서 주문하기', titleEn: 'At the Cafe', grammarId: 'a1-u05', situation: '카페에서 음료를 주문해요.',
    lines: lines(['Staff', 'Customer'], [
      ['A', 'Hi. What can I get for you?', '안녕하세요. 뭘 드릴까요?'],
      ['B', "A latte, please. But I don't drink milk.", '라테 주세요. 그런데 저는 우유를 안 마셔요.'],
      ['A', 'No problem. We have oat milk.', '괜찮아요. 귀리 우유가 있어요.'],
      ['B', "Great. And no sugar, please. I don't like sweet drinks.", '좋아요. 그리고 설탕은 빼 주세요. 단 음료를 안 좋아해요.'],
      ['A', "Sure. It isn't very sweet. Anything else?", '네. 그렇게 달지 않아요. 더 필요하신 거 있으세요?'],
      ['B', "No, thanks. That's all.", '아니요, 괜찮아요. 그게 다예요.'],
    ]),
    keyWords: [{ word: 'milk', meaning: '우유' }, { word: 'sugar', meaning: '설탕' }, { word: 'sweet', meaning: '단' }, { word: 'problem', meaning: '문제' }],
    keyExpressions: [{ en: "I don't drink milk.", ko: '저는 우유를 안 마셔요.', audio: tts("I don't drink milk.") }, { en: "That's all.", ko: '그게 다예요.', audio: tts("That's all.") }],
    questions: [
      dq('dlg-05-q1', 'a1-u05', '손님이 주문한 음료는?', ['아메리카노', '라테', '녹차'], '라테', '"A latte, please."'),
      dq('dlg-05-q2', 'a1-u05', '손님이 마시지 않는 것은?', ['우유', '물', '커피'], '우유', '"I don\'t drink milk."'),
      dq('dlg-05-q3', 'a1-u05', '손님이 빼 달라고 한 것은?', ['얼음', '설탕', '시럽과 크림'], '설탕', '"No sugar, please."'),
    ],
    dictation: (ls) => [
      dict('dlg-05-d1', 'a1-u05', "But I ___ drink milk.", ["don't", 'do not'], ls[1].audio, "I + don't + 동사원형."),
      dict('dlg-05-d2', 'a1-u05', "It ___ very sweet.", ["isn't", 'is not'], ls[4].audio, "형용사 앞 be동사 부정 isn't."),
    ],
  }),
  make({
    id: 'dlg-06', level: 'A1', title: '길 묻기', titleEn: 'Asking the Way', grammarId: 'a1-u06', situation: '처음 가 본 동네에서 길을 물어요.',
    lines: lines(['Traveler', 'Local'], [
      ['A', 'Excuse me. Where is the subway station?', '실례합니다. 지하철역이 어디예요?'],
      ['B', "It's on Main Street. Do you see the bank?", '메인 스트리트에 있어요. 은행 보이세요?'],
      ['A', 'Yes, I do.', '네, 보여요.'],
      ['B', 'The station is next to the bank.', '역은 은행 옆에 있어요.'],
      ['A', 'Thank you. How long does it take?', '감사합니다. 얼마나 걸려요?'],
      ['B', 'About five minutes on foot.', '걸어서 5분 정도요.'],
    ]),
    keyWords: [{ word: 'where', meaning: '어디' }, { word: 'station', meaning: '역' }, { word: 'next to', meaning: '~ 옆에' }, { word: 'on foot', meaning: '걸어서' }],
    keyExpressions: [{ en: 'Where is the subway station?', ko: '지하철역이 어디예요?', audio: tts('Where is the subway station?') }, { en: 'How long does it take?', ko: '얼마나 걸려요?', audio: tts('How long does it take?') }],
    questions: [
      dq('dlg-06-q1', 'a1-u06', '여행자가 찾는 곳은?', ['은행', '지하철역', '버스 정류장'], '지하철역', '"Where is the subway station?"'),
      dq('dlg-06-q2', 'a1-u06', '역은 무엇 옆에 있나요?', ['은행', '공원', '병원'], '은행', '"The station is next to the bank."'),
      dq('dlg-06-q3', 'a1-u06', '역까지 얼마나 걸리나요?', ['걸어서 5분', '버스로 5분', '걸어서 15분'], '걸어서 5분', '"About five minutes on foot."'),
    ],
    dictation: (ls) => [
      dict('dlg-06-d1', 'a1-u06', '___ you see the bank?', ['Do', 'do'], ls[1].audio, 'you + 일반동사 의문문 → Do.'),
      dict('dlg-06-d2', 'a1-u06', 'How long ___ it take?', ['does'], ls[4].audio, 'it + 일반동사 의문문 → does.'),
    ],
  }),
  make({
    id: 'dlg-07', level: 'A1', title: '편의점에서', titleEn: 'At the Store', grammarId: 'a1-u07', situation: '편의점에서 물건을 사요.',
    lines: lines(['Clerk', 'Customer'], [
      ['A', 'Hello. Can I help you?', '안녕하세요. 도와드릴까요?'],
      ['B', 'Yes. I need an umbrella. It is raining.', '네. 우산이 하나 필요해요. 비가 와요.'],
      ['A', 'The umbrellas are by the door.', '우산은 문 옆에 있어요.'],
      ['B', 'Thanks. And a bottle of water, please.', '고마워요. 그리고 물 한 병 주세요.'],
      ['A', 'Sure. The water is in the fridge.', '네. 물은 냉장고 안에 있어요.'],
      ['B', 'Okay. Here is a ten-dollar bill.', '알겠어요. 여기 10달러짜리 지폐요.'],
    ]),
    keyWords: [{ word: 'umbrella', meaning: '우산' }, { word: 'bottle', meaning: '병' }, { word: 'fridge', meaning: '냉장고' }, { word: 'bill', meaning: '지폐' }],
    keyExpressions: [{ en: 'I need an umbrella.', ko: '우산이 하나 필요해요.', audio: tts('I need an umbrella.') }, { en: 'Can I help you?', ko: '도와드릴까요?', audio: tts('Can I help you?') }],
    questions: [
      dq('dlg-07-q1', 'a1-u07', '손님이 처음에 찾는 물건은?', ['우산', '물', '가방'], '우산', '"I need an umbrella."'),
      dq('dlg-07-q2', 'a1-u07', '우산은 어디에 있나요?', ['냉장고 안', '문 옆', '계산대 뒤'], '문 옆', '"The umbrellas are by the door."'),
      dq('dlg-07-q3', 'a1-u07', '지금 날씨는?', ['맑다', '비가 온다', '눈이 온다'], '비가 온다', '"It is raining."'),
    ],
    dictation: (ls) => [
      dict('dlg-07-d1', 'a1-u07', 'I need ___ umbrella.', ['an'], ls[1].audio, 'umbrella 는 모음 소리 → an.'),
      dict('dlg-07-d2', 'a1-u07', '___ water is in the fridge.', ['The', 'the'], ls[4].audio, '앞에서 말한 그 물 → The.'),
    ],
  }),
  make({
    id: 'dlg-08', level: 'A1', title: '열쇠 찾기', titleEn: 'Where Are My Keys?', grammarId: 'a1-u08', situation: '아침에 급하게 나가려는데 열쇠가 안 보여요.',
    lines: lines(['Mom', 'Jun'], [
      ['A', 'Jun, hurry up! The bus comes at eight.', '준, 서둘러! 버스가 8시에 와.'],
      ['B', "Mom, I can't find my keys.", '엄마, 열쇠를 못 찾겠어요.'],
      ['A', 'Are they in your bag?', '가방 안에 있니?'],
      ['B', 'No. They are not in my bag.', '아니요. 가방 안에는 없어요.'],
      ['A', 'Look! They are on the table, under the newspaper.', '봐! 탁자 위, 신문 밑에 있네.'],
      ['B', 'Thanks, Mom! See you at dinner.', '고마워요, 엄마! 저녁에 봬요.'],
    ]),
    keyWords: [{ word: 'hurry up', meaning: '서두르다' }, { word: 'find', meaning: '찾다' }, { word: 'on', meaning: '~ 위에' }, { word: 'under', meaning: '~ 아래에' }],
    keyExpressions: [{ en: 'Hurry up!', ko: '서둘러!', audio: tts('Hurry up!') }, { en: 'See you at dinner.', ko: '저녁에 봐요.', audio: tts('See you at dinner.') }],
    questions: [
      dq('dlg-08-q1', 'a1-u08', '버스는 몇 시에 오나요?', ['7시', '8시', '9시'], '8시', '"The bus comes at eight."'),
      dq('dlg-08-q2', 'a1-u08', '열쇠는 결국 어디에 있었나요?', ['가방 안', '탁자 위 신문 밑', '침대 밑'], '탁자 위 신문 밑', '"on the table, under the newspaper"'),
      dq('dlg-08-q3', 'a1-u08', '준은 엄마를 언제 다시 보나요?', ['점심', '저녁 식사 때', '주말'], '저녁 식사 때', '"See you at dinner."'),
    ],
    dictation: (ls) => [
      dict('dlg-08-d1', 'a1-u08', 'The bus comes ___ eight.', ['at'], ls[0].audio, '시각 → at.'),
      dict('dlg-08-d2', 'a1-u08', 'They are ___ the table.', ['on'], ls[4].audio, '표면 위 → on.'),
    ],
  }),
  make({
    id: 'dlg-09', level: 'A1', title: '옷 가게에서', titleEn: 'Can I Try It On?', grammarId: 'a1-u09', situation: '옷 가게에서 재킷을 입어 봐요.',
    lines: lines(['Clerk', 'Customer'], [
      ['A', 'Hi there. Can I help you?', '안녕하세요. 도와드릴까요?'],
      ['B', 'Yes. Can I try this jacket on?', '네. 이 재킷 입어 봐도 될까요?'],
      ['A', 'Of course. The fitting room is over there.', '물론이죠. 탈의실은 저쪽이에요.'],
      ['B', "It's nice, but it's too small. Can you find a bigger one?", '예쁜데 너무 작아요. 더 큰 걸 찾아 주실 수 있어요?'],
      ['A', "Sorry, we don't have a bigger size. You can order one online.", '죄송해요, 더 큰 사이즈가 없어요. 온라인으로 주문하실 수 있어요.'],
      ['B', 'Okay. Can I pay by card?', '알겠어요. 카드로 계산할 수 있나요?'],
    ]),
    keyWords: [{ word: 'try on', meaning: '입어 보다' }, { word: 'fitting room', meaning: '탈의실' }, { word: 'size', meaning: '크기, 사이즈' }, { word: 'order', meaning: '주문하다' }],
    keyExpressions: [{ en: 'Can I try this jacket on?', ko: '이 재킷 입어 봐도 될까요?', audio: tts('Can I try this jacket on?') }, { en: 'Can I pay by card?', ko: '카드로 계산할 수 있나요?', audio: tts('Can I pay by card?') }],
    questions: [
      dq('dlg-09-q1', 'a1-u09', '손님이 입어 보려는 옷은?', ['셔츠', '재킷', '바지'], '재킷', '"Can I try this jacket on?"'),
      dq('dlg-09-q2', 'a1-u09', '재킷의 문제는?', ['너무 비싸다', '너무 작다', '색이 별로다'], '너무 작다', '"it\'s too small"'),
      dq('dlg-09-q3', 'a1-u09', '직원이 제안한 방법은?', ['다른 매장 방문', '온라인 주문', '다음 주에 다시 오기'], '온라인 주문', '"You can order one online."'),
    ],
    dictation: (ls) => [
      dict('dlg-09-d1', 'a1-u09', '___ I try this jacket on?', ['Can', 'can'], ls[1].audio, '허락 → Can I ~?'),
      dict('dlg-09-d2', 'a1-u09', 'You can ___ one online.', ['order'], ls[4].audio, 'can + 동사원형 order.'),
    ],
  }),
  make({
    id: 'dlg-10', level: 'A1', title: '새 동네 소개', titleEn: 'My New Neighborhood', grammarId: 'a1-u10', situation: '이사한 친구가 새 동네를 소개해요.',
    lines: lines(['Hana', 'Max'], [
      ['A', 'How is your new apartment?', '새 아파트는 어때?'],
      ['B', "It's small but very clean.", '작지만 아주 깨끗해.'],
      ['A', 'Is there a park near your place?', '집 근처에 공원 있어?'],
      ['B', 'Yes, there is a big park and there are two cafes.', '응, 큰 공원이 있고 카페도 두 개 있어.'],
      ['A', 'Sounds great! Do you like it?', '좋다! 마음에 들어?'],
      ['B', "I love it because it's quiet at night.", '정말 좋아, 밤에 조용하거든.'],
    ]),
    keyWords: [{ word: 'apartment', meaning: '아파트' }, { word: 'clean', meaning: '깨끗한' }, { word: 'quiet', meaning: '조용한' }, { word: 'because', meaning: '~ 때문에' }],
    keyExpressions: [{ en: "It's small but very clean.", ko: '작지만 아주 깨끗해요.', audio: tts("It's small but very clean.") }, { en: 'Is there a park near your place?', ko: '집 근처에 공원 있어요?', audio: tts('Is there a park near your place?') }],
    questions: [
      dq('dlg-10-q1', 'a1-u10', '새 아파트는 어떤가요?', ['크고 깨끗하다', '작지만 깨끗하다', '작고 시끄럽다'], '작지만 깨끗하다', '"It\'s small but very clean."'),
      dq('dlg-10-q2', 'a1-u10', '근처에 카페는 몇 개 있나요?', ['1개', '2개', '3개'], '2개', '"there are two cafes"'),
      dq('dlg-10-q3', 'a1-u10', '남자가 동네를 좋아하는 이유는?', ['밤에 조용해서', '역이 가까워서', '집값이 싸서'], '밤에 조용해서', '"because it\'s quiet at night"'),
    ],
    dictation: (ls) => [
      dict('dlg-10-d1', 'a1-u10', "It's small ___ very clean.", ['but'], ls[1].audio, '반대 연결 → but.'),
      dict('dlg-10-d2', 'a1-u10', "I love it ___ it's quiet at night.", ['because'], ls[5].audio, '이유 → because.'),
    ],
  }),
];

export const DIALOGUE_BY_ID: Record<string, Dialogue> = Object.fromEntries(DIALOGUES.map((d) => [d.id, d]));

// ─────────────────────────── 따라 말하기 30문장 (단원별 3개) ───────────────────────────
const S: [string, string, string, string][] = [
  ['a1-u01', 'My name is Mina.', '제 이름은 미나예요.', 'name 의 n 은 혀끝을 윗잇몸에 대요.'],
  ['a1-u01', 'Nice to meet you.', '만나서 반가워요.', 'meet you 를 이어서 "미츄"처럼 부드럽게.'],
  ['a1-u01', 'She is my best friend.', '그녀는 제 가장 친한 친구예요.', 'best friend 의 t 는 약하게.'],
  ['a1-u02', "I'm from Korea.", '저는 한국에서 왔어요.', "I'm 은 한 음절 \"아임\"."],
  ['a1-u02', "I'm a little tired today.", '오늘 좀 피곤해요.', 'tired 는 "타이얼드" 두 박자.'],
  ['a1-u02', 'The weather is nice today.', '오늘 날씨가 좋네요.', 'weather 의 th 는 혀를 이 사이에.'],
  ['a1-u03', 'I like coffee.', '저는 커피를 좋아해요.', 'like 의 l 을 분명하게.'],
  ['a1-u03', 'We play tennis on weekends.', '우리는 주말마다 테니스를 쳐요.', 'play 의 pl 을 붙여서.'],
  ['a1-u03', 'I live in Seoul.', '저는 서울에 살아요.', 'live in 을 이어서 "리빈".'],
  ['a1-u04', 'I usually get up at seven.', '저는 보통 7시에 일어나요.', 'get up at 을 이어서 "게러팻".'],
  ['a1-u04', 'She works at a hospital.', '그녀는 병원에서 일해요.', 'works 의 끝 s 를 꼭 소리 내요.'],
  ['a1-u04', 'He never drinks soda.', '그는 탄산음료를 절대 안 마셔요.', 'never 에 강세.'],
  ['a1-u05', "I don't understand.", '이해가 안 돼요.', "don't 의 t 는 거의 들리지 않아요."],
  ['a1-u05', "He doesn't eat meat.", '그는 고기를 안 먹어요.', "doesn't 는 \"더즌\"."],
  ['a1-u05', "It isn't far from here.", '여기서 멀지 않아요.', 'far 는 입을 크게 "파ㄹ".'],
  ['a1-u06', 'Where is the restroom?', '화장실이 어디예요?', '의문사 의문문은 끝을 내려요.'],
  ['a1-u06', 'Do you speak English?', '영어 하세요?', 'Yes/No 질문은 끝을 올려요.'],
  ['a1-u06', 'How much is this?', '이거 얼마예요?', 'much 에 강세.'],
  ['a1-u07', 'I need an umbrella.', '우산이 하나 필요해요.', 'an umbrella 를 이어서 "어넘브렐라".'],
  ['a1-u07', 'Can you pass the salt?', '소금 좀 건네주실래요?', 'the 는 약하게 "더".'],
  ['a1-u07', "That's a good idea.", '좋은 생각이에요.', 'idea 는 "아이디-어" 강세는 디.'],
  ['a1-u08', 'The keys are on the table.', '열쇠는 탁자 위에 있어요.', 'keys 의 끝 z 소리.'],
  ['a1-u08', "Let's meet at noon.", '정오에 만나요.', 'meet at 을 이어서 "미랫".'],
  ['a1-u08', 'The bank is next to the cafe.', '은행은 카페 옆에 있어요.', 'next to 를 이어서 "넥스투".'],
  ['a1-u09', 'Can you help me?', '저 좀 도와줄 수 있어요?', '긍정 can 은 약하게 "컨".'],
  ['a1-u09', "I can't find my wallet.", '지갑을 못 찾겠어요.', "can't 는 강하고 길게 \"캔ㅌ\"."],
  ['a1-u09', 'Can I pay by card?', '카드로 계산할 수 있나요?', 'pay by 를 리듬 있게.'],
  ['a1-u10', "It's small but very clean.", '작지만 아주 깨끗해요.', 'but 은 짧게, clean 에 강세.'],
  ['a1-u10', 'There is a cafe near my house.', '우리 집 근처에 카페가 있어요.', 'There is 를 이어서 "데어리즈".'],
  ['a1-u10', "I'm happy because it's Friday.", '금요일이라서 기뻐요.', 'because 는 "비커즈" 강세는 커.'],
];

export const SPEAKING: SpeakingSentence[] = S.map(([grammarId, en, ko, tip], i) => ({
  id: `spk-${String(i + 1).padStart(2, '0')}`, level: 'A1', en, ko, grammarId, tip, audio: tts(en),
}));
export const SPEAKING_BY_ID: Record<string, SpeakingSentence> = Object.fromEntries(SPEAKING.map((s) => [s.id, s]));
