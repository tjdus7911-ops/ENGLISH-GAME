import type { Character } from '@/domain/types';

/** 오리지널 캐릭터 6종. 외형은 src/components/CharacterArt.tsx 의 SVG 로 직접 그린다 (Lv.1 / Lv.2 각 1종 = 12 에셋). */
export const CHARACTERS: Character[] = [
  {
    id: 'mossy', name: '모시', species: '이끼곰 정령', look: '동글동글한 연두색 몸에 이끼 귀, 등에 작은 새싹이 자라요. 진화하면 몸이 커지고 새싹이 꽃나무로, 등에는 고사리가 자라요.',
    personality: '느긋하고 다정해요. 친구 이름을 절대 잊지 않아요.', conceptId: 'a1-u01', conceptLabel: '인칭대명사', rarity: 'common',
    acquireRule: '학습 후 발견 퀴즈 통과', palette: { body: '#9BD27A', accent: '#5E9C47', cheek: '#F6A7A0' },
    lines: {
      greeting: ['안녕! 오늘도 같이 공부하자.', 'Hi! I am Mossy. 나는 I, 너는 you!'],
      studying: ['천천히 해도 괜찮아.', '주어 자리부터 찾아볼까?'],
      correct: ['좋아! 정확해!', 'Great job!'],
      incorrect: ['괜찮아, 다시 보자.', '자리를 먼저 확인해 봐.'],
      hint: ['동사 앞이면 I, 뒤면 me!'],
      review: ['어제 배운 거 기억나? 같이 꺼내 보자.'],
      completed: ['오늘 공부 끝! 정말 잘했어.'],
      levelup: ['꽃이 피었어! 고마워!'],
    },
  },
  {
    id: 'plip', name: '플립', species: '물방울 개구리', look: '투명한 하늘색 물방울 몸에 동그란 눈. 진화하면 머리끝이 파도 물결이 되고 물결 망토가 생겨요.',
    personality: '활발하고 뭐든 "~이다!"라고 크게 외쳐요.', conceptId: 'a1-u02', conceptLabel: 'be동사', rarity: 'common',
    acquireRule: '학습 후 발견 퀴즈 통과', palette: { body: '#8FD3F4', accent: '#3D9BC7', cheek: '#FFB4C2' },
    lines: {
      greeting: ['퐁! I am Plip!'], studying: ['am, is, are — 짝꿍을 찾아 줘!'], correct: ['퐁퐁! 맞았어!'], incorrect: ['물방울이 흔들렸어. 한 번 더!'],
      hint: ['한 명이면 is, 여러 명이면 are!'], review: ['복습은 물처럼 매일 조금씩!'], completed: ['오늘도 반짝반짝!'], levelup: ['파도 물결이 생겼어!'],
    },
  },
  {
    id: 'lumi', name: '루미', species: '반딧불 버섯', look: '노란 갓에 반짝이는 점무늬 버섯. 진화하면 갓이 커다란 등불처럼 빛나고 아기 버섯이 돋아나요.',
    personality: '부지런하고 매일 무언가를 해요. "I play! I read!"', conceptId: 'a1-u03', conceptLabel: '일반동사', rarity: 'common',
    acquireRule: '학습 후 발견 퀴즈 통과', palette: { body: '#FFE08A', accent: '#E9A23B', cheek: '#FFB08A' },
    lines: {
      greeting: ['반짝! 오늘은 무슨 동사를 할까?'], studying: ['동사는 하나만!'], correct: ['빛이 났어!'], incorrect: ['괜찮아, 불빛을 다시 켜자.'],
      hint: ['be동사와 일반동사는 함께 쓰지 않아.'], review: ['빛을 잃지 않게 복습하자.'], completed: ['오늘 숲이 더 밝아졌어!'], levelup: ['갓이 등불처럼 빛나!'],
    },
  },
  {
    id: 'cobi', name: '코비', species: '솔방울 고슴도치', look: '솔방울 비늘 등에 작은 코. 진화하면 솔방울 갑옷이 커지고 도토리 투구와 잎사귀 망토를 둘러요.',
    personality: '신중하고 "아니야, 그건 아니야"를 잘 말해요.', conceptId: 'a1-u05', conceptLabel: '부정문', rarity: 'common',
    acquireRule: '학습 후 발견 퀴즈 통과', palette: { body: '#C9A27E', accent: '#8A6244', cheek: '#F2A69B' },
    lines: {
      greeting: ["음… 안녕. I don't bite!"], studying: ["don't 다음엔 동사원형!"], correct: ['좋아, 정확해.'], incorrect: ['아니야, 다시 생각해 보자.'],
      hint: ["he, she 에는 doesn't!"], review: ['잊지 않게 다시 확인하자.'], completed: ['수고했어. 푹 쉬어.'], levelup: ['도토리 투구 득템!'],
    },
  },
  {
    id: 'whisk', name: '위스크', species: '구름 여우', look: '솜사탕 같은 구름 꼬리를 가진 연보라 여우. 진화하면 구름 꼬리가 세 개, 등에 구름 날개, 이마에 초승달이 생겨요.',
    personality: '호기심이 많아 늘 "왜? 어디? 언제?"를 물어요.', conceptId: 'a1-u06', conceptLabel: '의문문', rarity: 'rare',
    acquireRule: '단원 평가 첫 통과 시 확정 획득', palette: { body: '#D9C8F5', accent: '#9D84D6', cheek: '#FFB7D5' },
    lines: {
      greeting: ['궁금한 게 있어? Do you have a question?'], studying: ['질문은 뒤집기부터!'], correct: ['완벽한 질문이야!'], incorrect: ['음? 다시 물어볼까?'],
      hint: ['일반동사 질문은 Do/Does 로 시작해.'], review: ['어제 질문, 다시 해 보자!'], completed: ['오늘도 궁금증 해결!'], levelup: ['꼬리가 세 개가 됐어!'],
    },
  },
  {
    id: 'stella', name: '스텔라', species: '별빛 사슴', look: '밤하늘색 털에 별 무늬, 뿔 끝에 작은 별이 빛나요. 진화하면 별자리 뿔이 크게 자라고 성운 갈기가 흘러요.',
    personality: '차분하고 지혜로워요. 숲의 길을 알려 줘요.', conceptId: 'a1-u10', conceptLabel: '기초 문장 만들기', rarity: 'special',
    acquireRule: 'A1 레벨 평가 통과 시 확정 획득', palette: { body: '#5B6BB5', accent: '#F7D774', cheek: '#F3A6C0' },
    lines: {
      greeting: ['별빛이 너를 기다렸어.'], studying: ['누가-한다-무엇을-어디서-언제.'], correct: ['별이 하나 더 빛나.'], incorrect: ['길을 잃어도 괜찮아. 다시 걸어 보자.'],
      hint: ['장소 다음에 시간!'], review: ['배운 길을 다시 걸어 보자.'], completed: ['오늘의 별자리 완성!'], levelup: ['별자리가 이어졌어!'],
    },
  },
];

export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
export const COMMON_POOL = CHARACTERS.filter((c) => c.rarity === 'common').map((c) => ({ id: c.id, conceptId: c.conceptId }));
export const RARE_ID = 'whisk';
export const SPECIAL_ID = 'stella';

/** 파트너가 없을 때 등장하는 기본 안내 캐릭터 (도감 미포함) */
export const GUIDE = {
  name: '숲지기 등불', lines: {
    greeting: ['어서 와! 시작의 숲에 온 걸 환영해.', '오늘의 학습을 마치면 숲 친구를 만날 수 있어.'],
    correct: ['좋아요!'], incorrect: ['다시 해 봐요.'], completed: ['수고했어요!'],
  } as Record<string, string[]>,
};
