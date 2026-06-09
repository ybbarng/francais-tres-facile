export type ShadowingUnit = "sentences" | "paragraphs" | "segments" | "full";

export type ShadowingStep = 1 | 2 | 3 | 4 | 5;

export interface ShadowingMaterialSummary {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  duration_sec: number;
  sentence_count: number;
  paragraph_count: number;
  segment_count: number;
  source_url: string;
  data_file: string;
}

export interface ShadowingItem {
  text: string;
  start: number;
  end: number;
  word_count?: number;
  sentence_count?: number;
  audio_file: string;
}

export interface ShadowingMaterial {
  meta: {
    title: string;
    youtube_url?: string;
    audio_full: string;
    duration: number;
  };
  sentences: ShadowingItem[];
  paragraphs: ShadowingItem[];
  segments: ShadowingItem[];
  full_text: string;
}

export interface ShadowingPlayableItem {
  label: string;
  text: string;
  audioFile: string;
  duration: number;
}

export interface ShadowingProgressRecord {
  id: string;
  materialId: string;
  unit: string;
  itemIndex: number;
  playCount: number;
  lastStudiedAt: string | null;
}

export type ShadowingProgressMap = Record<string, ShadowingProgressRecord>;

export function progressKey(unit: string, itemIndex: number): string {
  return `${unit}:${itemIndex}`;
}
