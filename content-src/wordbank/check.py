"""사용: python3 check.py NN  → in-NN.tsv 와 out-NN.txt 비교 검증"""
import sys,re
import os; os.chdir(os.path.dirname(os.path.abspath(__file__))); n=sys.argv[1]
inp=[l.rstrip('\n').split('\t') for l in open(f'in-{n}.tsv',encoding='utf-8') if l.strip()]
try: out=[l.rstrip('\n') for l in open(f'out-{n}.txt',encoding='utf-8') if l.strip()]
except FileNotFoundError: print('out file missing'); sys.exit(1)
errs=[]
if len(out)!=len(inp): errs.append(f'line count {len(out)} != {len(inp)}')
seen_ex=set()
for i,(a,l) in enumerate(zip(inp,out)):
  f=l.split('|')
  if len(f)!=4: errs.append(f'{i+1}: need 4 fields: {l[:60]}'); continue
  hw,mean,exa,ko=[x.strip() for x in f]
  if hw!=a[0]: errs.append(f'{i+1}: headword {hw!r} != {a[0]!r}')
  if not re.search('[가-힣]',mean): errs.append(f'{i+1} {hw}: meaning must be Korean')
  if len(mean)>60: errs.append(f'{i+1} {hw}: meaning too long ({len(mean)})')
  if not re.search('[가-힣]',ko): errs.append(f'{i+1} {hw}: translation must be Korean')
  if re.search('[가-힣]',exa) or len(exa.split())<4 or len(exa.split())>20: errs.append(f'{i+1} {hw}: example must be English, 4-20 words')
  if exa[-1:] not in '.?!"': errs.append(f'{i+1} {hw}: example must end with punctuation')
  stem=re.sub(r"[^a-z' -]",'',hw.lower()).strip()
  core=stem[:max(3,len(stem)-3)] if len(stem)>4 else stem
  if core and core.split()[0] not in exa.lower(): errs.append(f'{i+1} {hw}: example should contain the word (or its form)')
  if exa.lower() in seen_ex: errs.append(f'{i+1} {hw}: duplicate example')
  seen_ex.add(exa.lower())
  if re.search(r'(TODO|TBD|\?\?\?|예문|example)',l, re.I) and 'example' not in hw.lower(): errs.append(f'{i+1} {hw}: placeholder text')
print('OK' if not errs else f'{len(errs)} problems'); print('\n'.join(errs[:60]))
