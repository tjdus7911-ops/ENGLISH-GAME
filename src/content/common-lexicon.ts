/**
 * 기본 사전 (단어 터치용): 앱 영단어 DB(300개)에 없는 기능어·기초 어휘·동화책/예문/표현에 나오는 단어.
 * 형식: 단어|뜻|품사약어|레벨   (품사: 명 동 형 부 대 전 접 조 감 한(한정사) 수(수사) 고(고유명사))
 * 고유명사(이야기 속 이름)는 뜻 확인만 되고 단어장에는 저장하지 않는다.
 */
const RAW = String.raw`
a|하나의 (셀 수 있는 명사 앞)|한|Pre-A1
an|하나의 (모음 소리 앞)|한|Pre-A1
the|그 (정해진 것 앞)|한|Pre-A1
be|~이다, 있다|동|Pre-A1
i|나|대|Pre-A1
you|너, 당신|대|Pre-A1
he|그|대|Pre-A1
she|그녀|대|Pre-A1
it|그것|대|Pre-A1
we|우리|대|Pre-A1
they|그들|대|Pre-A1
this|이것, 이|대|Pre-A1
that|저것, 그것; ~라는 것|대|Pre-A1
these|이것들|대|Pre-A1
those|저것들, 그것들|대|A1
himself|그 자신, 직접|대|A2
itself|그것 자체|대|B1
yourself|너 자신|대|A2
someone|누군가|대|A1
anyone|누구든지, 아무도|대|A1
anything|무엇이든, 아무것도|대|A1
everything|모든 것|대|A1
nothing|아무것도 ~ 않다|대|A1
nobody|아무도 ~ 않다|대|A2
other|다른|형|A1
others|다른 것들, 다른 사람들|대|A2
another|또 하나의, 다른|한|A2
each|각각의|한|A1
all|모든, 모두|한|Pre-A1
some|약간의, 어떤|한|Pre-A1
any|어떤, 조금도|한|A1
many|많은 (셀 수 있는)|한|Pre-A1
few|몇몇의, 거의 없는|한|A2
several|몇몇의|한|B1
same|같은|형|A1
no|아니, ~이 없는|한|Pre-A1
not|~ 아니다|부|Pre-A1
yes|네|감|Pre-A1
oh|오, 아|감|Pre-A1
hello|안녕하세요|감|Pre-A1
hi|안녕|감|Pre-A1
hey|이봐, 야|감|A1
wow|와|감|A1
hmm|음|감|A2
please|부디, 제발|부|Pre-A1
sorry|미안한|형|Pre-A1
welcome|환영하다; 환영받는|동|A1
congratulations|축하해요|감|A2
excuse|용서하다 (Excuse me: 실례합니다)|동|A1
of|~의|전|Pre-A1
to|~에게, ~로|전|Pre-A1
for|~을 위해, ~ 동안|전|Pre-A1
with|~와 함께, ~으로|전|Pre-A1
by|~에 의해, ~ 옆에, ~까지|전|A1
about|~에 대해, 약|전|Pre-A1
into|~ 안으로|전|A1
over|~ 위로, ~ 너머|전|A1
through|~을 통과해, ~ 내내|전|A2
across|~을 가로질러|전|A2
along|~을 따라|전|A2
against|~에 기대어, ~에 반대하여|전|B1
toward|~ 쪽으로|전|B1
during|~ 동안|전|A2
until|~할 때까지|접|A2
past|~을 지나서; 과거|전|A2
off|떨어져, 벗어나|부|A1
out|밖으로|부|Pre-A1
up|위로|부|Pre-A1
down|아래로|부|Pre-A1
away|멀리, 떨어져|부|A1
back|뒤로, 다시; 등|부|A1
as|~처럼, ~로서, ~할 때|접|A2
if|만약 ~라면|접|A1
than|~보다|접|A1
then|그때, 그러고 나서|부|Pre-A1
while|~하는 동안|접|A2
whenever|~할 때마다|접|B1
although|비록 ~이지만|접|B1
however|그러나|부|B1
yet|그런데도; 아직|부|B1
whoever|~하는 사람은 누구든|대|B2
whose|누구의; (관계사) 그 사람의|대|B1
neither|어느 쪽도 ~ 않다|한|B2
rather|오히려, 차라리|부|B1
even|~조차, 훨씬|부|A2
ever|지금까지, 언젠가|부|A2
just|방금, 단지|부|A1
still|여전히|부|A1
soon|곧|부|A1
once|한 번; 옛날에|부|A2
too|너무; ~도|부|Pre-A1
almost|거의|부|A2
mostly|대부분|부|B1
truly|진정으로|부|B1
easily|쉽게|부|A2
quickly|빨리|부|A1
carefully|조심스럽게|부|A2
finally|마침내|부|A2
loudly|큰 소리로|부|A2
patiently|참을성 있게|부|B1
painfully|고통스럽게, 몹시|부|B2
rarely|좀처럼 ~ 않는|부|B1
altogether|완전히|부|B2
straight|똑바로, 곧장|부|A2
now|지금|부|Pre-A1
today|오늘|부|Pre-A1
tomorrow|내일|부|Pre-A1
yesterday|어제|부|Pre-A1
tonight|오늘 밤|부|A1
ago|~ 전에|부|A1
before|~ 전에|전|A1
after|~ 후에|전|Pre-A1
o'clock|~시 (정각)|부|Pre-A1
will|~할 것이다|조|A1
would|~할 텐데, ~하곤 했다|조|A2
should|~해야 한다|조|A2
may|~일지도 모른다, ~해도 된다|조|A2
must|~해야 한다, ~임에 틀림없다|조|A2
let|~하게 하다 (Let's: ~하자)|동|A1
one|하나; (막연한) 사람|수|Pre-A1
two|둘|수|Pre-A1
three|셋|수|Pre-A1
five|다섯|수|Pre-A1
six|여섯|수|Pre-A1
seven|일곱|수|Pre-A1
nine|아홉|수|Pre-A1
ten|열|수|Pre-A1
eleven|열하나|수|Pre-A1
twelve|열둘|수|Pre-A1
fifteen|열다섯|수|A1
eighteen|열여덟|수|A1
twenty|스물|수|A1
thirty|서른|수|A1
forty|마흔|수|A1
fifty|쉰|수|A1
eighty-seven|여든일곱|수|A1
first|첫 번째의|수|Pre-A1
second|두 번째의; 초|수|A1
half|절반|명|A1
cent|센트 (화폐)|명|A1
dollar|달러|명|A1
minute|분|명|A1
month|달, 월|명|Pre-A1
year|해, 년|명|Pre-A1
spring|봄|명|Pre-A1
holiday|휴일, 방학|명|A1
vacation|방학, 휴가|명|A1
monday|월요일|명|Pre-A1
tuesday|화요일|명|Pre-A1
thursday|목요일|명|Pre-A1
friday|금요일|명|Pre-A1
saturday|토요일|명|Pre-A1
sunday|일요일|명|Pre-A1
april|4월|명|A1
christmas|크리스마스|명|A1
midnight|자정|명|A2
moment|순간|명|A2
degree|(온도) 도|명|A2
dog|개|명|Pre-A1
cat|고양이|명|Pre-A1
bird|새|명|Pre-A1
duck|오리|명|Pre-A1
fox|여우|명|A1
hare|산토끼|명|B1
tortoise|거북|명|B1
animal|동물|명|Pre-A1
farm|농장|명|A1
farmer|농부|명|A1
tree|나무|명|Pre-A1
lake|호수|명|A1
sea|바다|명|A1
shore|해안, 해변|명|B1
beach|해변|명|A1
land|땅, 육지|명|A2
air|공기|명|A1
ice|얼음|명|A1
icy|얼음으로 덮인|형|B1
wind|바람|명|A1
storm|폭풍|명|A2
fire|불|명|A1
road|길, 도로|명|A1
map|지도|명|A1
box|상자|명|Pre-A1
tin|양철, 깡통|명|B1
toy|장난감|명|Pre-A1
bed|침대|명|Pre-A1
mirror|거울|명|A2
curtain|커튼|명|A2
paper|종이|명|Pre-A1
pen|펜|명|Pre-A1
page|페이지, 쪽|명|A1
letter|편지; 글자|명|A1
note|메모, 쪽지; 음|명|A1
word|단어, 말|명|Pre-A1
line|선, 줄|명|A1
sign|표지판; 서명하다|명|A1
photo|사진|명|Pre-A1
story|이야기|명|Pre-A1
song|노래|명|Pre-A1
music|음악|명|Pre-A1
musician|음악가|명|A2
player|연주자, 선수|명|A1
concert|콘서트, 공연|명|A1
performance|공연|명|B1
perform|공연하다, 연주하다|동|B1
listener|청취자|명|B1
hall|홀, 강당|명|A2
center|중심, 센터|명|A1
community|지역 사회, 공동체|명|B1
classical|클래식의, 고전의|형|B1
silence|고요, 침묵|명|B1
sound|소리; ~처럼 들리다|명|A1
pause|잠깐 멈춤, 쉼|명|B1
paint|그리다, 칠하다; 물감|동|A1
painter|화가|명|A2
art|미술, 예술|명|A1
robot|로봇|명|A1
cart|카트, 수레|명|A2
hair|머리카락|명|Pre-A1
head|머리|명|Pre-A1
eye|눈|명|Pre-A1
nose|코|명|Pre-A1
hand|손|명|Pre-A1
arm|팔|명|Pre-A1
leg|다리|명|Pre-A1
curl|곱슬머리|명|B1
clothes|옷|명|Pre-A1
cloth|천, 옷감|명|B1
shoe|신발|명|Pre-A1
boot|장화, 부츠|명|A1
chain|사슬, (시곗)줄|명|B1
gift|선물|명|A1
present|선물; 현재의|명|A1
package|소포, 꾸러미|명|A2
food|음식|명|Pre-A1
soup|수프|명|A1
cake|케이크|명|Pre-A1
cookie|쿠키|명|Pre-A1
cheese|치즈|명|Pre-A1
juice|주스|명|Pre-A1
tea|차|명|Pre-A1
grape|포도|명|Pre-A1
potato|감자|명|Pre-A1
pizza|피자|명|Pre-A1
pasta|파스타|명|A1
sandwich|샌드위치|명|Pre-A1
tacos|타코 (멕시코 음식)|명|A2
latte|라테|명|A2
peanut|땅콩|명|A2
fresh|신선한, 갓 만든|형|A1
mom|엄마|명|Pre-A1
dad|아빠|명|Pre-A1
grandma|할머니|명|Pre-A1
grandpa|할아버지|명|Pre-A1
grandfather|할아버지|명|Pre-A1
kid|아이|명|A1
lady|숙녀, 부인|명|A1
person|사람|명|Pre-A1
crowd|군중|명|A2
group|무리, 그룹|명|A1
team|팀|명|A1
club|동아리, 클럽|명|A1
boss|상사|명|A2
roommate|룸메이트|명|A2
author|작가|명|B1
hunter|사냥꾼|명|B1
fool|바보|명|B1
mr|~ 씨 (남성 존칭)|명|A1
life|삶, 생명|명|A1
thing|것, 물건|명|Pre-A1
way|길, 방법|명|A1
lot|많음 (a lot of: 많은)|명|Pre-A1
piece|조각, 한 개|명|A1
rest|나머지; 휴식|명|A2
top|꼭대기|명|A1
middle|가운데|명|A1
front|앞|명|A1
side|옆, 쪽|명|A1
space|공간|명|A2
size|크기|명|A1
pattern|무늬, 패턴|명|B1
detail|세부 사항|명|B1
sight|시야, 광경|명|B1
plan|계획; 계획하다|명|A1
purpose|목적|명|B1
idea|생각|명|A1
sense|감각, 의미|명|B1
luck|운|명|A1
favor|부탁, 호의|명|A2
patience|인내심|명|B1
surprise|놀라움; 놀라게 하다|명|A2
condition|상태, 질환|명|B1
breathing|호흡|명|B1
whisper|속삭임; 속삭이다|명|B1
parade|퍼레이드, 행렬|명|B1
party|파티|명|Pre-A1
game|게임, 경기|명|Pre-A1
soccer|축구|명|Pre-A1
baseball|야구|명|Pre-A1
movie|영화|명|Pre-A1
horror|공포|명|B1
tv|텔레비전|명|Pre-A1
k-pop|케이팝|명|A1
english|영어; 영국의|명|Pre-A1
korean|한국어; 한국의|명|Pre-A1
exam|시험|명|A1
test|시험|명|Pre-A1
course|강좌, 과정|명|A2
classroom|교실|명|Pre-A1
interview|면접, 인터뷰|명|A2
report|보고서; 보고하다|명|A2
deadline|마감일|명|B1
schedule|일정|명|A2
budget|예산|명|B1
file|파일|명|A2
form|양식, 서식|명|A2
projector|프로젝터|명|B1
design|디자인; 설계하다|명|A2
sales|판매, 매출|명|A2
deal|거래 (a good deal: 좋은 거래)|명|A2
order|주문; 주문하다|명|A1
receipt|영수증|명|A2
refund|환불|명|B1
charge|요금; 청구하다|명|B1
credit|신용 (credit card)|명|A2
change|변화, 잔돈; 바꾸다|동|A1
reservation|예약|명|A2
checkout|체크아웃, 계산대|명|B1
check|확인하다; 수표|동|A1
passport|여권|명|A1
baggage|수하물|명|A2
luggage|짐, 수하물|명|A2
claim|주장하다; (짐을) 찾다|동|B1
airport|공항|명|Pre-A1
aisle|통로|명|B1
bus|버스|명|Pre-A1
subway|지하철|명|A1
train|기차|명|Pre-A1
taxi|택시|명|Pre-A1
bathroom|화장실|명|Pre-A1
pharmacy|약국|명|A2
store|가게|명|Pre-A1
shop|가게|명|Pre-A1
fever|열|명|A2
allergy|알레르기|명|B1
allergic|알레르기가 있는|형|B1
password|비밀번호|명|A2
wi-fi|와이파이|명|A1
red-bean|팥|명|B1
hiking|등산|명|A1
black|검은|형|Pre-A1
white|흰|형|Pre-A1
green|초록색의|형|Pre-A1
yellow|노란|형|Pre-A1
gray|회색의|형|A1
pale|창백한, 옅은|형|B1
bright|밝은|형|A1
dark|어두운|형|A1
little|작은; 조금|형|Pre-A1
large|큰|형|A1
high|높은|형|Pre-A1
full|가득 찬, 배부른|형|A1
empty|빈|형|A1
poor|가난한|형|A1
rainy|비 오는|형|Pre-A1
cute|귀여운|형|Pre-A1
pretty|예쁜; 꽤|형|Pre-A1
calm|차분한|형|A2
gentle|부드러운, 온화한|형|A2
loud|시끄러운|형|A1
clear|맑은, 분명한|형|A1
hard|어려운, 단단한; 열심히|형|A1
quick|빠른|형|A1
simple|간단한|형|A1
single|하나의, 단 하나의|형|A2
final|마지막의|형|A2
grand|웅장한|형|B1
ordinary|평범한|형|B1
remarkable|놀라운|형|B2
imaginable|상상할 수 있는|형|C1
risky|위험한|형|B1
unfit|적합하지 않은|형|C1
trusted|신뢰받는|형|B1
own|자신의; 소유하다|형|A2
available|이용할 수 있는|형|B1
missing|없어진|형|A2
starving|몹시 배고픈|형|B1
attached|첨부된|형|B1
central|중앙의|형|B1
next|다음의|형|Pre-A1
last|마지막의, 지난|형|A1
unlike|~와 달리|전|B1
look|보다; ~처럼 보이다|동|Pre-A1
see|보다|동|Pre-A1
say|말하다|동|Pre-A1
tell|말하다, 알려 주다|동|A1
talk|이야기하다|동|Pre-A1
think|생각하다|동|Pre-A1
feel|느끼다|동|Pre-A1
feeling|느낌, 감정|명|A1
give|주다|동|Pre-A1
get|얻다, ~하게 되다|동|Pre-A1
put|놓다, 넣다|동|A1
keep|유지하다, 계속 ~하다|동|A1
hold|잡다, 들다|동|A1
bring|가져오다|동|A1
take|가져가다, 타다|동|Pre-A1
sit|앉다|동|Pre-A1
stand|서다|동|Pre-A1
stop|멈추다|동|Pre-A1
wake|깨다|동|A1
grab|움켜잡다|동|A2
throw|던지다|동|A1
touch|만지다|동|A1
push|밀다|동|A1
hit|치다, 부딪히다|동|A1
set|놓다, 차리다|동|A2
fill|채우다|동|A1
show|보여 주다|동|A1
send|보내다|동|A1
hang|걸다|동|A2
wrap|싸다, 포장하다|동|A2
join|함께하다, 가입하다|동|A1
wave|손을 흔들다; 파도|동|A1
hurry|서두르다|동|A1
chase|쫓다|동|A2
break|깨다, 부수다; 휴식|동|A1
broken|부서진|형|A1
build|짓다|동|A1
begin|시작하다|동|A1
become|~이 되다|동|A1
happen|일어나다|동|A1
return|돌아오다|동|A1
follow|따라가다|동|A1
pass|지나가다|동|A1
place|놓다; 장소|동|A2
mark|표시하다|동|A2
march|행진하다|동|B1
bow|(고개를) 숙이다|동|B1
slip|미끄러지다, 몰래 빠져나가다|동|B1
step|걸음; 걸어가다|동|A2
fade|희미해지다|동|B2
clap|박수 치다|동|A2
cheer|환호하다|동|A2
cry|울다|동|Pre-A1
taste|맛보다|동|A1
order|주문하다|동|A1
owe|빚지다|동|B1
recommend|추천하다|동|A2
explain|설명하다|동|A1
express|표현하다|동|B1
clarify|명확히 하다|동|B2
reply|답장하다|동|A2
receive|받다|동|A2
include|포함하다|동|A2
require|필요로 하다|동|B1
attend|참석하다|동|B1
expect|예상하다|동|A2
remain|여전히 ~이다|동|B1
refuse|거부하다|동|B1
press|누르다|동|A2
own|소유하다|동|A2
kill|죽이다|동|A2
grow|자라다|동|A1
forget|잊다|동|A1
choose|고르다|동|A1
figure|숫자, 형태 (figure out: 알아내다)|명|B1
approach|다가가다; 접근법|동|B1
joke|농담하다|동|A2
suggest|제안하다, 시사하다|동|B1
suppose|생각하다 (be supposed to: ~하기로 되어 있다)|동|B1
control|조절, 통제|명|B1
fit|맞다; 건강한|동|A2
tape|테이프로 붙이다|동|A2
aunt|이모, 고모, 숙모|명|Pre-A1
uncle|삼촌, 이모부, 고모부|명|Pre-A1
cousin|사촌|명|A1
clock|시계 (벽·탁상)|명|Pre-A1
computer|컴퓨터|명|Pre-A1
laptop|노트북 컴퓨터|명|A1
desk|책상|명|Pre-A1
fridge|냉장고|명|A1
toilet|변기, 화장실|명|A1
gate|문, 탑승구|명|A1
downtown|시내, 시내에|명|A2
town|마을, 소도시|명|A1
restaurant|식당|명|Pre-A1
email|이메일; 이메일을 보내다|명|A1
online|온라인의, 온라인으로|형|A1
eight|여덟|수|Pre-A1
fifth|다섯 번째의|수|A1
face|얼굴|명|Pre-A1
voice|목소리|명|A1
fruit|과일|명|Pre-A1
rice|쌀, 밥|명|Pre-A1
shirt|셔츠|명|Pre-A1
math|수학|명|Pre-A1
tennis|테니스|명|Pre-A1
yoga|요가|명|A1
jog|조깅하다|동|A1
july|7월|명|Pre-A1
strong|강한, 튼튼한|형|A1
more|더 많은, 더|한|A1
most|가장 많은, 대부분의|한|A2
less|더 적은|한|A2
enough|충분한|한|A1
anywhere|어디에서도, 어디든|부|A2
nowhere|아무 데도 ~ 않다|부|B1
freeze|얼다|동|A2
spread|퍼지다, 펼치다|동|B1
wear|입다, 착용하다|동|Pre-A1
boil|끓다, 끓이다|동|A2
`;

