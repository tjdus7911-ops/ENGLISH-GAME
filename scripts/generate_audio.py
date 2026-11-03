"""콘텐츠 음성(mp3) 생성기 — Piper TTS (오프라인 신경망 TTS) + LibriTTS 모델(CC BY 4.0).

사전 준비 (README 참고):
  PIPER_DIR 아래에 piper/ (rhasspy/piper 2023.11.14-2 linux x86_64 릴리스)와
  en-us-libritts-high/en-us-libritts-high.onnx(.json) 를 둔다.
사용:
  npx tsx scripts/export-audio-manifest.ts && python3 scripts/generate_audio.py
이미 존재하는 mp3 는 건너뛴다 (--force 로 전부 재생성).
"""
import json, os, subprocess, sys, pathlib, tempfile, concurrent.futures as cf

ROOT = pathlib.Path(__file__).resolve().parent.parent
PIPER_DIR = pathlib.Path(os.environ.get('PIPER_DIR', '/tmp/claude-0/tts'))
PIPER = PIPER_DIR / 'piper' / 'piper'
MODEL = PIPER_DIR / 'en-us-libritts-high' / 'en-us-libritts-high.onnx'
# LibriTTS 화자 id (피치 분석으로 선정: f≈241Hz, f2≈245Hz, m≈105Hz, m2≈117Hz)
SPEAKERS = {'f': 180, 'f2': 60, 'm': 720, 'm2': 480}
LENGTH_SCALE = '1.08'  # 학습자를 위해 약간 느리게
PUBLIC = ROOT / 'public'
FORCE = '--force' in sys.argv

man = json.loads((ROOT / 'scripts/.audio-manifest.json').read_text())
work = pathlib.Path(tempfile.mkdtemp(prefix='tts-', dir=os.environ.get('TMPDIR', '/tmp')))

def mp3(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-af', 'adelay=120|120,apad=pad_dur=0.15,loudnorm=I=-18:TP=-2',
                    '-ac', '1', '-ar', '22050', '-b:a', '40k', str(dst)], check=True)

def synth(voice, items):
    # 중단돼도 진행분이 남도록 80개씩 나눠 합성·변환
    for k in range(0, len(items), 80):
        synth_chunk(voice, items[k:k + 80], k)
    return len(items)

def synth_chunk(voice, items, base):
    jl = work / f'{voice}-{base}.jsonl'
    with jl.open('w') as f:
        for i, it in enumerate(items):
            f.write(json.dumps({'text': it['text'], 'output_file': str(work / f'{voice}-{base + i}.wav'), 'speaker_id': SPEAKERS[voice]}) + '\n')
    with jl.open() as fin:
        subprocess.run([str(PIPER), '-m', str(MODEL), '--json-input', '-q', '--length_scale', LENGTH_SCALE], stdin=fin, check=True,
                       stdout=subprocess.DEVNULL, cwd=str(PIPER_DIR / 'piper'))
    for i, it in enumerate(items):
        mp3(work / f'{voice}-{base + i}.wav', PUBLIC / it['path'])
        (work / f'{voice}-{base + i}.wav').unlink(missing_ok=True)

todo = [it for it in man['items'] if FORCE or not (PUBLIC / it['path']).exists()]
by_voice = {}
for it in todo: by_voice.setdefault(it['voice'], []).append(it)
print('to synthesize:', {k: len(v) for k, v in by_voice.items()})
with cf.ThreadPoolExecutor(max_workers=2) as ex:
    for n in ex.map(lambda kv: synth(*kv), by_voice.items()): print('done', n)

# 대화 전체 음성: 줄 사이 0.5초 간격
for c in man['concat']:
    out = PUBLIC / c['out']
    if out.exists() and not FORCE: continue
    lst = work / 'concat.txt'
    sil = work / 'sil.mp3'
    if not sil.exists():
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-t', '0.5', '-b:a', '40k', str(sil)], check=True)
    lines = []
    for p in c['parts']:
        lines += [f"file '{PUBLIC / p}'", f"file '{sil}'"]
    lst.write_text('\n'.join(lines))
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-ac', '1', '-ar', '22050', '-b:a', '40k', str(out)], check=True)
print('concat done')
