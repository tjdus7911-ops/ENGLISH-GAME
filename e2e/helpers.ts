import { expect, type Page } from '@playwright/test';
import { questionById } from '../src/lib/questionIndex';

/** 화면에 표시된 문제를 (정답 데이터로) 풀고 다음으로 넘어간다. correct=false 면 일부러 틀린다. */
export async function answerCurrent(page: Page, correct = true) {
  const q = page.getByTestId('question').first();
  await expect(q).toBeVisible();
  const qid = (await q.getAttribute('data-qid'))!;
  const data = questionById(qid);
  if (!data) throw new Error(`unknown question ${qid}`);
  if (data.type === 'mc' || data.type === 'translate') {
    let choice = data.answers[0];
    if (!correct) {
      const texts = await q.locator('div.grid.gap-2 > button').allInnerTexts();
      choice = texts.map((t) => t.trim()).find((t) => !data.answers.includes(t))!;
    }
    await q.getByRole('button', { name: choice, exact: true }).first().click({ timeout: 8000 }).catch((e) => { throw new Error(`qid=${qid} choice=${choice}: ${e.message}`); });
  } else if (data.type === 'order') {
    const target = correct ? data.answers[0].replace(/[.?!]$/, '').split(' ') : [...data.tokens!].reverse();
    const bank = q.locator('div.flex.flex-wrap.gap-2.mt-3 > button');
    for (const t of target) {
      const n = await bank.count();
      for (let k = 0; k < n; k++) {
        const b = bank.nth(k);
        if ((await b.isEnabled()) && (await b.innerText()).trim() === t) { await b.click(); break; }
      }
    }
    await q.getByRole('button', { name: '확인' }).click();
  } else {
    await q.getByLabel('정답 입력').fill(correct ? data.answers[0] : 'zzz wrong');
    await q.getByRole('button', { name: '확인' }).click();
  }
  await expect(page.getByRole('status').filter({ hasText: correct ? '정답이에요' : '오답이에요' })).toBeVisible();
}

export async function runQuiz(page: Page, correct: boolean | ((i: number) => boolean) = true) {
  await dismissModals(page);
  for (let i = 0; i < 60; i++) {
    await answerCurrent(page, typeof correct === 'function' ? correct(i) : correct);
    const next = page.getByRole('button', { name: /다음 문제|결과 보기/ });
    const label = await next.innerText();
    await next.click();
    if (label.includes('결과 보기')) return;
    await expect(page.getByRole('status').filter({ hasText: /정답이에요|오답이에요/ })).toHaveCount(0);
  }
  throw new Error('quiz too long');
}

/** 축하 모달·토스트 닫기 */
export async function dismissModals(page: Page) {
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(150);
    const skip = page.getByTestId('story-skip');
    if (await skip.isVisible().catch(() => false)) { await skip.click(); continue; }
    const b = page.getByRole('button', { name: '좋아요!' });
    if (await b.isVisible().catch(() => false)) { await b.click(); continue; }
    break;
  }
}

/** 모의 음성 인식기: 시작 후 지정된 문장을 인식 결과로 돌려준다 */
export const MOCK_STT = `
  window.__mockTranscript = window.__mockTranscript || null;
  window.__mockSpeechRecognition = class {
    constructor(){ this.lang='en-US'; this.onresult=null; this.onerror=null; this.onend=null; }
    start(){ this._t = setTimeout(()=>{ const t = window.__mockTranscript ?? ''; this.onresult && this.onresult({ results: [Object.assign([{ transcript: t, confidence: 0.9 }], { isFinal: true })] }); }, 300); }
    stop(){ clearTimeout(this._t); const t = window.__mockTranscript ?? ''; this.onresult && this.onresult({ results: [Object.assign([{ transcript: t, confidence: 0.9 }], { isFinal: true })] }); setTimeout(()=> this.onend && this.onend(), 50); }
    abort(){ this.stop(); }
  };
`;
