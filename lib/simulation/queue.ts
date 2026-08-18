export interface QueueTickResult {
  processed: number;
  newQueue: number;
  utilization: number;
}

/**
 * Advances one stage's queue by one simulated day.
 *
 * demand = whatever was already queued + what arrived today
 * processed = min(demand, capacity) — can't process more than capacity
 * newQueue = demand - processed (carries over to tomorrow)
 * utilization = demand / capacity (uncapped, so a bottleneck shows how
 * far over capacity it is, not just "100%")
 */
export function tickQueue(
  currentQueue: number,
  incoming: number,
  capacity: number
): QueueTickResult {
  const demand = Math.max(0, currentQueue) + Math.max(0, incoming);
  const safeCapacity = Math.max(0, capacity);

  const processed = Math.min(demand, safeCapacity);
  const newQueue = demand - processed;
  const utilization = safeCapacity > 0 ? demand / safeCapacity : demand > 0 ? Infinity : 0;

  return { processed, newQueue, utilization };
}