export const COMMON_LEXICON: [string, string, string, string][] = RAW.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split('|') as [string, string, string, string]);

/** 이야기 속 인물·지명 (뜻 확인만, 단어장 저장 대상 아님) */
export const PROPER_NOUNS: Record<string, string> = {
  mina: '미나 (사람 이름)', jun: '준 (사람 이름)', sora: '소라 (사람 이름)', yuna: '유나 (사람 이름)', hana: '하나 (사람 이름)', mossy: '모시 (캐릭터 이름)', lumi: '루미 (캐릭터 이름)',
  pepper: '페퍼 (고양이 이름) · 일반 명사로는 후추', bolt: '볼트 (로봇 이름) · 일반 명사로는 나사못', della: '델라 (사람 이름)', jim: '짐 (사람 이름)', kang: '강 (성씨)',
  'seo-yun': '서윤 (사람 이름)', jisoo: '지수 (사람 이름)', jake: '제이크 (사람 이름)', jane: '제인 (사람 이름)', tom: '톰 (사람 이름)', kim: '김 (성씨)', lee: '이 (성씨)',
  korea: '한국 (나라 이름)', seoul: '서울 (도시 이름)', busan: '부산 (도시 이름)', asia: '아시아 (대륙 이름)', north: '북쪽 (North Wind: 북풍)', m: '(I’m 의 m: am)', p: '(알파벳 p)', x: '(알파벳 X · 표시)',
};
