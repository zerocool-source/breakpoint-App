import type { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";

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

  app.post("/api/channels/sync", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      const [poolsListData, poolsData, customersData, customerListData] = await Promise.all([
        client.getPoolsList({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerPoolDetails({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerDetail({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerList({ limit: 1000 }).catch(() => ({ data: [] }))
      ]);
      
      console.log("Sync data counts:", {
        poolsList: poolsListData.data?.length || 0,
        poolsDetails: poolsData.data?.length || 0,
        customerDetails: customersData.data?.length || 0,
        customerList: customerListData.data?.length || 0
      });

      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          customerMap[String(c.RecordID)] = c;
        });
      }
      
      if (customerListData.data && Array.isArray(customerListData.data)) {
        customerListData.data.forEach((c: any) => {
          const id = String(c.RecordID || c.CustomerID);
          if (id && !customerMap[id]) {
            customerMap[id] = c;
          }
        });
      }

      const poolsListMap: Record<string, any> = {};
      if (poolsListData.data && Array.isArray(poolsListData.data)) {
        poolsListData.data.forEach((p: any) => {
          poolsListMap[String(p.RecordID || p.PoolID)] = p;
        });
      }

      const pools = poolsData.data || [];
      const channels = [];
      
      if (pools.length > 0) {
        console.log("Sample pool data fields:", Object.keys(pools[0]));
        console.log("Sample pool data:", JSON.stringify(pools[0], null, 2));
      }
      if (poolsListData.data?.length > 0) {
        console.log("Sample pools_list data fields:", Object.keys(poolsListData.data[0]));
      }
      if (customersData.data?.length > 0) {
        console.log("Sample customer_detail data fields:", Object.keys(customersData.data[0]));
      }
      
      for (const pool of pools) {
        const poolId = pool.RecordID || pool.PoolID;
        if (!poolId) continue;

        const customerId = String(pool.CustomerID);
        const customer = customerMap[customerId];
        const poolListEntry = poolsListMap[String(poolId)];
        
        let customerName = 
          customer?.Name || 
          customer?.CustomerName ||
          customer?.CompanyName ||
          poolListEntry?.CustomerName ||
          pool.CustomerName || 
          pool.Customer ||
          null;
        
        if (!customerName && customer?.FirstName) {
          customerName = `${customer.FirstName} ${customer.LastName || ''}`.trim();
        }
        
        const poolName = 
          pool.PoolName || 
          poolListEntry?.PoolName || 
          `Pool ${poolId}`;
          
        const address = 
          pool.PoolAddress || 
          poolListEntry?.Address ||
          customer?.Address || 
          null;
        
        const channel = await storage.upsertPropertyChannel({
          propertyId: String(poolId),
          propertyName: poolName,
          customerName: customerName,
          address: address,
          description: null,
        });
        channels.push(channel);
      }

      res.json({ success: true, syncedCount: channels.length, channels });
    } catch (error: any) {
      console.error("Error syncing channels:", error);
      res.status(500).json({ error: "Failed to sync channels" });
    }
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
