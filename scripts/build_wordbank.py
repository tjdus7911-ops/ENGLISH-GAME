"""영단어 사전(초급·중급·고급) 빌드.

입력
  content-src/wordbank/list.json       : CEFR-J 1.5 + Octanove C1/C2 단어 목록에서 뽑은 표제어·품사·레벨 (출처: openlanguageprofiles/olp-en-cefrj)
  content-src/wordbank/out-NN.txt       : 표제어|한국어 뜻|예문|예문 번역 (작성 완료된 묶음만)
출력
  public/wordbank/{beginner,intermediate,advanced}.json
  public/wordbank/meta.json
발음기호: CMU Pronouncing Dictionary(BSD) 기반 자동 변환 미국식 IPA.
한글 발음: 같은 음소에서 규칙으로 만든 '참고용' 근사 표기 (전문가 검수 대상).
뜻·예문·번역이 없는 단어는 출력하지 않는다 (빈 카드·가짜 데이터 금지).
사용: python3 scripts/build_wordbank.py
"""
import json, re, pathlib, sys, cmudict
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from gen_ipa import word_ipa  # noqa: E402  (gen_ipa 는 import 시 vocab-ipa.json 을 다시 쓴다 — 결과는 동일)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'content-src/wordbank'
OUT = ROOT / 'public/wordbank'
CMU = cmudict.dict()

# 학습용으로 부적절한 비하 표현은 제외, 원본 목록의 오탈자는 바로잡는다
EXCLUDE = {'gook', 'cripple'}
RENAME = {'porten': 'portent'}

BAND = {'A1': 'beginner', 'A2': 'beginner', 'B1': 'intermediate', 'B2': 'intermediate', 'C1': 'advanced', 'C2': 'advanced'}

# ── 한글 발음 근사 ──
CHO = {'ㄱ':0,'ㄲ':1,'ㄴ':2,'ㄷ':3,'ㄸ':4,'ㄹ':5,'ㅁ':6,'ㅂ':7,'ㅃ':8,'ㅅ':9,'ㅆ':10,'ㅇ':11,'ㅈ':12,'ㅉ':13,'ㅊ':14,'ㅋ':15,'ㅌ':16,'ㅍ':17,'ㅎ':18}
JUNG = {'ㅏ':0,'ㅐ':1,'ㅑ':2,'ㅒ':3,'ㅓ':4,'ㅔ':5,'ㅕ':6,'ㅖ':7,'ㅗ':8,'ㅘ':9,'ㅙ':10,'ㅚ':11,'ㅛ':12,'ㅜ':13,'ㅝ':14,'ㅞ':15,'ㅟ':16,'ㅠ':17,'ㅡ':18,'ㅢ':19,'ㅣ':20}
JONG = {'':0,'ㄱ':1,'ㄴ':4,'ㄹ':8,'ㅁ':16,'ㅂ':17,'ㅅ':19,'ㅇ':21}
ONSET = {'B':'ㅂ','CH':'ㅊ','D':'ㄷ','DH':'ㄷ','F':'ㅍ','G':'ㄱ','HH':'ㅎ','JH':'ㅈ','K':'ㅋ','L':'ㄹ','M':'ㅁ','N':'ㄴ','NG':'ㅇ','P':'ㅍ','R':'ㄹ','S':'ㅅ','SH':'ㅅ','T':'ㅌ','TH':'ㅆ','V':'ㅂ','Z':'ㅈ','ZH':'ㅈ'}
CODA = {'M':'ㅁ','N':'ㄴ','NG':'ㅇ','L':'ㄹ','K':'ㄱ','P':'ㅂ','T':'ㅅ','D':'ㅅ','B':'ㅂ','G':'ㄱ'}
VOW = {'AA':['ㅏ'],'AE':['ㅐ'],'AH':['ㅓ'],'AO':['ㅗ'],'AW':['ㅏ','ㅜ'],'AY':['ㅏ','ㅣ'],'EH':['ㅔ'],'ER':['ㅓ'],'EY':['ㅔ','ㅣ'],'IH':['ㅣ'],'IY':['ㅣ'],'OW':['ㅗ'],'OY':['ㅗ','ㅣ'],'UH':['ㅜ'],'UW':['ㅜ']}
GLIDE_W = {'ㅏ':'ㅘ','ㅐ':'ㅙ','ㅓ':'ㅝ','ㅗ':'ㅝ','ㅔ':'ㅞ','ㅣ':'ㅟ','ㅜ':'ㅜ'}
GLIDE_Y = {'ㅏ':'ㅑ','ㅐ':'ㅒ','ㅓ':'ㅕ','ㅗ':'ㅛ','ㅜ':'ㅠ','ㅔ':'ㅖ','ㅣ':'ㅣ'}

