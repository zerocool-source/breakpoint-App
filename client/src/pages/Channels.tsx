import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Hash, 
  Send, 
  RefreshCw, 
  MessageSquare, 
  Users, 
  Search,
  Pin,
  Smile,
  MoreHorizontal,
  Reply,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Megaphone,
  Lock,
  Paperclip,
  AtSign,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PropertyChannel {
  id: string;
  propertyId: string;
  propertyName: string;
  customerName: string | null;
  address: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChannelMessage {
  id: string;
  channelId: string;
  parentMessageId: string | null;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  messageType: string;
  attachments: { name: string; url: string; type: string }[];
  mentions: string[];
  isEdited: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  reactions: { id: string; emoji: string; userId: string }[];
  replyCount: number;
}

interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  role: string;
  joinedAt: string;
}

const CURRENT_USER = {
  id: "office-admin-1",
  name: "Office Admin",
  role: "office_admin"
};

const EMOJI_OPTIONS = ["👍", "❤️", "🔥", "✅", "👀", "🎉"];

const ROLE_COLORS: Record<string, { dot: string; label: string }> = {
  office_admin: { dot: "bg-[#0077b6]", label: "Office Admin" },
  supervisor: { dot: "bg-[#f97316]", label: "Supervisor" },
  service_technician: { dot: "bg-[#14b8a6]", label: "Service Technician" },
  repair_technician: { dot: "bg-[#22c55e]", label: "Repair Technician" },
  default: { dot: "bg-[#6b7280]", label: "Team Member" }
};

