import { Priority, SLARiskResult } from "@/types";

export function calculateSLARisk(params: {
  createdAt: string | Date;
  slaHours: number;
  queueLength: number;
  priority: Priority;
  now?: Date;
}): SLARiskResult {
  const { createdAt, slaHours, queueLength, priority } = params;
  const now = params.now ?? new Date();
  const created = new Date(createdAt);

  const elapsedHours = Math.max(
    0,
    (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  );

  const elapsedRatio = slaHours > 0 ? elapsedHours / slaHours : 0;
  const timeRisk = elapsedRatio * 50;
  const queueRisk = (queueLength / 10) * 30;
  const priorityRisk = priority === "high" ? 20 : 0;

  const percentage = Math.min(100, Math.round(timeRisk + queueRisk + priorityRisk));

  const level = percentage >= 70 ? "high" : percentage >= 40 ? "medium" : "low";

  return { percentage, level };
}

export function calculateUtilization(currentLoad: number, maxLoad: number): number {
  if (maxLoad <= 0) return 0;
  return Math.round((currentLoad / maxLoad) * 100);
}
