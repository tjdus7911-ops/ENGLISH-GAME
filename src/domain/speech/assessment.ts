/**
 * 발음 평가 확장 인터페이스.
 * MVP 에는 실제 발음 평가 엔진이 없으므로 UnavailableAssessor 만 제공하며, UI 에는 '준비 중'으로 표시한다.
 * 향후 발음 평가 API(예: 음소 단위 GOP 기반 서비스)나 온디바이스 모델을 이 인터페이스로 연결한다.
 */
export type AssessmentFeature = 'word-accuracy' | 'stress' | 'intonation' | 'fluency' | 'sentence-feedback' | 'ai-coaching';

export const ASSESSMENT_FEATURES: { id: AssessmentFeature; label: string }[] = [
  { id: 'word-accuracy', label: '단어별 발음 정확도' },
  { id: 'stress', label: '강세 평가' },
  { id: 'intonation', label: '억양 평가' },
  { id: 'fluency', label: '유창성 평가' },
  { id: 'sentence-feedback', label: '문장별 발음 피드백' },
  { id: 'ai-coaching', label: 'AI 발음 코칭' },
];

export interface PronunciationRequest {
  audio: Blob;
  referenceText: string;
  locale: 'en-US' | 'en-GB';
}

export interface WordScore { word: string; accuracy: number; errorType?: 'mispronunciation' | 'omission' | 'insertion' }

export type PronunciationResult =
  | { status: 'unavailable'; reason: string }
  | {
      status: 'ok';
      words?: WordScore[];
      stress?: number;
      intonation?: number;
      fluency?: number;
      feedback?: string[];
      engine: string;
    };

export interface PronunciationAssessor {
  readonly id: string;
  supports(feature: AssessmentFeature): boolean;
  assess(req: PronunciationRequest): Promise<PronunciationResult>;
}

export class UnavailableAssessor implements PronunciationAssessor {
  readonly id = 'unavailable';
  supports(): boolean { return false; }
  async assess(): Promise<PronunciationResult> {
    return { status: 'unavailable', reason: '발음 평가 기능은 준비 중입니다. 음성 인식 결과는 발음 점수가 아닙니다.' };
  }
}
