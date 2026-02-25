import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient as ExercisePrismaClient } from "@/generated/exercises";
import { PrismaClient as ProgressPrismaClient } from "@/generated/progress";

const globalForPrisma = globalThis as unknown as {
  exerciseDb: ExercisePrismaClient | undefined;
  progressDb: ProgressPrismaClient | undefined;
};

function createExerciseClient() {
  const dbPath = path.join(process.cwd(), "data", "exercises.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  return new ExercisePrismaClient({ adapter });
}

function createProgressClient() {
  const dbPath = path.join(process.cwd(), "data", "progress.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  return new ProgressPrismaClient({ adapter });
}

export const exerciseDb = globalForPrisma.exerciseDb ?? createExerciseClient();
export const progressDb = globalForPrisma.progressDb ?? createProgressClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.exerciseDb = exerciseDb;
  globalForPrisma.progressDb = progressDb;
}

export async function getProgressMap(exerciseIds?: string[]) {
  const where = exerciseIds ? { exerciseId: { in: exerciseIds } } : {};
  const progressList = await progressDb.progress.findMany({ where });
  return new Map(progressList.map((p) => [p.exerciseId, p]));
}
