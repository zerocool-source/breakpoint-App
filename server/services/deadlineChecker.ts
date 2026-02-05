import { db } from "../db";
import { estimates, jobReassignments } from "@shared/schema";
import { eq, and, isNotNull, lt, isNull } from "drizzle-orm";

interface ExpiredEstimate {
  id: string;
  estimateNumber: string | null;
  propertyId: string;
  propertyName: string;
  repairTechId: string | null;
  repairTechName: string | null;
  deadlineAt: Date;
  deadlineValue: number | null;
  deadlineUnit: string | null;
}

export async function checkExpiredDeadlines(): Promise<void> {
  try {
    const now = new Date();
    
    const expiredEstimates = await db
      .select({
        id: estimates.id,
        estimateNumber: estimates.estimateNumber,
        propertyId: estimates.propertyId,
        propertyName: estimates.propertyName,
        repairTechId: estimates.repairTechId,
        repairTechName: estimates.repairTechName,
        deadlineAt: estimates.deadlineAt,
        deadlineValue: estimates.deadlineValue,
        deadlineUnit: estimates.deadlineUnit,
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
        const deadlineValue = estimate.deadlineValue || 0;
        const deadlineUnit = estimate.deadlineUnit || "hours";
        const techId = estimate.repairTechId;
        const techName = estimate.repairTechName || "Unknown Technician";
        
        // Format the deadline duration for display
        let deadlineDisplay: string;
        if (deadlineUnit === "days") {
          deadlineDisplay = `${deadlineValue} day${deadlineValue !== 1 ? 's' : ''}`;
        } else {
          deadlineDisplay = `${deadlineValue} hour${deadlineValue !== 1 ? 's' : ''}`;
        }
        
        // Update the estimate - save original tech info, clear assignment, change status to approved
        await db
          .update(estimates)
          .set({
            status: "approved",
            originalRepairTechId: techId,
            originalRepairTechName: techName,
            repairTechId: null,
            repairTechName: null,
            scheduledDate: null,
            scheduledAt: null,
            deadlineAt: null,
            autoReturnedAt: now,
            autoReturnedReason: `Timer expired: Not completed within ${deadlineDisplay} by ${techName}`,
          })
          .where(eq(estimates.id, estimate.id));

        // Create a job_reassignments record for the "Reassigned" tab
        if (techId) {
          await db.insert(jobReassignments).values({
            jobId: estimate.id,
            jobType: "estimate",
            jobNumber: estimate.estimateNumber ? `EST-${estimate.estimateNumber}` : null,
            propertyId: estimate.propertyId,
            propertyName: estimate.propertyName,
            originalTechId: techId,
            originalTechName: techName,
            newTechId: null, // Returned to queue, no new tech yet
            newTechName: "Returned to Queue",
            reassignedAt: now,
            reassignedByUserId: "system",
            reassignedByUserName: "Auto-Timer",
            reason: `Timer expired: Not completed within ${deadlineDisplay}`,
          });
        }

        console.log(
          `[DeadlineChecker] Auto-returned job EST-${estimate.estimateNumber || estimate.id.slice(0, 8)} - ` +
          `Timer expired: Not completed within ${deadlineDisplay} by ${techName}`
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
