/**
 * 음성 파일 경로 레지스트리.
 * 콘텐츠에서 tts(문장, 화자)를 호출하면 문장+화자 해시로 결정되는 mp3 경로를 돌려주고,
 * scripts/export-audio-manifest.ts 가 이 레지스트리를 모아 Piper TTS 로 실제 파일을 생성한다.
 * 음성은 오프라인 신경망 TTS(Piper · LibriTTS 모델, CC BY 4.0)로 만든 합성 음성이다.
 */
export type Voice = 'f' | 'm' | 'f2' | 'm2';

const registry = new Map<string, { text: string; voice: Voice }>();

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function tts(text: string, voice: Voice = 'f'): string {
  const clean = text.trim();
  const path = `audio/${voice}-${fnv1a(voice + '|' + clean)}${clean.length.toString(36)}.mp3`;
  registry.set(path, { text: clean, voice });
  return path;
}

export const audioRegistry = registry;
