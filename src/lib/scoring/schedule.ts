import { createJob } from "@/lib/jobs";

/**
 * Schedule a score decay job
 * This should be called periodically (e.g., weekly via cron or background worker)
 */
export async function scheduleScoreDecayJob(
  scheduledFor?: Date
): Promise<string> {
  return createJob({
    type: "score_decay",
    name: "Score Decay Processing",
    payload: {},
    scheduledFor: scheduledFor || new Date(),
    maxAttempts: 3,
  });
}

/**
 * Schedule a score decay job for a specific time
 * Useful for scheduling weekly decay processing
 */
export async function scheduleWeeklyScoreDecay(): Promise<string> {
  // Schedule for next Sunday at 2:00 AM UTC
  const now = new Date();
  const nextSunday = new Date(now);
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(2, 0, 0, 0);

  return scheduleScoreDecayJob(nextSunday);
}
