import { useEffect } from 'react';
import { useApp } from '@/store/app';

/** 학습 화면(게임·설정 화면 제외)에 머문 시간을 15초 단위로 기록. 화면이 숨겨지면 세지 않는다. */
const NON_STUDY = [/^\/home/, /^\/house/, /^\/shop/, /^\/inventory/, /^\/garden/, /^\/spaces/, /^\/quests/, /^\/collection/, /^\/partner/, /^\/growth/, /^\/my/, /^\/onboarding/, /^\/history/, /^\/analysis/];
export function useStudyTimer(pathname: string) {
  useEffect(() => {
    if (NON_STUDY.some((r) => r.test(pathname))) return;
    let acc = 0;
    const h = window.setInterval(() => {
      if (document.hidden) return;
      acc += 5;
      if (acc >= 15) { useApp.getState().addStudyTime(acc); acc = 0; }
    }, 5000);
    return () => { window.clearInterval(h); if (acc > 0) useApp.getState().addStudyTime(acc); };
  }, [pathname]);
}
