import { db } from "../db";
import { estimates } from "@shared/schema";
import { eq, and, isNotNull, lt, isNull } from "drizzle-orm";

interface ExpiredEstimate {
  id: string;
  estimateNumber: string | null;
  propertyName: string;
  repairTechName: string | null;
  deadlineAt: Date;
  deadlineValue: number | null;
}

export async function checkExpiredDeadlines(): Promise<void> {
  try {
    const now = new Date();
    
    const expiredEstimates = await db
      .select({
        id: estimates.id,
        estimateNumber: estimates.estimateNumber,
        propertyName: estimates.propertyName,
        repairTechName: estimates.repairTechName,
        deadlineAt: estimates.deadlineAt,
        deadlineValue: estimates.deadlineValue,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.status, "scheduled"),
          isNotNull(estimates.deadlineAt),
          lt(estimates.deadlineAt, now),
          isNull(estimates.autoReturnedAt)
        )
      );

    if (expiredEstimates.length === 0) {
      return;
    }

    console.log(`[DeadlineChecker] Found ${expiredEstimates.length} expired job(s)`);

    for (const estimate of expiredEstimates) {
      try {
        const deadlineHours = estimate.deadlineValue || "unknown";
        const techName = estimate.repairTechName || "Unknown Technician";
        
        await db
          .update(estimates)
          .set({
            status: "approved",
            repairTechId: null,
            repairTechName: null,
            scheduledDate: null,
            scheduledAt: null,
            autoReturnedAt: now,
            autoReturnedReason: `Auto-returned: Not completed within ${deadlineHours} hours by ${techName}`,
          })
          .where(eq(estimates.id, estimate.id));

        console.log(
          `[DeadlineChecker] Auto-returned job EST#${estimate.estimateNumber || estimate.id.slice(0, 8)} - ` +
          `Not completed within ${deadlineHours} hours by ${techName}`
        );
      } catch (updateError) {
        console.error(`[DeadlineChecker] Failed to auto-return estimate ${estimate.id}:`, updateError);
      }
    }
  } catch (error) {
    console.error("[DeadlineChecker] Error checking expired deadlines:", error);
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startDeadlineChecker(intervalMinutes: number = 5): void {
  if (intervalId) {
    console.log("[DeadlineChecker] Already running, skipping start");
    return;
  }

  console.log(`[DeadlineChecker] Starting deadline checker (interval: ${intervalMinutes} minutes)`);
  
  checkExpiredDeadlines();
  
  intervalId = setInterval(() => {
    checkExpiredDeadlines();
  }, intervalMinutes * 60 * 1000);
}

export function stopDeadlineChecker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[DeadlineChecker] Stopped");
  }
}