const ANNOUNCEMENTS_CHANNEL = {
  id: "announcements",
  propertyId: "announcements",
  propertyName: "Announcements",
  customerName: null,
  address: null,
  description: "Company-wide announcements",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export default function Channels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<PropertyChannel | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showThread, setShowThread] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ["propertyChannels"],
    queryFn: async () => {
      const res = await fetch("/api/channels");
      if (!res.ok) throw new Error("Failed to fetch channels");
      return res.json();
    },
  });

  const channels: PropertyChannel[] = channelsData?.channels || [];

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["channelMessages", selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel) return { messages: [] };
      if (selectedChannel.id === "announcements") {
        return { messages: [] };
      }
      const res = await fetch(`/api/channels/${selectedChannel.id}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedChannel,
    refetchInterval: 5000,
  });

  const messages: ChannelMessage[] = messagesData?.messages || [];

  const { data: threadData } = useQuery({
    queryKey: ["threadReplies", showThread],
    queryFn: async () => {
      if (!showThread) return { replies: [] };
      const res = await fetch(`/api/channels/messages/${showThread}/replies`);
      if (!res.ok) throw new Error("Failed to fetch replies");
      return res.json();
    },
    enabled: !!showThread,
    refetchInterval: 3000,
  });

  const threadReplies: ChannelMessage[] = threadData?.replies || [];
  const parentMessage = messages.find(m => m.id === showThread);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/channels/sync", { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync channels");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["propertyChannels"] });
      toast({
        title: "Channels Synced",
        description: `Synced ${data.syncedCount} property channels from Pool Brain`,
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync channels from Pool Brain",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ channelId, content, parentMessageId }: { channelId: string; content: string; parentMessageId?: string }) => {
      const res = await fetch(`/api/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: CURRENT_USER.id,
          authorName: CURRENT_USER.name,
          content,
          parentMessageId: parentMessageId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMessages", selectedChannel?.id] });
      if (showThread) {
        queryClient.invalidateQueries({ queryKey: ["threadReplies", showThread] });
      }
      setMessageInput("");
      setReplyInput("");
    },
  });


  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await fetch(`/api/channels/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: CURRENT_USER.id, emoji }),
      });
      if (!res.ok) throw new Error("Failed to add reaction");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMessages", selectedChannel?.id] });
      queryClient.invalidateQueries({ queryKey: ["threadReplies", showThread] });
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const res = await fetch(`/api/channels/messages/${messageId}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) throw new Error("Failed to pin message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channelMessages", selectedChannel?.id] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredChannels = channels.filter(ch =>
    ch.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChannel) return;
    if (selectedChannel.id === "announcements" && CURRENT_USER.role !== "office_admin") return;
    sendMessageMutation.mutate({ channelId: selectedChannel.id, content: messageInput });
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !selectedChannel || !showThread) return;
    sendMessageMutation.mutate({ 
      channelId: selectedChannel.id, 
      content: replyInput, 
      parentMessageId: showThread 
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today ${format(date, "h:mma")}`;
    }
    return format(date, "MMM d, h:mma");
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    return format(date, "EEEE, MMMM d");
  };

  const groupMessagesByDate = (msgs: ChannelMessage[]) => {
    const groups: { date: string; messages: ChannelMessage[] }[] = [];
    let currentDate = "";
    
    msgs.forEach(msg => {
      const msgDate = formatMessageDate(msg.createdAt);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    
    return groups;
  };

  const getRoleInfo = (role?: string) => {
    return ROLE_COLORS[role || "default"] || ROLE_COLORS.default;
  };

  const pinnedMessages = messages.filter(m => m.isPinned);
  const activeThreads = messages.filter(m => m.replyCount > 0);

  const MessageComponent = ({ message, isThreadReply = false, isInlineThread = false }: { message: ChannelMessage; isThreadReply?: boolean; isInlineThread?: boolean }) => {
    const [showReactions, setShowReactions] = useState(false);
    const roleInfo = getRoleInfo(message.authorRole);

    const groupedReactions = message.reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r.userId);
      return acc;
    }, {} as Record<string, string[]>);

    return (
      <div className={cn("group", isInlineThread && "pl-12")}>
        <div 
          className={cn(
            "flex gap-3 p-3 rounded-lg transition-colors",
            !isInlineThread && "hover:bg-slate-50",
            message.isPinned && "bg-orange-50 border-l-3 border-[#f97316]"
          )}
          data-testid={`message-${message.id}`}
        >
          <Avatar className="h-10 w-10 bg-[#0077b6] flex-shrink-0">
            <AvatarFallback className="text-sm font-bold text-white bg-[#0077b6]">
              {getInitials(message.authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-[#1f2937] text-sm">{message.authorName}</span>
              <span className="flex items-center gap-1 text-xs text-[#6b7280]">
                <span className={cn("w-2 h-2 rounded-full", roleInfo.dot)} />
                {roleInfo.label}
              </span>
              <span className="text-xs text-[#9ca3af] ml-auto">{formatMessageTime(message.createdAt)}</span>
              {message.isEdited && <span className="text-xs text-[#9ca3af]">(edited)</span>}
              {message.isPinned && <Pin className="w-3 h-3 text-[#f97316]" />}
            </div>
            
            <div className="bg-[#f1f5f9] rounded-lg px-3 py-2 inline-block max-w-full">
              <p className="text-[#1f2937] text-sm whitespace-pre-wrap break-words">{message.content}</p>
            </div>
            
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {Object.entries(groupedReactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })}
                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-xs hover:bg-slate-200 transition-colors border border-slate-200"
                  >
                    <span>{emoji}</span>
                    <span className="text-[#6b7280]">{users.length}</span>
                  </button>
                ))}
              </div>
            )}

            {!isThreadReply && !isInlineThread && message.replyCount > 0 && (
              <button
                onClick={() => setShowThread(message.id)}
                className="flex items-center gap-1 mt-2 text-xs text-[#0077b6] hover:text-[#0077b6]/80 transition-colors font-medium"
                data-testid={`button-view-replies-${message.id}`}
              >
                <MessageSquare className="w-3 h-3" />
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-2">
              <div className="relative">
                <button 
                  onClick={() => setShowReactions(!showReactions)}
                  className="p-1.5 hover:bg-slate-100 rounded text-[#6b7280] hover:text-[#1f2937]"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {showReactions && (
                  <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-lg z-10">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          addReactionMutation.mutate({ messageId: message.id, emoji });
                          setShowReactions(false);
                        }}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!isThreadReply && !isInlineThread && (
                <button 
                  onClick={() => setShowThread(message.id)}
                  className="p-1.5 hover:bg-slate-100 rounded text-[#6b7280] hover:text-[#1f2937]"
                  data-testid={`button-reply-${message.id}`}
                >
                  <Reply className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => pinMessageMutation.mutate({ messageId: message.id, isPinned: !message.isPinned })}
                className={cn(
                  "p-1.5 hover:bg-slate-100 rounded",
                  message.isPinned ? "text-[#f97316]" : "text-[#6b7280] hover:text-[#1f2937]"
                )}
                data-testid={`button-pin-${message.id}`}
              >
                <Pin className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-80px)] bg-[#f9fafb]">
        {/* Left Sidebar - Channels */}
        <div className="w-72 flex flex-col bg-[#1e3a5f] text-white">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-wide uppercase">Property Channels</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
                data-testid="button-sync-channels"
              >
                <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm h-9"
                data-testid="input-search-channels"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {/* Announcements Channel - Always at top */}
              <button
                onClick={() => {
                  setSelectedChannel(ANNOUNCEMENTS_CHANNEL);
                  setShowThread(null);
                }}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg transition-all flex items-center gap-2",
                  selectedChannel?.id === "announcements" 
                    ? "bg-[#f97316] text-white" 
                    : "hover:bg-white/10 text-white/80"
                )}
                data-testid="channel-announcements"
              >
                <Megaphone className="w-4 h-4 text-[#f97316] flex-shrink-0" />
                <span className="font-medium text-sm">Announcements</span>
                <Lock className="w-3 h-3 ml-auto text-white/50" />
              </button>

              <Separator className="my-2 bg-white/10" />

              {channelsLoading ? (
                <div className="text-center py-8 text-white/50 text-sm">Loading channels...</div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No channels found</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncMutation.mutate()}
                    className="mt-2 text-white border-white/30 hover:bg-white/10"
                    data-testid="button-sync-channels-empty"
                  >
                    Sync from Pool Brain
                  </Button>
                </div>
              ) : (
                filteredChannels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannel(channel);
                      setShowThread(null);
                    }}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg transition-all",
                      selectedChannel?.id === channel.id 
                        ? "bg-white/20" 
                        : "hover:bg-white/10"
                    )}
                    data-testid={`channel-${channel.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <Hash className="w-4 h-4 mt-0.5 text-[#f97316] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white text-sm truncate">{channel.customerName || channel.propertyName}</p>
                        {channel.address && (
                          <p className="text-xs text-white/50 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {channel.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="px-6 py-4 border-b border-[#e5e7eb] bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedChannel.id === "announcements" ? (
                      <Megaphone className="w-5 h-5 text-[#f97316]" />
                    ) : (
                      <Hash className="w-5 h-5 text-[#f97316]" />
                    )}
                    <div>
                      <h3 className="font-bold text-[#1f2937]">{selectedChannel.customerName || selectedChannel.propertyName}</h3>
                      <p className="text-xs text-[#6b7280]">
                        {selectedChannel.address || selectedChannel.description || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#6b7280] hover:text-[#1f2937] hover:bg-slate-100"
                      onClick={() => setShowRightSidebar(!showRightSidebar)}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Main Messages */}
                <ScrollArea className={cn("flex-1", showThread && "border-r border-[#e5e7eb]")}>
                  <div className="p-4 space-y-2">
                    {messagesLoading ? (
                      <div className="text-center py-8 text-[#6b7280]">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-16 text-[#6b7280]">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-[#1f2937]">No messages yet</p>
                        <p className="text-sm mt-1">Start the conversation for this property</p>
                      </div>
                    ) : (
                      groupMessagesByDate(messages).map(group => (
                        <div key={group.date}>
                          <div className="flex items-center gap-4 my-6">
                            <Separator className="flex-1 bg-[#e5e7eb]" />
                            <span className="text-xs text-[#6b7280] font-medium px-2">{group.date}</span>
                            <Separator className="flex-1 bg-[#e5e7eb]" />
                          </div>
                          {group.messages.map(message => (
                            <MessageComponent key={message.id} message={message} />
                          ))}
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Thread Panel */}
                {showThread && parentMessage && (
                  <div className="w-96 flex flex-col bg-[#f9fafb] border-l border-[#e5e7eb]">
                    <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
                      <h4 className="font-bold text-[#1f2937]">Thread</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowThread(null)}
                        className="text-[#6b7280] hover:text-[#1f2937]"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4">
                        <MessageComponent message={parentMessage} isThreadReply />
                        <Separator className="my-4 bg-[#e5e7eb]" />
                        <p className="text-xs text-[#6b7280] mb-3 font-medium">{threadReplies.length} replies</p>
                        {threadReplies.map(reply => (
                          <MessageComponent key={reply.id} message={reply} isThreadReply />
                        ))}
                      </div>
                    </ScrollArea>
                    <form onSubmit={handleSendReply} className="p-4 border-t border-[#e5e7eb] bg-white">
                      <div className="flex gap-2">
                        <Input
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          placeholder="Reply in thread..."
                          className="flex-1 border-[#e5e7eb] focus:border-[#f97316] focus:ring-[#f97316]"
                          data-testid="input-thread-reply"
                        />
                        <Button 
                          type="submit" 
                          disabled={!replyInput.trim() || sendMessageMutation.isPending}
                          className="bg-[#f97316] hover:bg-[#f97316]/90"
                          data-testid="button-send-reply"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Right Sidebar - Details */}
                {showRightSidebar && !showThread && (
                  <div className="w-80 flex flex-col bg-[#f9fafb] border-l border-[#e5e7eb]">
                    <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
                      <h4 className="font-bold text-[#1f2937]">Channel Details</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowRightSidebar(false)}
                        className="text-[#6b7280] hover:text-[#1f2937]"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-6">
                        {/* Active Threads */}
                        <div>
                          <h5 className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-3">
                            Active Threads ({activeThreads.length})
                          </h5>
                          {activeThreads.length === 0 ? (
                            <p className="text-sm text-[#9ca3af]">No active threads</p>
                          ) : (
                            <div className="space-y-2">
                              {activeThreads.slice(0, 5).map(thread => (
                                <button
                                  key={thread.id}
                                  onClick={() => setShowThread(thread.id)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-white border border-[#e5e7eb] bg-white"
                                >
                                  <p className="text-sm text-[#1f2937] truncate">{thread.content.slice(0, 50)}...</p>
                                  <p className="text-xs text-[#6b7280] mt-1">{thread.replyCount} replies</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pinned Messages */}
                        <div>
                          <h5 className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-3">
                            Pinned Messages ({pinnedMessages.length})
                          </h5>
                          {pinnedMessages.length === 0 ? (
                            <p className="text-sm text-[#9ca3af]">No pinned messages</p>
                          ) : (
                            <div className="space-y-2">
                              {pinnedMessages.map(msg => (
                                <div
                                  key={msg.id}
                                  className="p-2 rounded-lg bg-white border border-[#e5e7eb]"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Pin className="w-3 h-3 text-[#f97316]" />
                                    <span className="text-xs font-medium text-[#1f2937]">{msg.authorName}</span>
                                  </div>
                                  <p className="text-sm text-[#6b7280] truncate">{msg.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Channel Info */}
                        <div>
                          <h5 className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-3">
                            About
                          </h5>
                          <div className="space-y-2 text-sm">
                            <p className="text-[#1f2937]">{selectedChannel.propertyName}</p>
                            {selectedChannel.address && (
                              <p className="text-[#6b7280] flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {selectedChannel.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Message Input */}
              {(selectedChannel.id !== "announcements" || CURRENT_USER.role === "office_admin") && (
                <form onSubmit={handleSendMessage} className="p-4 border-t border-[#e5e7eb] bg-white">
                  <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-1">
                      <button type="button" className="p-2 hover:bg-slate-100 rounded text-[#6b7280]" data-testid="button-attach">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button type="button" className="p-2 hover:bg-slate-100 rounded text-[#6b7280]" data-testid="button-mention">
                        <AtSign className="w-5 h-5" />
                      </button>
                      <button type="button" className="p-2 hover:bg-slate-100 rounded text-[#6b7280]" data-testid="button-emoji">
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={`Message #${(selectedChannel.propertyName || 'channel').toLowerCase().replace(/\s+/g, '-')}...`}
                      className="flex-1 border-[#e5e7eb] focus:border-[#f97316] focus:ring-[#f97316]"
                      data-testid="input-message"
                    />
                    <Button 
                      type="submit" 
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      className="bg-[#f97316] hover:bg-[#f97316]/90 font-semibold px-6"
                      data-testid="button-send-message"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </form>
              )}

              {/* Read-only notice for non-admins in Announcements */}
              {selectedChannel.id === "announcements" && CURRENT_USER.role !== "office_admin" && (
                <div className="p-4 border-t border-[#e5e7eb] bg-slate-50 text-center">
                  <p className="text-sm text-[#6b7280] flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    Only Office Admins can post in Announcements
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#6b7280]">
              <div className="text-center">
                <Hash className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-bold text-[#1f2937] mb-2">Select a Channel</h3>
                <p className="text-sm">Choose a property channel from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
