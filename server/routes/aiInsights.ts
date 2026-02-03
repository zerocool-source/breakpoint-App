import type { Request, Response } from "express";
import { db } from "../db";
import { techOpsEntries, estimates, alerts } from "@shared/schema";
import { desc, sql, eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface SystemSnapshot {
  recentTechOps: any[];
  recentEstimates: any[];
  recentAlerts: any[];
  stats: {
    pendingEstimates: number;
    activeAlerts: number;
    todayTechOps: number;
  };
}

async function getSystemSnapshot(): Promise<SystemSnapshot> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [recentTechOps, recentEstimates, recentAlerts] = await Promise.all([
    db.select({
      id: techOpsEntries.id,
      entryType: techOpsEntries.entryType,
      propertyName: techOpsEntries.propertyName,
      status: techOpsEntries.status,
      priority: techOpsEntries.priority,
      description: techOpsEntries.description,
      createdAt: techOpsEntries.createdAt,
    })
      .from(techOpsEntries)
      .orderBy(desc(techOpsEntries.createdAt))
      .limit(10),
    
    db.select({
      id: estimates.id,
      title: estimates.title,
      propertyName: estimates.propertyName,
      status: estimates.status,
      totalAmount: estimates.totalAmount,
      createdAt: estimates.createdAt,
    })
      .from(estimates)
      .orderBy(desc(estimates.createdAt))
      .limit(10),
    
    db.select({
      id: alerts.id,
      type: alerts.type,
      severity: alerts.severity,
      message: alerts.message,
      status: alerts.status,
      poolName: alerts.poolName,
    })
      .from(alerts)
      .where(eq(alerts.status, "Active"))
      .orderBy(desc(alerts.timestamp))
      .limit(5),
  ]);

  const pendingEstimates = recentEstimates.filter((e: any) => 
    e.status === "pending_approval" || e.status === "needs_scheduling"
  ).length;

  const activeAlerts = recentAlerts.length;

  const todayTechOps = recentTechOps.filter((t: any) => {
    const createdAt = new Date(t.createdAt);
    return createdAt >= today;
  }).length;

  return {
    recentTechOps,
    recentEstimates,
    recentAlerts,
    stats: {
      pendingEstimates,
      activeAlerts,
      todayTechOps,
    },
  };
}

function buildInsightPrompt(snapshot: SystemSnapshot): string {
  const { recentTechOps, recentEstimates, recentAlerts, stats } = snapshot;

  let context = `You are Ace, the AI system monitor for Breakpoint Commercial Pool Systems. Generate 3-5 brief, insightful observations about the current state of operations based on this data:

CURRENT STATS:
- Pending estimates awaiting action: ${stats.pendingEstimates}
- Active alerts: ${stats.activeAlerts}
- Tech ops entries today: ${stats.todayTechOps}

`;

  if (recentAlerts.length > 0) {
    context += `ACTIVE ALERTS:\n`;
    recentAlerts.forEach(a => {
      context += `- [${a.severity}] ${a.type}: ${a.message} at ${a.poolName}\n`;
    });
    context += `\n`;
  }

  if (recentTechOps.length > 0) {
    context += `RECENT TECH OPS:\n`;
    recentTechOps.slice(0, 5).forEach((t: any) => {
      context += `- ${t.entryType} at ${t.propertyName}: ${t.status} (${t.priority || 'normal'} priority)\n`;
    });
    context += `\n`;
  }

  if (recentEstimates.length > 0) {
    context += `RECENT ESTIMATES:\n`;
    recentEstimates.slice(0, 5).forEach(e => {
      const amount = e.totalAmount ? `$${(e.totalAmount / 100).toFixed(2)}` : 'TBD';
      context += `- ${e.title} for ${e.propertyName}: ${e.status} (${amount})\n`;
    });
  }

  context += `
Generate your thoughts as a JSON array of objects with these fields:
- "thought": A brief insight or observation (1-2 sentences max)
- "type": One of "info", "warning", "success", "action"
- "priority": 1-5 (1 = most important)

Focus on actionable insights, patterns, things that need attention, or positive observations. Be concise and helpful. If systems are quiet, acknowledge that positively.`;

  return context;
}

export function registerAiInsightsRoutes(app: any) {
  app.get("/api/ai/insights", async (req: Request, res: Response) => {
    try {
      const snapshot = await getSystemSnapshot();
      const prompt = buildInsightPrompt(snapshot);

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are Ace, an AI assistant monitoring pool service operations. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || "[]";
      
      let thoughts = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          thoughts = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        thoughts = [{ thought: "Systems are running smoothly. All operations normal.", type: "info", priority: 3 }];
      }

      res.json({
        thoughts,
        stats: snapshot.stats,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ 
        error: "Failed to generate insights",
        thoughts: [{ thought: "Currently analyzing systems...", type: "info", priority: 3 }],
        stats: { pendingEstimates: 0, activeAlerts: 0, todayTechOps: 0 },
      });
    }
  });

  app.get("/api/ai/quick-thought", async (req: Request, res: Response) => {
    try {
      const snapshot = await getSystemSnapshot();
      
      let quickThought = "All systems nominal. Pool operations running smoothly.";
      
      if (snapshot.stats.activeAlerts > 0) {
        quickThought = `Monitoring ${snapshot.stats.activeAlerts} active alert${snapshot.stats.activeAlerts > 1 ? 's' : ''}. Reviewing priority levels...`;
      } else if (snapshot.stats.pendingEstimates > 0) {
        quickThought = `${snapshot.stats.pendingEstimates} estimate${snapshot.stats.pendingEstimates > 1 ? 's' : ''} awaiting action. Consider following up with customers.`;
      } else if (snapshot.stats.todayTechOps > 0) {
        quickThought = `${snapshot.stats.todayTechOps} tech operation${snapshot.stats.todayTechOps > 1 ? 's' : ''} logged today. Field teams are active.`;
      }

      res.json({
        thought: quickThought,
        stats: snapshot.stats,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error generating quick thought:", error);
      res.json({
        thought: "Analyzing system state...",
        stats: { pendingEstimates: 0, activeAlerts: 0, todayTechOps: 0 },
      });
    }
  });
}
