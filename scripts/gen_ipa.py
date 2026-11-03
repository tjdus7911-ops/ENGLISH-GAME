"""vocab-data.ts 의 단어에 대해 CMU Pronouncing Dictionary(BSD) 기반 미국식 IPA 를 생성한다.
자동 변환 결과이므로 전문가 검수 대상이다. 사용: python3 scripts/gen_ipa.py"""
import json, re, pathlib, cmudict

ROOT = pathlib.Path(__file__).resolve().parent.parent
d = cmudict.dict()
V = {'AA':'ɑ','AE':'æ','AH':'ʌ','AO':'ɔ','AW':'aʊ','AY':'aɪ','EH':'ɛ','ER':'ɝ','EY':'eɪ','IH':'ɪ','IY':'i','OW':'oʊ','OY':'ɔɪ','UH':'ʊ','UW':'u'}
C = {'B':'b','CH':'tʃ','D':'d','DH':'ð','F':'f','G':'ɡ','HH':'h','JH':'dʒ','K':'k','L':'l','M':'m','N':'n','NG':'ŋ','P':'p','R':'r','S':'s','SH':'ʃ','T':'t','TH':'θ','V':'v','W':'w','Y':'j','Z':'z','ZH':'ʒ'}
ONSET2 = {('s',x) for x in 'ptkmnlw'} | {(x,y) for x in ['p','b','t','d','k','ɡ','f','θ','ʃ'] for y in ['r','l','w','j']}
OVERRIDE = {'okay': 'oʊˈkeɪ', 'anytime': 'ˈɛniˌtaɪm', 'restroom': 'ˈrɛstˌrum', 'homework': 'ˈhoʊmˌwɝk', 'classmate': 'ˈklæsˌmeɪt', 'weekend': 'ˈwikˌɛnd'}

def word_ipa(w):
    w = w.lower()
    if w in OVERRIDE: return OVERRIDE[w]
    if w not in d: return None
    ph = d[w][0]
    segs = []  # (ipa, isVowel, stress)
    for p in ph:
        m = re.match(r'([A-Z]+)(\d)?', p); base, st = m.group(1), m.group(2)
        if base in V:
            v = V[base]
            if base == 'AH' and st == '0': v = 'ə'
            if base == 'ER' and st == '0': v = 'ɚ'
            if base == 'IY' and st == '0': v = 'i'
            segs.append([v, True, st])
        else:
            segs.append([C[base], False, None])
    prim = [i for i, s in enumerate(segs) if s[1] and s[2] == '1']
    for i in prim[:-1]: segs[i][2] = '2'  # 주강세가 여러 개면 마지막만 주강세
    nv = sum(1 for s in segs if s[1])
    out = [s[0] for s in segs]
    marks = {}
    for i, s in enumerate(segs):
        if s[1] and s[2] in ('1', '2') and nv > 1:
            j = i
            if j-1 >= 0 and not segs[j-1][1]:
                j -= 1
                if j-1 >= 0 and not segs[j-1][1] and (segs[j-1][0], segs[j][0]) in ONSET2 and not (j-1 == 0 and False):
                    # 앞 음절 모음 뒤에 자음이 하나 이상 남는 경우에만 2자음 onset
                    if j-2 < 0 or segs[j-2][1] is False or True:
                        j -= 1
            # 단어 첫머리 자음군은 전부 onset
            k = j
            while k-1 >= 0 and not segs[k-1][1] and all(not segs[t][1] for t in range(0, k)):
                k -= 1
            marks[k] = 'ˈ' if s[2] == '1' else 'ˌ'
    res = ''.join((marks.get(i, '') + out[i]) for i in range(len(out)))
    return res

def ipa(phrase):
    parts = [word_ipa(x) for x in re.findall(r"[A-Za-z']+", phrase)]
    if any(p is None for p in parts): return None
    return '/' + ' '.join(parts) + '/'

src = (ROOT / 'src/content/vocab-data.ts').read_text()
out, missing = {}, []
for line in src.splitlines():
    if '|' not in line or line.startswith('//'): continue
    word = line.split('|')[0]
    r = ipa(word)
    if r: out[word] = r
    else: missing.append(word)
(ROOT / 'src/content/vocab-ipa.json').write_text(json.dumps(out, ensure_ascii=False, indent=0))
print(len(out), 'generated; missing:', missing)
