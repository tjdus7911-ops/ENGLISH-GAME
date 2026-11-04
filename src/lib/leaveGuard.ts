import { useEffect } from 'react';

/**
 * 진행 중인 작업(풀고 있는 퀴즈, 저장하지 않은 꾸미기)이 있을 때 헤더 뒤로가기·새로고침 전에 확인을 받는다.
 * 화면 하나에 하나만 활성화된다고 가정 (마지막으로 켠 것이 우선).
 */
let current: { id: number; message: string } | null = null;
let seq = 0;
export const leaveGuardMessage = () => current?.message ?? null;
export const clearLeaveGuard = () => { current = null; };

export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;
    const id = ++seq;
    current = { id, message };
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => { if (current?.id === id) current = null; window.removeEventListener('beforeunload', onUnload); };
  }, [active, message]);
}
