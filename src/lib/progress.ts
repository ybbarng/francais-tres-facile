// localStorage 기반 진도 관리

export interface ProgressData {
  completed: boolean;
  score?: number;
  maxScore?: number;
  listenCount: number;
  notes?: string;
  completedAt?: string;
}

export interface AllProgress {
  [exerciseId: string]: ProgressData;
}

const STORAGE_KEY = "ftf-progress";

export function getAllProgress(): AllProgress {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function getProgress(exerciseId: string): ProgressData | null {
  const all = getAllProgress();
  return all[exerciseId] || null;
}

export function saveProgress(exerciseId: string, data: Partial<ProgressData>): ProgressData {
  const all = getAllProgress();
  const existing = all[exerciseId] || {
    completed: false,
    listenCount: 0,
  };

  const updated: ProgressData = {
    ...existing,
    ...data,
  };

  all[exerciseId] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return updated;
}

export function deleteProgress(exerciseId: string): void {
  const all = getAllProgress();
  delete all[exerciseId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function importProgress(data: AllProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAllProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// 통계 계산
export function getStats(totalExercises: number): {
  total: number;
  completed: number;
  inProgress: number;
  completionRate: number;
} {
  const all = getAllProgress();
  const completed = Object.values(all).filter((p) => p.completed).length;

  return {
    total: totalExercises,
    completed,
    inProgress: totalExercises - completed,
    completionRate: totalExercises > 0 ? Math.round((completed / totalExercises) * 100) : 0,
  };
}

// 완료된 exerciseId 목록
export function getCompletedIds(): string[] {
  const all = getAllProgress();
  return Object.entries(all)
    .filter(([, p]) => p.completed)
    .map(([id]) => id);
}
