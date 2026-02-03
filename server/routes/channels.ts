import type { Request, Response } from "express"
import { storage } from "../storage";

export function registerChannelRoutes(app: any) {
  // ==================== THREADS ====================

  app.get("/api/threads", async (req: Request, res: Response) => {
    try {
      const allThreads = await storage.getThreads();
      res.json({ threads: allThreads });
    } catch (error: any) {
      console.error("Error fetching threads:", error);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  app.get("/api/accounts/:accountId/thread", async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const { accountName } = req.query;
      const thread = await storage.getOrCreateThread(accountId, (accountName as string) || `Account ${accountId}`);
      res.json({ thread });
    } catch (error: any) {
      console.error("Error getting thread:", error);
      res.status(500).json({ error: "Failed to get thread" });
    }
  });

  app.get("/api/threads/:threadId/messages", async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const { type, search, limit } = req.query;
      const messages = await storage.getThreadMessages(threadId, {
        type: (type as string) || undefined,
        search: (search as string) || undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({ messages });
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/threads/:threadId/messages", async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const { authorId, authorName, type, text, photoUrls, taggedUserIds, taggedRoles, visibility } = req.body;
      
      if (!authorId || !authorName) {
        return res.status(400).json({ error: "authorId and authorName are required" });
      }
      
      const message = await storage.createThreadMessage({
        threadId,
        authorId,
        authorName,
        type: type || 'update',
        text: text || null,
        photoUrls: photoUrls || [],
        taggedUserIds: taggedUserIds || [],
        taggedRoles: taggedRoles || [],
        visibility: visibility || 'all',
        pinned: false
      });
      res.json({ message });
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.patch("/api/messages/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const message = await storage.updateThreadMessage(id, updates);
      res.json({ message });
    } catch (error: any) {
      console.error("Error updating message:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  app.delete("/api/messages/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteThreadMessage(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  app.post("/api/messages/:id/pin", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pinned } = req.body;
      const message = await storage.pinMessage(id, pinned);
      res.json({ message });
    } catch (error: any) {
      console.error("Error pinning message:", error);
      res.status(500).json({ error: "Failed to pin message" });
    }
  });

  // ==================== DEPARTMENT CHANNELS ====================

  app.get("/api/department-channels", async (req: Request, res: Response) => {
    try {
      const { department } = req.query;
      let channels;
      if (department) {
        channels = await storage.getDepartmentChannelsByDepartment(department as string);
      } else {
        channels = await storage.getDepartmentChannels();
      }
      res.json({ channels });
    } catch (error: any) {
      console.error("Error fetching department channels:", error);
      res.status(500).json({ error: "Failed to fetch department channels" });
    }
  });

  app.get("/api/department-channels/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const channel = await storage.getDepartmentChannel(id);
      if (!channel) {
        return res.status(404).json({ error: "Department channel not found" });
      }
      res.json({ channel });
    } catch (error: any) {
      console.error("Error fetching department channel:", error);
      res.status(500).json({ error: "Failed to fetch department channel" });
    }
  });

  app.post("/api/department-channels", async (req: Request, res: Response) => {
    try {
      const { name, department, description, icon, isPrivate, allowedRoles } = req.body;
      if (!name || !department) {
        return res.status(400).json({ error: "name and department are required" });
      }
      const channel = await storage.createDepartmentChannel({
        name,
        department,
        description,
        icon,
        isPrivate,
        allowedRoles
      });
      res.json({ channel });
    } catch (error: any) {
      console.error("Error creating department channel:", error);
      res.status(500).json({ error: "Failed to create department channel" });
    }
  });

  app.patch("/api/department-channels/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const channel = await storage.updateDepartmentChannel(id, updates);
      if (!channel) {
        return res.status(404).json({ error: "Department channel not found" });
      }
      res.json({ channel });
    } catch (error: any) {
      console.error("Error updating department channel:", error);
      res.status(500).json({ error: "Failed to update department channel" });
    }
  });

  // ==================== PROPERTY CHANNELS ====================

  app.get("/api/channels", async (req: Request, res: Response) => {
    try {
      const channels = await storage.getPropertyChannels();
      res.json({ channels });
    } catch (error: any) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.get("/api/channels/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const channel = await storage.getPropertyChannel(id);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }
      res.json({ channel });
    } catch (error: any) {
      console.error("Error fetching channel:", error);
      res.status(500).json({ error: "Failed to fetch channel" });
    }
  });

  // Channel sync endpoint - Pool Brain API disabled, use internal data
  app.post("/api/channels/sync", async (_req: Request, res: Response) => {
    res.json({ 
      success: true, 
      syncedCount: 0, 
      channels: [],
      message: "Pool Brain sync disabled - use internal data"
    });
  });

  app.get("/api/channels/:channelId/members", async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const members = await storage.getChannelMembers(channelId);
      res.json({ members });
    } catch (error: any) {
      console.error("Error fetching channel members:", error);
      res.status(500).json({ error: "Failed to fetch channel members" });
    }
  });

  app.post("/api/channels/:channelId/members", async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const { userId, userName, role } = req.body;
      
      if (!userId || !userName) {
        return res.status(400).json({ error: "userId and userName are required" });
      }
      
      const member = await storage.addChannelMember({
        channelId,
        userId,
        userName,
        role: role || 'member'
      });
      res.json({ member });
    } catch (error: any) {
      console.error("Error adding channel member:", error);
      res.status(500).json({ error: "Failed to add channel member" });
    }
  });

  app.delete("/api/channels/:channelId/members/:userId", async (req: Request, res: Response) => {
    try {
      const { channelId, userId } = req.params;
      await storage.removeChannelMember(channelId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing channel member:", error);
      res.status(500).json({ error: "Failed to remove channel member" });
    }
  });

  app.get("/api/channels/:channelId/messages", async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const { limit, before, parentMessageId } = req.query;
      
      const messages = await storage.getChannelMessages(channelId, {
        limit: limit ? parseInt(limit as string) : undefined,
        before: (before as string) || undefined,
        parentMessageId: parentMessageId === 'null' ? null : (parentMessageId as string) || undefined
      });
      
      const messagesWithReactions = await Promise.all(
        messages.map(async (msg) => {
          const reactions = await storage.getMessageReactions(msg.id);
          const replyCount = parentMessageId ? 0 : (await storage.getThreadReplies(msg.id)).length;
          return { ...msg, reactions, replyCount };
        })
      );
      
      res.json({ messages: messagesWithReactions });
    } catch (error: any) {
      console.error("Error fetching channel messages:", error);
      res.status(500).json({ error: "Failed to fetch channel messages" });
    }
  });

  app.post("/api/channels/:channelId/messages", async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const { authorId, authorName, content, parentMessageId, messageType, attachments, mentions } = req.body;
      
      if (!authorId || !authorName || !content) {
        return res.status(400).json({ error: "authorId, authorName, and content are required" });
      }
      
      const message = await storage.createChannelMessage({
        channelId,
        authorId,
        authorName,
        content,
        parentMessageId: parentMessageId || null,
        messageType: messageType || 'text',
        attachments: attachments || [],
        mentions: mentions || [],
        isPinned: false
      });
      
      res.json({ message });
    } catch (error: any) {
      console.error("Error creating channel message:", error);
      res.status(500).json({ error: "Failed to create channel message" });
    }
  });

  app.patch("/api/channels/messages/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "content is required" });
      }
      
      const message = await storage.updateChannelMessage(id, content);
      res.json({ message });
    } catch (error: any) {
      console.error("Error updating channel message:", error);
      res.status(500).json({ error: "Failed to update channel message" });
    }
  });

  app.delete("/api/channels/messages/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteChannelMessage(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting channel message:", error);
      res.status(500).json({ error: "Failed to delete channel message" });
    }
  });

  app.post("/api/channels/messages/:id/pin", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isPinned } = req.body;
      const message = await storage.pinChannelMessage(id, isPinned);
      res.json({ message });
    } catch (error: any) {
      console.error("Error pinning channel message:", error);
      res.status(500).json({ error: "Failed to pin channel message" });
    }
  });

  app.get("/api/channels/messages/:messageId/replies", async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const replies = await storage.getThreadReplies(messageId);
      
      const repliesWithReactions = await Promise.all(
        replies.map(async (msg) => {
          const reactions = await storage.getMessageReactions(msg.id);
          return { ...msg, reactions };
        })
      );
      
      res.json({ replies: repliesWithReactions });
    } catch (error: any) {
      console.error("Error fetching thread replies:", error);
      res.status(500).json({ error: "Failed to fetch thread replies" });
    }
  });

  app.post("/api/channels/messages/:messageId/reactions", async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const { userId, emoji } = req.body;
      
      if (!userId || !emoji) {
        return res.status(400).json({ error: "userId and emoji are required" });
      }
      
      const reaction = await storage.addReaction({
        messageId,
        userId,
        emoji
      });
      res.json({ reaction });
    } catch (error: any) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  app.delete("/api/channels/messages/:messageId/reactions", async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const { userId, emoji } = req.body;
      
      if (!userId || !emoji) {
        return res.status(400).json({ error: "userId and emoji are required" });
      }
      
      await storage.removeReaction(messageId, userId, emoji);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  app.post("/api/channels/:channelId/read", async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const { userId, messageId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const read = await storage.updateChannelRead(channelId, userId, messageId);
      res.json({ read });
    } catch (error: any) {
      console.error("Error marking channel as read:", error);
      res.status(500).json({ error: "Failed to mark channel as read" });
    }
  });

  app.get("/api/channels/unread/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const unreadCounts = await storage.getUnreadCounts(userId);
      res.json({ unreadCounts });
    } catch (error: any) {
      console.error("Error fetching unread counts:", error);
      res.status(500).json({ error: "Failed to fetch unread counts" });
    }
  });
}
