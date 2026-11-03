import type { Page } from '@playwright/test';
export async function quickStart(page: Page) {
  await page.goto('/#/onboarding');
  await page.getByRole('button', { name: '일상 회화' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '레벨 진단 시작' }).click();
  await page.getByRole('button', { name: '건너뛰고 A1부터 시작' }).click();
  await page.getByTestId('village').waitFor();
  const skip = page.getByTestId('story-skip');
  if (await skip.isVisible().catch(() => false)) await skip.click();
}
