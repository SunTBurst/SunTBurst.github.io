export interface SoundscapePreset {
  id: 'desert-breath' | 'knowledge-walk' | 'night-organize';
  title: string;
  eyebrow: string;
  description: string;
  baseFrequencies: readonly number[];
  notes: readonly number[];
  waveform: OscillatorType;
  stepMs: number;
  attackMs: number;
  releaseMs: number;
}

export const soundscapePresets: readonly SoundscapePreset[] = [
  {
    id: 'desert-breath',
    title: '沙丘呼吸',
    eyebrow: '缓慢 · 温暖',
    description: '低缓的长音像风越过沙丘，适合停下来读一篇较长的文章。',
    baseFrequencies: [110, 164.81],
    notes: [220, 246.94, 293.66, 246.94, 329.63, 293.66],
    waveform: 'sine',
    stepMs: 4200,
    attackMs: 900,
    releaseMs: 3200,
  },
  {
    id: 'knowledge-walk',
    title: '知识漫游',
    eyebrow: '清晰 · 流动',
    description: '疏朗的音点沿着稳定和声移动，适合浏览知识地图与项目记录。',
    baseFrequencies: [130.81, 196],
    notes: [261.63, 329.63, 392, 349.23, 293.66, 329.63],
    waveform: 'triangle',
    stepMs: 3000,
    attackMs: 180,
    releaseMs: 2200,
  },
  {
    id: 'night-organize',
    title: '夜间整理',
    eyebrow: '安静 · 克制',
    description: '更暗、更稀疏的合成声留出思考空间，适合夜间整理和回看。',
    baseFrequencies: [82.41, 123.47],
    notes: [164.81, 196, 220, 196, 146.83, 164.81],
    waveform: 'sine',
    stepMs: 5200,
    attackMs: 1200,
    releaseMs: 3900,
  },
] as const;

export function soundscapeNoteAt(preset: SoundscapePreset, step: number): number {
  const integerStep = Number.isFinite(step) ? Math.trunc(step) : 0;
  const index = ((integerStep % preset.notes.length) + preset.notes.length) % preset.notes.length;
  return preset.notes[index];
}

export function clampSoundscapeVolume(value: number): number {
  if (!Number.isFinite(value)) return 0.3;
  return Math.min(1, Math.max(0, value));
}