def syl(cho, jung, jong=''):
    return chr(0xAC00 + (CHO[cho] * 21 + JUNG[jung]) * 28 + JONG[jong])

def hangul_word(phones):
    ph = [re.sub(r'\d', '', p) for p in phones]
    out = []  # [cho, jung, jong]
    i = 0
    pending = []  # 모음 앞에 쌓인 자음
    def flush_cons(cs):
        for c in cs:
            if c in ('W',): out.append(['ㅇ', 'ㅜ', '']); continue
            if c in ('Y',): out.append(['ㅇ', 'ㅣ', '']); continue
            if c in ('R',) and out and not out[-1][2]: continue  # 미국식 r 은 생략
            v = 'ㅣ' if c in ('CH', 'JH', 'SH', 'ZH') else 'ㅡ'
            out.append([ONSET[c], v, ''])
    while i < len(ph):
        p = ph[i]
        if p in VOW:
            vs = VOW[p]
            glide = None
            if pending and pending[-1] in ('W', 'Y'):
                glide = pending.pop()
            onset = pending.pop() if pending else None
            flush_cons(pending); pending = []
            v0 = vs[0]
            if glide == 'W': v0 = GLIDE_W.get(v0, v0)
            if glide == 'Y': v0 = GLIDE_Y.get(v0, v0)
            cho = ONSET.get(onset, 'ㅇ') if onset else 'ㅇ'
            if onset in ('SH',) and glide is None: v0 = GLIDE_Y.get(v0, v0)  # sh + 모음 → 셔/쇼/슈
            if onset == 'NG': cho = 'ㅇ'
            out.append([cho, v0, ''])
            for v in vs[1:]: out.append(['ㅇ', v, ''])
            i += 1
            continue
        # 자음: 뒤가 모음이면 다음 음절 첫소리, 아니면 받침 또는 '으' 음절
        nxt = ph[i + 1] if i + 1 < len(ph) else None
        if nxt in VOW or (nxt in ('W', 'Y') and i + 2 < len(ph) and ph[i + 2] in VOW):
            if p == 'L' and out and not out[-1][2] and not pending: out[-1][2] = 'ㄹ'  # hello → 헬로
            pending.append(p)
        elif not pending and out and not out[-1][2] and p in CODA and len(out[-1]) and (nxt is None or nxt not in VOW):
            out[-1][2] = CODA[p]
            if p == 'L' and nxt in ('M', 'N'): pass
        else:
            pending.append(p)
        i += 1
    flush_cons(pending)
    return ''.join(syl(c, v, j) for c, v, j in out)

def ko_pron(phrase):
    words = re.findall(r"[A-Za-z']+", phrase)
    res = []
    for w in words:
        w2 = w.lower()
        if w2 not in CMU: return ''
        res.append(hangul_word(CMU[w2][0]))
    return ' '.join(res)

def ipa(phrase):
    parts = [word_ipa(x) for x in re.findall(r"[A-Za-z']+", phrase)]
    if not parts or any(p is None for p in parts): return ''
    return '/' + ' '.join(parts) + '/'

