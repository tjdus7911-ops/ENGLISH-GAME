import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { GRAMMAR_UNITS } from '@/content/grammar';
import { DIALOGUES, SPEAKING } from '@/content/dialogues';
import { EXPRESSIONS, SITUATIONS, DRAMAS } from '@/content/expressions';
import { VOCAB } from '@/content/vocab';
import { Button, Card, Modal, Page, SectionTitle, Tag } from '@/components/ui';
import { speechSupport } from '@/lib/speech';

function Toggle({ label, checked, onChange, id }: { label: string; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between min-h-[52px] gap-3">
      <span>{label}</span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-12 h-7 accent-[#E9513B]" />
    </label>
  );
}

export function MyScreen() {
  const nav = useNavigate();
  const s = useApp();
  const [confirm, setConfirm] = useState(false);
  const sup = speechSupport();
  return (
    <Page title="MY · 설정" back="/home">
      {s.recovered && <Card className="mb-3 bg-accent-soft"><p className="text-sm">저장 데이터가 손상되어 새로 시작했어요. 손상된 데이터는 기기에 백업해 두었어요.</p></Card>}
      <Card>
        <p className="text-sm text-ink-soft">학습 목적 · 하루 목표</p>
        <p className="font-bold">{s.profile.purpose ?? '-'} · {s.profile.dailyMinutes}분</p>
        <p className="text-sm mt-1">추정 레벨 <Tag tone="accent">{s.profile.levelTest.level ?? 'A1'}</Tag></p>
      </Card>

      <SectionTitle>학습량</SectionTitle>
      <Card>
        <label className="flex items-center justify-between min-h-[52px]" htmlFor="daily-words">
          <span>하루 신규 단어</span>
          <select id="daily-words" className="min-h-[44px] rounded-xl border border-line px-2" value={s.settings.dailyNewWords} onChange={(e) => s.updateSettings({ dailyNewWords: Number(e.target.value) })}>
            {[5, 6, 8, 10, 12, 15, 20, 25, 30].map((n) => <option key={n} value={n}>{n}개</option>)}
          </select>
        </label>
        <label className="flex items-center justify-between min-h-[52px]" htmlFor="speech-rate">
          <span>기본 음성 속도</span>
          <select id="speech-rate" className="min-h-[44px] rounded-xl border border-line px-2" value={s.settings.speechRate} onChange={(e) => s.updateSettings({ speechRate: Number(e.target.value) })}>
            {[0.75, 0.9, 1, 1.2].map((n) => <option key={n} value={n}>{n}x</option>)}
          </select>
        </label>
      </Card>

      <SectionTitle>알림</SectionTitle>
      <Card>
        <Toggle id="noti" label="학습·복습 알림 받기" checked={s.settings.notificationsOn} onChange={(v) => s.updateSettings({ notificationsOn: v })} />
        <label className="flex items-center justify-between min-h-[52px]" htmlFor="noti-time"><span>알림 시간</span><input id="noti-time" type="time" className="min-h-[44px] rounded-xl border border-line px-2" value={s.settings.notifyTime} onChange={(e) => s.updateSettings({ notifyTime: e.target.value })} /></label>
        <p className="text-xs text-ink-faint">웹앱에서는 앱을 열었을 때 홈 화면에 알림을 표시해요. (기기 푸시 알림은 Android 앱 전환 시 제공 예정)</p>
      </Card>

      <SectionTitle>화면 · 음성</SectionTitle>
      <Card>
        <Toggle id="reduce" label="애니메이션 최소화" checked={s.settings.reduceMotion} onChange={(v) => s.updateSettings({ reduceMotion: v })} />
        <Toggle id="rec" label="녹음 동의 (말하기 학습)" checked={s.settings.recordingConsent} onChange={(v) => s.updateSettings({ recordingConsent: v })} />
        <p className="text-xs text-ink-faint">이 브라우저: 마이크 {sup.mic ? '지원' : '미지원'} · 음성 인식 {sup.stt ? '지원' : '미지원'} · 보안 연결 {sup.secure ? '예' : '아니요'}</p>
      </Card>

      <SectionTitle>다시 진단하기</SectionTitle>
      <Link to="/level-test"><Button variant="secondary" className="w-full">레벨 진단 다시 하기</Button></Link>

      <SectionTitle>개인정보 · 음성 데이터 처리</SectionTitle>
      <Card className="text-sm grid gap-1.5 leading-relaxed">
        <p>• 학습 기록은 <b>이 기기의 브라우저 저장소(IndexedDB)</b>에만 저장돼요. 브라우저 데이터 삭제·기기 변경·앱 삭제 시 복구할 수 없어요. (클라우드 동기화는 추후 제공)</p>
        <p>• 녹음은 동의 후 말하기 버튼을 누른 동안에만 진행되고, 녹음 파일은 서버로 전송·저장하지 않아요.</p>
        <p>• 음성 인식은 브라우저 기능을 사용하며, 브라우저에 따라 음성이 제공자 서버에서 처리될 수 있어요.</p>
      </Card>

      <SectionTitle>콘텐츠 정보 · 출처</SectionTitle>
      <Card className="text-sm grid gap-1.5">
        <p>A1 문법 {GRAMMAR_UNITS.length}단원 · 단어 {VOCAB.length} · 듣기 {DIALOGUES.length} · 말하기 {SPEAKING.length} · 표현 {EXPRESSIONS.length} · 상황 대화 {SITUATIONS.length} · 미니 드라마 {DRAMAS.length}편({DRAMAS.filter((d) => d.video).length}편 영상 제작)</p>
        <p>검수 상태: 모든 콘텐츠 <Tag tone="warn">교육 전문가 검수 필요</Tag> (자동 검증만 완료)</p>
        <p>음성: Piper TTS + LibriTTS 모델 합성 음성 · LibriTTS 데이터셋 © Zen et al., <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> (openslr.org/60). 원어민 녹음이 아닙니다.</p>
        <p>발음기호: CMU Pronouncing Dictionary(BSD) 기반 자동 변환.</p>
        <p>캐릭터·마을·영상 그림: 앱 자체 제작.</p>
      </Card>

      <SectionTitle>데이터</SectionTitle>
      <Button variant="danger" className="w-full" onClick={() => setConfirm(true)}>모든 학습 데이터 초기화</Button>
      <Modal open={confirm} onClose={() => setConfirm(false)} label="데이터 초기화 확인">
        <p className="font-bold text-lg">정말 초기화할까요?</p>
        <p className="text-sm text-ink-soft mt-2">학습 기록, 복습 일정, 캐릭터, 마을 상태가 모두 삭제되며 되돌릴 수 없어요.</p>
        <div className="grid gap-2 mt-4"><Button variant="danger" onClick={() => { s.resetAll(); setConfirm(false); nav('/onboarding'); }}>초기화</Button><Button variant="ghost" onClick={() => setConfirm(false)}>취소</Button></div>
      </Modal>
    </Page>
  );
}
