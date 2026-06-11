import { RecordingFrame, BrainState, RecordingAnalysis } from '../types';

const CHANNEL_NAMES: Record<string, string> = {
  Fp1: '左前额', Fp2: '右前额', F3: '左额', F4: '右额',
  C3: '左中央', C4: '右中央', P3: '左顶', P4: '右顶',
  O1: '左枕', O2: '右枕'
};

export interface NameComponents {
  date: string;
  channel: string;
  channelLabel: string;
  state: string;
  stateLabel: string;
  time: string;
}

const STATUS_LABELS: Record<string, string> = {
  focused: '专注',
  relaxed: '放松',
  fatigued: '疲劳',
  neutral: '平稳'
};

export const analyzeRecordingFrames = (frames: RecordingFrame[]): RecordingAnalysis => {
  if (frames.length === 0) {
    return {
      dominantState: 'neutral',
      dominantStateLabel: '平稳',
      avgFocus: 0,
      avgRelaxation: 0,
      avgFatigue: 0,
      stateDistribution: { focused: 0, relaxed: 0, fatigued: 0, neutral: 0 }
    };
  }

  let totalFocus = 0;
  let totalRelaxation = 0;
  let totalFatigue = 0;
  const stateDistribution: Record<string, number> = {
    focused: 0,
    relaxed: 0,
    fatigued: 0,
    neutral: 0
  };

  frames.forEach(frame => {
    const bs = frame.brainState;
    totalFocus += bs.focus;
    totalRelaxation += bs.relaxation;
    totalFatigue += bs.fatigue;
    stateDistribution[bs.status] = (stateDistribution[bs.status] || 0) + 1;
  });

  const count = frames.length;
  const avgFocus = totalFocus / count;
  const avgRelaxation = totalRelaxation / count;
  const avgFatigue = totalFatigue / count;

  let maxCount = 0;
  let dominantState: BrainState['status'] = 'neutral';
  for (const [state, cnt] of Object.entries(stateDistribution)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      dominantState = state as BrainState['status'];
    }
  }

  return {
    dominantState,
    dominantStateLabel: STATUS_LABELS[dominantState] || '平稳',
    avgFocus,
    avgRelaxation,
    avgFatigue,
    stateDistribution
  };
};

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${month}${day}`;
};

const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}${minutes}`;
};

export const generateNameComponents = (
  startTime: number,
  channel: string,
  analysis: RecordingAnalysis
): NameComponents => {
  return {
    date: formatDate(startTime),
    channel,
    channelLabel: CHANNEL_NAMES[channel] || channel,
    state: analysis.dominantState,
    stateLabel: analysis.dominantStateLabel,
    time: formatTime(startTime)
  };
};

export const generateSuggestedName = (components: NameComponents): string => {
  return `${components.date}_${components.time}_${components.channelLabel}_${components.stateLabel}`;
};

export const getStateEmoji = (state: string): string => {
  switch (state) {
    case 'focused': return '🧠';
    case 'relaxed': return '😌';
    case 'fatigued': return '😴';
    default: return '📊';
  }
};

export const getStateColor = (state: string): string => {
  switch (state) {
    case 'focused': return '#1976d2';
    case 'relaxed': return '#388e3c';
    case 'fatigued': return '#d32f2f';
    default: return '#666';
  }
};
