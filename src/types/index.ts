import type { Exercise, Progress } from "@prisma/client";

export type ExerciseWithProgress = Exercise & {
  progress: Progress | null;
};

export interface ExerciseFilter {
  section?: string;
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
  completedAt?: string | null;
  score?: number;
  maxScore?: number;
  listenCount?: number;
  notes?: string;
  hidden?: boolean;
}

export interface SyncResult {
  added: number;
  updated: number;
  errors: string[];
}
