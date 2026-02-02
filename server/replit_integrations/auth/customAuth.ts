import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { authStorage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    userName?: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  let connectionString = process.env.DATABASE_URL || '';
  if (!connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  
  const sessionStore = new pgStore({
    conString: connectionString,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "session",
  });
  const isProduction = process.env.NODE_ENV === "production";
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction || !!process.env.REPL_ID,
      sameSite: isProduction ? "strict" : "none",
      maxAge: sessionTtl,
    },
  });
}

export async function setupCustomAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export function registerCustomAuthRoutes(app: Express): void {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("[LOGIN] Attempt for email:", email);

      if (!email || !password) {
        console.log("[LOGIN] Missing email or password");
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await authStorage.getUserByEmail(email);
      console.log("[LOGIN] User found:", !!user, user?.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      console.log("[LOGIN] Password received:", JSON.stringify(password), "length:", password?.length);
      console.log("[LOGIN] Password hash:", user.password?.substring(0, 20), "length:", user.password?.length);
      
      // Test with direct comparison
      const testResult = await bcrypt.compare("admin123", user.password);
      console.log("[LOGIN] Test with hardcoded password:", testResult);
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("[LOGIN] Password valid:", isValidPassword);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await authStorage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await authStorage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
}