# ── 주제 자동 분류 (한국어 뜻·영단어 키워드 기반, 검수 대상) ──
TOPIC_KW = [
  ('food', '음식 먹 마시 요리 과일 채소 고기 빵 국수 맛 식사 음료 술 커피 차(마시 쌀 밥 우유 설탕 소금 접시 그릇 수프 케이크 사탕 디저트 굽 끓 식당 메뉴 반찬 양념 조미 곡물 견과 버터 치즈 달걀 계란 생선 해산물'),
  ('nature', '동물 새 물고기 곤충 나무 꽃 풀 숲 산 강 바다 호수 하늘 날씨 비 눈(날씨 바람 구름 계절 봄 여름 가을 겨울 땅 흙 돌 바위 해 달 별 자연 식물 잎 씨 섬 해변 사막 기후 환경 지구 우주 행성 화산 지진 폭풍 가뭄 홍수 야생 짐승 털 깃털 날개 꼬리 둥지 해안 계곡 언덕 들판 열매 뿌리 가지 꽃잎 생물 멸종'),
  ('people', '가족 아버지 어머니 엄마 아빠 형 누나 언니 오빠 동생 아들 딸 남편 아내 아이 아기 사람 친구 이웃 손님 부모 조부모 할머니 할아버지 삼촌 이모 고모 사촌 조카 남자 여자 소년 소녀 청소년 노인 어른 성인 연인 배우자 이름 나이 인간 인물 동료 부부 결혼 이혼 출생 탄생'),
  ('feelings', '감정 기분 기쁜 슬픈 화난 화나 행복 두려 무서 걱정 불안 놀란 놀라 지루 외로 부끄 자랑 사랑 미워 싫어 좋아하 즐거 괴로 우울 긴장 편안 초조 실망 만족 희망 분노 질투 후회 감사 성격 친절 정직 용감 겸손 거만 게으 부지런 예의 무례 수줍 다정 냉정 쾌활 짜증 스트레스 마음 고통 공포 열정 동정 연민 경멸 혐오 자부심 자존심'),
  ('travel', '여행 교통 기차 버스 비행기 공항 역 길 도로 지도 차 자동차 택시 지하철 배(타 배를 운전 승객 표(승차 호텔 관광 휴가 여권 짐 방향 북쪽 남쪽 동쪽 서쪽 거리 도시 마을 나라 국가 해외 외국 장소 위치 이동 도착 출발 운행 항구 다리(건 터널 교차로 신호등 주차 연료 속도 노선 일정 예약'),
  ('shopping', '쇼핑 가게 상점 시장 사다 팔 판매 구매 가격 값 돈 현금 지불 계산 영수증 할인 비싼 싼 저렴 옷 셔츠 바지 치마 신발 모자 가방 색 빨간 파란 노란 초록 검은 흰 크기 사이즈 은행 예금 대출 이자 비용 요금 세금 임금 월급 경제 상품 고객 소비 주문 배송 브랜드 광고'),
  ('home', '집 방 부엌 거실 침실 화장실 욕실 문 창문 벽 바닥 지붕 가구 침대 의자 탁자 책상 소파 냉장고 세탁 청소 씻 빨래 설거지 정원 마당 열쇠 계단 이불 베개 수건 칫솔 생활 일상 잠 자다 일어나 아파트 이사 가정 살림 전등 램프 커튼 거울'),
  ('school', '학교 학생 선생 교사 수업 공부 숙제 시험 성적 교실 대학 학년 과목 수학 과학 역사 지리 미술 음악 체육 교육 강의 학위 졸업 입학 연구 논문 직업 일하 회사 사무실 직장 업무 회의 동료 고용 취업 사업 경력 면접 상사 부서 근무 은퇴 노동 전문 기술 과제 프로젝트 보고서'),
  ('society', '사회 정치 정부 법 법률 경찰 범죄 법원 판사 선거 투표 국회 대통령 시민 권리 의무 전쟁 평화 군대 군인 종교 문화 전통 역사적 경제 산업 기업 시장(경제 국제 세계 인구 공동체 단체 조직 정책 제도 과학 기술 컴퓨터 인터넷 디지털 데이터 의학 병원 의사 질병 치료 건강 약 증상 환자 수술 연구 실험 이론 매체 언론 뉴스 방송 신문'),
  ('talk', '말하 말 대화 질문 대답 묻 설명 이야기 인사 부탁 요청 제안 동의 반대 약속 사과 감사합니다 미안 안녕 네 아니 실례 의견 주장 논쟁 토론 전화 메시지 편지 이메일 소리치 속삭 외치 농담 칭찬 비판 불평 경고 소개 발표 연설 언어 단어 문장 문법 번역 의미 뜻'),
]
def topic_of(meaning, pos):
    toks = [t for t in re.split(r'[,;()·/\s~?!.]+', re.sub(r'\((명|동|형|부|대|전|접|한|수|조|감)\)', ' ', meaning)) if t]
    best, score = 'general', 0
    for tp, kws in TOPIC_KW:
        sc = 0
        for k in kws.split():
            k = k.split('(')[0]
            if not k: continue
            if len(k) == 1: sc += sum(1 for t in toks if t == k)
            else: sc += sum(1 for t in toks if t.startswith(k) or (len(k) >= 2 and k in t))
        if sc > score: best, score = tp, sc
    return best

