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

def slug(w):
    return re.sub(r'[^a-z0-9]+', '-', w.lower()).strip('-') or 'x'

def main():
    items = json.loads((SRC / 'list.json').read_text())
    by_hw = {e['hw']: e for e in items}
    bands = {'beginner': [], 'intermediate': [], 'advanced': []}
    seen = set()
    stats = {}
    for f in sorted(SRC.glob('out-*.txt')):
        for line in f.read_text(encoding='utf-8').splitlines():
            if not line.strip(): continue
            parts = [x.strip() for x in line.split('|')]
            if len(parts) != 4: continue
            hw, m, ex, exko = parts
            e = by_hw.get(hw)
            if not e or not m or not ex or not exko: continue
            if not re.match(r'[A-Za-z]', hw): continue  # 'm, 're 같은 축약 조각은 단독 단어가 아니므로 제외
            key = hw.lower()
            if key in seen: continue
            seen.add(key)
            idv = f'wb-{slug(hw)}'
            rec = {'id': idv, 'w': hw, 'pos': e['pos'], 'lv': e['lv'], 'm': m, 'ipa': ipa(hw), 'ko': ko_pron(hw), 'ex': ex, 'exKo': exko}
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
    print(json.dumps(meta, ensure_ascii=False))
    for w in ['about', 'hello', 'computer', 'beautiful', 'quickly', 'world', 'station', 'yesterday']:
        print(w, ko_pron(w), ipa(w))

if __name__ == '__main__':
    main()
