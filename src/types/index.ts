import type { Exercise, Progress } from "@prisma/client";

export type ExerciseWithProgress = Exercise & {
  progress: Progress | null;
};

export interface ExerciseFilter {
  level?: string;
  category?: string;
  completed?: boolean;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ProgressInput {
  completed?: boolean;
  score?: number;
  maxScore?: number;
  screenshotUrl?: string;
  listenCount?: number;
  notes?: string;
}

export interface SyncResult {
  added: number;
  updated: number;
  errors: string[];
}