def slug(w):
    return re.sub(r'[^a-z0-9]+', '-', w.lower()).strip('-') or 'x'

def main():
    items = json.loads((SRC / 'list.json').read_text())
    by_hw = {e['hw']: e for e in items}
    bands = {'beginner': [], 'intermediate': [], 'advanced': []}
    seen = set()
    used_ids = set()
    stats = {}
    for f in sorted(SRC.glob('out-*.txt')):
        for line in f.read_text(encoding='utf-8').splitlines():
            if not line.strip(): continue
            parts = [x.strip() for x in line.split('|')]
            if len(parts) != 4: continue
            hw, m, ex, exko = parts
            e = by_hw.get(hw)
            if not e or not m or not ex or not exko: continue
            if not re.match(r'[A-Za-z]', hw) or hw.lower() in EXCLUDE: continue  # 'm, 're 같은 축약 조각은 단독 단어가 아니므로 제외
            key = hw.lower()
            if key in seen: continue
            seen.add(key)
            idv = f'wb-{slug(hw)}'
            hw_out = RENAME.get(hw, hw)
            idv = f'wb-{slug(hw_out)}'
            if idv in used_ids: idv = f'{idv}-2'  # face to face / face-to-face 처럼 철자만 다른 별도 표제어
            used_ids.add(idv)
            rec = {'id': idv, 'w': hw_out, 'pos': e['pos'], 'lv': e['lv'], 'm': m, 'ipa': ipa(hw_out), 'ko': ko_pron(hw_out), 'ex': ex, 'exKo': exko, 'tp': topic_of(m, e['pos'])}
            bands[BAND[e['lv']]].append(rec)
            stats[e['lv']] = stats.get(e['lv'], 0) + 1
    OUT.mkdir(parents=True, exist_ok=True)
    order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    for b, rows in bands.items():
        rows.sort(key=lambda r: (order.index(r['lv']), r['w'].lower()))
        (OUT / f'{b}.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')))
    total_list = {lv: sum(1 for e in items if e['lv'] == lv) for lv in order}
    meta = {'byLevel': stats, 'byBand': {b: len(r) for b, r in bands.items()}, 'total': sum(stats.values()), 'listTotal': total_list,
            'source': 'CEFR-J Wordlist Version 1.5 (Tono Laboratory, TUFS) · Octanove Vocabulary Profile C1/C2 1.0 (CC BY-SA 4.0) via openlanguageprofiles/olp-en-cefrj'}
    (OUT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False))
    tps = {}
    for rows in bands.values():
        for r in rows: tps[r['tp']] = tps.get(r['tp'], 0) + 1
    meta['byTopic'] = tps
    (OUT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False))
    print(json.dumps(meta, ensure_ascii=False))
    for w in ['about', 'hello', 'computer', 'beautiful', 'quickly', 'world', 'station', 'yesterday']:
        print(w, ko_pron(w), ipa(w))

if __name__ == '__main__':
    main()
