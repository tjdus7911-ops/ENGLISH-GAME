# 영단어 사전 원본 데이터

- `list.json`: 표제어·품사·CEFR 레벨. 출처
  - The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies (연구·상업 목적 무료 사용, 출처 표기 조건). via https://github.com/openlanguageprofiles/olp-en-cefrj
  - Octanove Vocabulary Profile C1/C2 ver 1.0 — Octanove Labs, **CC BY-SA 4.0** (C1·C2 레벨 단어 목록. 이 목록에서 파생된 데이터는 같은 라이선스로 공개)
- `in-NN.tsv`: 작성 묶음(350단어씩), `out-NN.txt`: `표제어|한국어 뜻|예문|예문 번역` — 앱에서 새로 작성한 내용 (전문가 검수 필요)
- `check.py NN`: 묶음 검증 (줄 수·필드·한국어 여부·예문 길이·예문에 단어 포함·중복 예문)
- 빌드: `python3 scripts/build_wordbank.py` → `public/wordbank/*.json` (발음기호: CMU 사전 자동 변환, 한글 발음: 참고용 자동 근사)
- 뜻·예문이 작성되지 않은 단어는 앱에 공개하지 않습니다.
