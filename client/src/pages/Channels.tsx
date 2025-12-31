import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MapPin
} from "lucide-react";
import { format } from "date-fns";

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
  id: "office-manager-1",
  name: "Office Manager"
};

const EMOJI_OPTIONS = ["👍", "❤️", "🔥", "✅", "👀", "🎉"];

export default function Channels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<PropertyChannel | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showThread, setShowThread] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
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
    return format(date, "h:mm a");
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    return format(date, "MMM d, yyyy");
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

  const MessageComponent = ({ message, isThreadReply = false }: { message: ChannelMessage; isThreadReply?: boolean }) => {
    const [showReactions, setShowReactions] = useState(false);

    const groupedReactions = message.reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r.userId);
      return acc;
    }, {} as Record<string, string[]>);

    return (
      <div 
        className={`group flex gap-3 p-3 hover:bg-slate-800/30 rounded-lg transition-colors ${message.isPinned ? 'bg-yellow-900/20 border-l-2 border-yellow-500' : ''}`}
        data-testid={`message-${message.id}`}
      >
        <Avatar className="h-9 w-9 bg-gradient-to-br from-sky-500 to-blue-600">
          <AvatarFallback className="text-xs font-bold text-white">
            {getInitials(message.authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-sm">{message.authorName}</span>
            <span className="text-xs text-slate-500">{formatMessageTime(message.createdAt)}</span>
            {message.isEdited && <span className="text-xs text-slate-500">(edited)</span>}
            {message.isPinned && <Pin className="w-3 h-3 text-yellow-500" />}
          </div>
          <p className="text-slate-300 text-sm whitespace-pre-wrap break-words">{message.content}</p>
          
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })}
                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 rounded-full text-xs hover:bg-slate-600/50 transition-colors"
                >
                  <span>{emoji}</span>
                  <span className="text-slate-400">{users.length}</span>
                </button>
              ))}
            </div>
          )}

          {!isThreadReply && message.replyCount > 0 && (
            <button
              onClick={() => setShowThread(message.id)}
              className="flex items-center gap-1 mt-2 text-xs text-sky-400 hover:text-sky-300 transition-colors"
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
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              >
                <Smile className="w-4 h-4" />
              </button>
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-lg z-10">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        addReactionMutation.mutate({ messageId: message.id, emoji });
                        setShowReactions(false);
                      }}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!isThreadReply && (
              <button 
                onClick={() => setShowThread(message.id)}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                data-testid={`button-reply-${message.id}`}
              >
                <Reply className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => pinMessageMutation.mutate({ messageId: message.id, isPinned: !message.isPinned })}
              className={`p-1 hover:bg-slate-700 rounded ${message.isPinned ? 'text-yellow-500' : 'text-slate-400 hover:text-white'}`}
            >
              <Pin className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-120px)]">
        {/* Channel Sidebar */}
        <div className="w-72 border-r border-slate-700/50 flex flex-col bg-slate-900/50">
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-white tracking-tight">PROPERTY CHANNELS</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="h-8 w-8 p-0"
                data-testid="button-sync-channels"
              >
                <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-800/50 border-slate-700 text-sm"
                data-testid="input-search-channels"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {channelsLoading ? (
                <div className="text-center py-8 text-slate-500">Loading channels...</div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No channels found</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncMutation.mutate()}
                    className="mt-2"
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
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedChannel?.id === channel.id 
                        ? 'bg-sky-600/30 border border-sky-500/50' 
                        : 'hover:bg-slate-800/50'
                    }`}
                    data-testid={`channel-${channel.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <Hash className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white text-sm truncate">{channel.propertyName}</p>
                        {channel.customerName && (
                          <p className="text-xs text-slate-400 truncate">{channel.customerName}</p>
                        )}
                        {channel.address && (
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
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
        <div className="flex-1 flex flex-col">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="p-4 border-b border-slate-700/50 bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 text-sky-400" />
                    <div>
                      <h3 className="font-bold text-white">{selectedChannel.propertyName}</h3>
                      <p className="text-xs text-slate-400">
                        {selectedChannel.customerName} {selectedChannel.address ? `• ${selectedChannel.address}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                      <Users className="w-4 h-4 mr-1" />
                      Members
                    </Button>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                      <Pin className="w-4 h-4 mr-1" />
                      Pinned
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Main Messages */}
                <ScrollArea className={`flex-1 ${showThread ? 'border-r border-slate-700/50' : ''}`}>
                  <div className="p-4 space-y-4">
                    {messagesLoading ? (
                      <div className="text-center py-8 text-slate-500">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-16 text-slate-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm mt-1">Start the conversation for this property</p>
                      </div>
                    ) : (
                      groupMessagesByDate(messages).map(group => (
                        <div key={group.date}>
                          <div className="flex items-center gap-4 my-4">
                            <Separator className="flex-1 bg-slate-700/50" />
                            <span className="text-xs text-slate-500 font-medium">{group.date}</span>
                            <Separator className="flex-1 bg-slate-700/50" />
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
                  <div className="w-96 flex flex-col bg-slate-900/50">
                    <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                      <h4 className="font-bold text-white">Thread</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowThread(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4">
                        <MessageComponent message={parentMessage} isThreadReply />
                        <Separator className="my-4 bg-slate-700/50" />
                        <p className="text-xs text-slate-500 mb-3">{threadReplies.length} replies</p>
                        {threadReplies.map(reply => (
                          <MessageComponent key={reply.id} message={reply} isThreadReply />
                        ))}
                      </div>
                    </ScrollArea>
                    <form onSubmit={handleSendReply} className="p-4 border-t border-slate-700/50">
                      <div className="flex gap-2">
                        <Input
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          placeholder="Reply in thread..."
                          className="flex-1 bg-slate-800/50 border-slate-700"
                          data-testid="input-thread-reply"
                        />
                        <Button 
                          type="submit" 
                          disabled={!replyInput.trim() || sendMessageMutation.isPending}
                          className="bg-sky-600 hover:bg-sky-700"
                          data-testid="button-send-reply"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700/50 bg-slate-900/30">
                <div className="flex gap-3">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Message #${selectedChannel.propertyName.toLowerCase().replace(/\s+/g, '-')}...`}
                    className="flex-1 bg-slate-800/50 border-slate-700"
                    data-testid="input-message"
                  />
                  <Button 
                    type="submit" 
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    className="bg-sky-600 hover:bg-sky-700 font-semibold px-6"
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Hash className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-xl font-bold text-white mb-2">Select a Channel</h3>
                <p className="text-sm">Choose a property channel from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
