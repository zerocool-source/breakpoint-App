import { Router, Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { isAuthenticated } from "../replit_integrations/auth/customAuth";

const router = Router();

router.get("/api/admin-users", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ message: "Failed to fetch admin users" });
  }
});

router.post("/api/admin-users", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "admin",
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating admin user:", error);
    res.status(500).json({ message: "Failed to create admin user" });
  }
});

router.put("/api/admin-users/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, password, firstName, lastName, role, isActive } = req.body;

    const updateData: any = {
      email,
      firstName,
      lastName,
      role,
      isActive,
      updatedAt: new Date(),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating admin user:", error);
    res.status(500).json({ message: "Failed to update admin user" });
  }
});

router.delete("/api/admin-users/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const currentUserId = req.session.userId;
    if (String(id) === String(currentUserId)) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin user:", error);
    res.status(500).json({ message: "Failed to delete admin user" });
  }
});

export default router;
