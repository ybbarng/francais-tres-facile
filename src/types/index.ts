import type { Exercise } from "@prisma/client";
import type { ProgressData } from "@/lib/progress";

export type ExerciseWithProgress = Exercise & {
  progress: ProgressData | null;
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
}

export interface SyncResult {
  added: number;
  updated: number;
  errors: string[];
}
