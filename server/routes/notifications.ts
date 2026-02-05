import { Request, Response } from "express";
import { db } from "../db";
import { urgentNotifications } from "@shared/schema";
import { eq, and, or, isNull, gt, desc } from "drizzle-orm";

export function registerNotificationRoutes(app: any) {
  // Get notifications for a user/role
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const { userId, role, includeExpired } = req.query;

      // Build where conditions
      const conditions = [];

      // Target user specifically or by role
      if (userId) {
        conditions.push(
          or(
            eq(urgentNotifications.targetUserId, userId as string),
            and(
              isNull(urgentNotifications.targetUserId),
              role ? eq(urgentNotifications.targetRole, role as string) : isNull(urgentNotifications.targetRole)
            )
          )
        );
      } else if (role) {
        conditions.push(
          or(
            eq(urgentNotifications.targetRole, role as string),
            isNull(urgentNotifications.targetRole)
          )
        );
      }

      // Only non-dismissed
      conditions.push(eq(urgentNotifications.isDismissed, false));

      // Only non-expired (unless includeExpired is true)
      if (!includeExpired) {
        conditions.push(
          or(
            isNull(urgentNotifications.expiresAt),
            gt(urgentNotifications.expiresAt, new Date())
          )
        );
      }

      const notifications = await db
        .select()
        .from(urgentNotifications)
        .where(and(...conditions))
        .orderBy(desc(urgentNotifications.createdAt))
        .limit(50);

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Dismiss a notification
  app.patch("/api/notifications/:id/dismiss", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const [updated] = await db
        .update(urgentNotifications)
        .set({
          isDismissed: true,
          dismissedAt: new Date(),
          dismissedByUserId: userId || null,
        })
        .where(eq(urgentNotifications.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ success: true, notification: updated });
    } catch (error) {
      console.error("Error dismissing notification:", error);
      res.status(500).json({ error: "Failed to dismiss notification" });
    }
  });

  // Create a notification (for internal use or admin)
  app.post("/api/notifications", async (req: Request, res: Response) => {
    try {
      const { title, message, severity, targetRole, targetUserId, relatedEntityType, relatedEntityId, expiresAt } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: "title and message are required" });
      }

      const [notification] = await db
        .insert(urgentNotifications)
        .values({
          title,
          message,
          severity: severity || "info",
          targetRole: targetRole || null,
          targetUserId: targetUserId || null,
          relatedEntityType: relatedEntityType || null,
          relatedEntityId: relatedEntityId || null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Dismiss all notifications for a user
  app.post("/api/notifications/dismiss-all", async (req: Request, res: Response) => {
    try {
      const { userId, role } = req.body;

      const conditions = [eq(urgentNotifications.isDismissed, false)];

      if (userId) {
        conditions.push(eq(urgentNotifications.targetUserId, userId));
      } else if (role) {
        conditions.push(eq(urgentNotifications.targetRole, role));
      }

      await db
        .update(urgentNotifications)
        .set({
          isDismissed: true,
          dismissedAt: new Date(),
          dismissedByUserId: userId || null,
        })
        .where(and(...conditions));

      res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing all notifications:", error);
      res.status(500).json({ error: "Failed to dismiss notifications" });
    }
  });
}
