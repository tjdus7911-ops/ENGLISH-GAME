/**
 * 목표 문장과 음성 인식(STT) 결과를 단어 단위로 정렬해 비교한다.
 * ⚠ 이 결과는 "음성 인식기가 무엇을 들었는가"이며 발음 정확도 점수가 아니다.
 */
export type DiffOp =
  | { op: 'equal'; expected: string; heard: string }
  | { op: 'missing'; expected: string }
  | { op: 'extra'; heard: string }
  | { op: 'substituted'; expected: string; heard: string };

const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
  '11': 'eleven', '12': 'twelve', '15': 'fifteen', '20': 'twenty', '30': 'thirty',
};

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => {
      if (NUMBER_WORDS[w]) return [NUMBER_WORDS[w]];
      // 축약형은 인식기마다 다르게 출력되므로 풀어서 비교
      const m: Record<string, string[]> = {
        "i'm": ['i', 'am'], "don't": ['do', 'not'], "doesn't": ['does', 'not'], "can't": ['cannot'], "isn't": ['is', 'not'],
        "aren't": ['are', 'not'], "it's": ['it', 'is'], "that's": ['that', 'is'], "what's": ['what', 'is'], "let's": ['let', 'us'],
        "he's": ['he', 'is'], "she's": ['she', 'is'], "you're": ['you', 'are'], "we're": ['we', 'are'], "they're": ['they', 'are'],
        "where's": ['where', 'is'], "there's": ['there', 'is'], "i'd": ['i', 'would'],
      };
      return m[w] ?? [w];
    })
    .flatMap((w) => (w === 'cannot' ? ['can', 'not'] : [w]));
}

export function compareWords(target: string, heard: string): DiffOp[] {
  const a = tokenize(target);
  const b = tokenize(heard);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const ops: DiffOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      ops.push(a[i - 1] === b[j - 1] ? { op: 'equal', expected: a[i - 1], heard: b[j - 1] } : { op: 'substituted', expected: a[i - 1], heard: b[j - 1] });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ op: 'missing', expected: a[i - 1] });
      i--;
    } else {
      ops.push({ op: 'extra', heard: b[j - 1] });
      j--;
    }
  }
  return ops.reverse();
}

export function summarizeDiff(ops: DiffOp[]) {
  const total = ops.filter((o) => o.op !== 'extra').length;
  const matched = ops.filter((o) => o.op === 'equal').length;
  return {
    total,
    matched,
    missing: ops.flatMap((o) => (o.op === 'missing' ? [o.expected] : [])),
    extra: ops.flatMap((o) => (o.op === 'extra' ? [o.heard] : [])),
    substituted: ops.flatMap((o) => (o.op === 'substituted' ? [{ expected: o.expected, heard: o.heard }] : [])),
    allMatched: total > 0 && matched === total && !ops.some((o) => o.op === 'extra'),
  };
}
