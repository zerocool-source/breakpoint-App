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
  ChevronDown,
  ChevronUp,
  MapPin,
  Megaphone,
  Lock,
  Paperclip,
  AtSign,
  X,
  CalendarDays,
  Building,
  Truck,
  HeartHandshake,
  FileText,
  Package,
  Calendar,
  Map,
  AlertTriangle,
  Clock,
  Heart,
  GraduationCap,
  Home,
  Building2,
  Users2,
  Landmark,
  type LucideIcon
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DepartmentChannel {
  id: string;
  name: string;
  department: string;
  description: string | null;
  icon: string | null;
  isPrivate: boolean;
  allowedRoles: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface PropertyChannel {
  id: string;
  propertyId: string;
  propertyName: string;
  customerName: string | null;
  address: string | null;
  category: string | null;
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
  category: null,
  description: "Company-wide announcements",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  office: Building,
  dispatch: Truck,
  hr: HeartHandshake
};

const DEPARTMENT_LABELS: Record<string, string> = {
  office: "Office",
  dispatch: "Dispatch",
  hr: "HR"
};

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  hash: Hash,
  building: Building,
  "file-text": FileText,
  package: Package,
  calendar: Calendar,
  map: Map,
  "alert-triangle": AlertTriangle,
  clock: Clock,
  heart: Heart,
  "graduation-cap": GraduationCap
};

const PROPERTY_CATEGORY_ICONS: Record<string, LucideIcon> = {
  residential: Home,
  commercial: Building2,
  hoa: Users2,
  municipal: Landmark,
  general: Hash
};

const PROPERTY_CATEGORY_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  hoa: "HOA",
  municipal: "Municipal",
  general: "General"
};

interface ChannelUser {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
  avatar?: string;
}

const getChannelMembers = (channelId: string): ChannelUser[] => {
  if (channelId === "announcements") {
    return [
      { id: "1", name: "Sarah Johnson", role: "office_admin", isOnline: true },
      { id: "2", name: "Mike Chen", role: "supervisor", isOnline: true },
      { id: "3", name: "David Rodriguez", role: "supervisor", isOnline: false },
      { id: "4", name: "Emily Williams", role: "service_technician", isOnline: true },
      { id: "5", name: "James Brown", role: "service_technician", isOnline: false },
      { id: "6", name: "Amanda Smith", role: "repair_technician", isOnline: true },
      { id: "7", name: "Robert Taylor", role: "repair_technician", isOnline: false },
      { id: "8", name: "Lisa Davis", role: "service_technician", isOnline: true },
    ];
  }
  const memberCount = 3 + Math.floor(Math.random() * 5);
  const roles = ["supervisor", "service_technician", "repair_technician"];
  const names = ["John Smith", "Maria Garcia", "Chris Lee", "Pat Wilson", "Alex Turner", "Sam Rivera", "Jordan Blake"];
  return Array.from({ length: memberCount }, (_, i) => ({
    id: `member-${i}`,
    name: names[i % names.length],
    role: roles[i % roles.length],
    isOnline: Math.random() > 0.5
  }));
};

export default function Channels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<PropertyChannel | null>(null);
  const [selectedDeptChannel, setSelectedDeptChannel] = useState<DepartmentChannel | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showThread, setShowThread] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days" | "custom">("all");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({ office: true, dispatch: true, hr: true });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ residential: true, commercial: true, hoa: true, municipal: true, general: true });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const { data: deptChannelsData, isLoading: deptChannelsLoading } = useQuery({
    queryKey: ["departmentChannels"],
    queryFn: async () => {
      const res = await fetch("/api/department-channels");
      if (!res.ok) throw new Error("Failed to fetch department channels");
      return res.json();
    },
  });

  const departmentChannels: DepartmentChannel[] = deptChannelsData?.channels || [];

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ["propertyChannels"],
    queryFn: async () => {
      const res = await fetch("/api/channels");
      if (!res.ok) throw new Error("Failed to fetch channels");
      return res.json();
    },
  });

  const channels: PropertyChannel[] = channelsData?.channels || [];

  const channelsByDepartment = departmentChannels.reduce((acc, ch) => {
    if (!acc[ch.department]) acc[ch.department] = [];
    acc[ch.department].push(ch);
    return acc;
  }, {} as Record<string, DepartmentChannel[]>);

  const channelsByCategory = channels.reduce((acc, ch) => {
    const cat = ch.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ch);
    return acc;
  }, {} as Record<string, PropertyChannel[]>);

  const activeChannelId = selectedChannel?.id || selectedDeptChannel?.id;
  
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["channelMessages", activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return { messages: [] };
      if (activeChannelId === "announcements") {
        return { messages: [] };
      }
      const res = await fetch(`/api/channels/${activeChannelId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!activeChannelId,
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
      queryClient.invalidateQueries({ queryKey: ["channelMessages", activeChannelId] });
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
      queryClient.invalidateQueries({ queryKey: ["channelMessages", activeChannelId] });
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
      queryClient.invalidateQueries({ queryKey: ["channelMessages", activeChannelId] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const channelMembers = activeChannelId ? getChannelMembers(activeChannelId) : [];
  const onlineMembers = channelMembers.filter(m => m.isOnline);

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "today": return "Today";
      case "7days": return "Last 7 Days";
      case "30days": return "Last 30 Days";
      case "custom": 
        if (customStartDate && customEndDate) {
          return `${format(new Date(customStartDate), "MMM d")} - ${format(new Date(customEndDate), "MMM d")}`;
        }
        return "Custom Range";
      default: return "All Time";
    }
  };

  const filterMessagesByDate = (msgs: ChannelMessage[]) => {
    if (dateFilter === "all") return msgs;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return msgs.filter(msg => {
      const msgDate = new Date(msg.createdAt);
      switch (dateFilter) {
        case "today":
          return msgDate >= startOfToday;
        case "7days":
          const sevenDaysAgo = new Date(startOfToday);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return msgDate >= sevenDaysAgo;
        case "30days":
          const thirtyDaysAgo = new Date(startOfToday);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return msgDate >= thirtyDaysAgo;
        case "custom":
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return msgDate >= start && msgDate <= end;
          }
          return true;
        default:
          return true;
      }
    });
  };

  const filteredMessages = filterMessagesByDate(messages);

  const filteredChannels = channels.filter(ch =>
    ch.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const channelId = selectedChannel?.id || selectedDeptChannel?.id;
    if (!messageInput.trim() || !channelId) return;
    if (selectedChannel?.id === "announcements" && CURRENT_USER.role !== "office_admin") return;
    sendMessageMutation.mutate({ channelId, content: messageInput });
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
        <div className="w-80 flex flex-col bg-[#1e3a5f] text-white">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-wide uppercase">Communication Hub</h2>
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
                  setSelectedDeptChannel(null);
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

              {/* Department Channels Section */}
              {(deptChannelsLoading) ? (
                <div className="text-center py-4 text-white/50 text-sm">Loading department channels...</div>
              ) : (
                <>
                  {(["office", "dispatch", "hr"] as const).map(dept => {
                    const DeptIcon = DEPARTMENT_ICONS[dept];
                    const deptChannels = channelsByDepartment[dept] || [];
                    const isExpanded = expandedDepts[dept];
                    
                    return (
                      <div key={dept} className="mb-2">
                        <button
                          onClick={() => setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }))}
                          className="w-full flex items-center gap-2 px-2 py-2 text-white/90 hover:bg-white/5 rounded-lg transition-colors"
                          data-testid={`dept-section-${dept}`}
                        >
                          <DeptIcon className="w-4 h-4 text-[#f97316]" />
                          <span className="font-semibold text-sm uppercase tracking-wide flex-1 text-left">{DEPARTMENT_LABELS[dept]}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
                        </button>
                        
                        {isExpanded && (
                          <div className="ml-2 space-y-0.5">
                            {deptChannels.length === 0 ? (
                              <p className="text-xs text-white/40 px-2 py-1">No channels</p>
                            ) : (
                              deptChannels.map(ch => {
                                const ChannelIcon = CHANNEL_ICONS[ch.icon || "hash"] || Hash;
                                return (
                                  <button
                                    key={ch.id}
                                    onClick={() => {
                                      setSelectedDeptChannel(ch);
                                      setSelectedChannel(null);
                                      setShowThread(null);
                                    }}
                                    className={cn(
                                      "w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2",
                                      selectedDeptChannel?.id === ch.id 
                                        ? "bg-white/20 text-white" 
                                        : "hover:bg-white/10 text-white/70"
                                    )}
                                    data-testid={`dept-channel-${ch.id}`}
                                  >
                                    <ChannelIcon className="w-4 h-4 text-[#f97316] flex-shrink-0" />
                                    <span className="text-sm truncate">{ch.name}</span>
                                    {ch.isPrivate && <Lock className="w-3 h-3 ml-auto text-white/50" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              <Separator className="my-3 bg-white/10" />

              {/* Property Channels Section */}
              <div className="mb-2">
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="font-semibold text-sm uppercase tracking-wide text-white/90">Properties</span>
                </div>
              </div>

              {channelsLoading ? (
                <div className="text-center py-4 text-white/50 text-sm">Loading properties...</div>
              ) : channels.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No property channels found</p>
                </div>
              ) : (
                <>
                  {(["residential", "commercial", "hoa", "municipal", "general"] as const).map(cat => {
                    const catChannels = channelsByCategory[cat] || [];
                    if (catChannels.length === 0) return null;
                    
                    const filteredCatChannels = catChannels.filter(ch =>
                      ch.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      ch.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      ch.address?.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    
                    if (filteredCatChannels.length === 0 && searchQuery) return null;
                    
                    const CatIcon = PROPERTY_CATEGORY_ICONS[cat];
                    const isExpanded = expandedCategories[cat];
                    
                    return (
                      <div key={cat} className="mb-2">
                        <button
                          onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-white/80 hover:bg-white/5 rounded transition-colors"
                          data-testid={`category-section-${cat}`}
                        >
                          <CatIcon className="w-3.5 h-3.5 text-white/60" />
                          <span className="text-xs font-medium uppercase tracking-wide flex-1 text-left">{PROPERTY_CATEGORY_LABELS[cat]}</span>
                          <Badge variant="secondary" className="bg-white/10 text-white/60 text-xs px-1.5 py-0">
                            {filteredCatChannels.length}
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-white/50" /> : <ChevronDown className="w-3 h-3 text-white/50" />}
                        </button>
                        
                        {isExpanded && (
                          <div className="ml-2 space-y-0.5">
                            {(searchQuery ? filteredCatChannels : catChannels).map(channel => (
                              <button
                                key={channel.id}
                                onClick={() => {
                                  setSelectedChannel(channel);
                                  setSelectedDeptChannel(null);
                                  setShowThread(null);
                                }}
                                className={cn(
                                  "w-full text-left p-2 rounded-lg transition-all",
                                  selectedChannel?.id === channel.id 
                                    ? "bg-white/20" 
                                    : "hover:bg-white/10"
                                )}
                                data-testid={`channel-${channel.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  <Hash className="w-3.5 h-3.5 mt-0.5 text-[#f97316] flex-shrink-0" />
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
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {(selectedChannel || selectedDeptChannel) ? (
            <>
              {/* Channel Header */}
              <div className="px-6 py-4 border-b border-[#e5e7eb] bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedChannel?.id === "announcements" ? (
                      <Megaphone className="w-5 h-5 text-[#f97316]" />
                    ) : selectedDeptChannel ? (
                      (() => {
                        const DeptIcon = DEPARTMENT_ICONS[selectedDeptChannel.department] || Hash;
                        return <DeptIcon className="w-5 h-5 text-[#f97316]" />;
                      })()
                    ) : (
                      <Hash className="w-5 h-5 text-[#f97316]" />
                    )}
                    <div>
                      <h3 className="font-bold text-[#1f2937]">
                        {selectedDeptChannel 
                          ? `${DEPARTMENT_LABELS[selectedDeptChannel.department]} - ${selectedDeptChannel.name}`
                          : (selectedChannel?.customerName || selectedChannel?.propertyName)}
                      </h3>
                      <p className="text-xs text-[#6b7280]">
                        {selectedDeptChannel 
                          ? selectedDeptChannel.description 
                          : (selectedChannel?.address || selectedChannel?.description || '')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={memberDropdownRef}>
                      <button
                        onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                        data-testid="button-member-count"
                      >
                        <Users className="w-4 h-4 text-[#0077b6]" />
                        <span className="text-sm text-[#6b7280]">{channelMembers.length}</span>
                        <span className="w-2 h-2 rounded-full bg-[#22c55e]" title={`${onlineMembers.length} online`} />
                      </button>
                      
                      {showMemberDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#e5e7eb] z-50">
                          <div className="p-3 border-b border-[#e5e7eb]">
                            <h4 className="font-semibold text-[#1f2937] text-sm">Channel Members</h4>
                            <p className="text-xs text-[#6b7280]">{channelMembers.length} members · {onlineMembers.length} online</p>
                          </div>
                          <ScrollArea className="max-h-64">
                            <div className="p-2">
                              {channelMembers.map(member => {
                                const roleInfo = getRoleInfo(member.role);
                                return (
                                  <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
                                    <div className="relative">
                                      <Avatar className="w-8 h-8">
                                        <AvatarFallback className="bg-[#0077b6] text-white text-xs">
                                          {getInitials(member.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span 
                                        className={cn(
                                          "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white",
                                          member.isOnline ? "bg-[#22c55e]" : "bg-[#9ca3af]"
                                        )} 
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-[#1f2937] truncate">{member.name}</p>
                                      <div className="flex items-center gap-1">
                                        <span className={cn("w-1.5 h-1.5 rounded-full", roleInfo.dot)} />
                                        <span className="text-xs text-[#6b7280]">{roleInfo.label}</span>
                                      </div>
                                    </div>
                                    <span className={cn(
                                      "text-xs",
                                      member.isOnline ? "text-[#22c55e]" : "text-[#9ca3af]"
                                    )}>
                                      {member.isOnline ? "Online" : "Offline"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                    
                    {/* Date Filter Dropdown */}
                    <div className="relative" ref={dateDropdownRef}>
                      <button
                        onClick={() => setShowDateDropdown(!showDateDropdown)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded border text-sm transition-colors",
                          dateFilter !== "all"
                            ? "bg-[#fff7ed] border-[#f97316] text-[#f97316]"
                            : "border-slate-200 hover:bg-slate-100 text-[#6b7280]"
                        )}
                        data-testid="button-date-filter"
                      >
                        <CalendarDays className="w-4 h-4" />
                        <span>{getDateFilterLabel()}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      
                      {showDateDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-[#e5e7eb] z-50">
                          <div className="py-1">
                            {[
                              { value: "all" as const, label: "All Time" },
                              { value: "today" as const, label: "Today" },
                              { value: "7days" as const, label: "Last 7 Days" },
                              { value: "30days" as const, label: "Last 30 Days" },
                            ].map(option => (
                              <button
                                key={option.value}
                                onClick={() => {
                                  setDateFilter(option.value);
                                  setCustomStartDate("");
                                  setCustomEndDate("");
                                  setShowDateDropdown(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-sm transition-colors",
                                  dateFilter === option.value
                                    ? "bg-[#0077b6] text-white"
                                    : "hover:bg-slate-100 text-[#1f2937]"
                                )}
                                data-testid={`button-date-${option.value}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          
                          <div className="border-t border-[#e5e7eb] p-3">
                            <p className="text-xs font-medium text-[#6b7280] mb-2">Custom Date Range</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-[#6b7280] w-12">From:</label>
                                <Input
                                  type="date"
                                  value={customStartDate}
                                  onChange={(e) => setCustomStartDate(e.target.value)}
                                  className="h-8 text-sm flex-1"
                                  data-testid="input-date-start"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-[#6b7280] w-12">To:</label>
                                <Input
                                  type="date"
                                  value={customEndDate}
                                  onChange={(e) => setCustomEndDate(e.target.value)}
                                  className="h-8 text-sm flex-1"
                                  data-testid="input-date-end"
                                />
                              </div>
                              <Button
                                size="sm"
                                className="w-full mt-2 bg-[#0077b6] hover:bg-[#0077b6]/90"
                                disabled={!customStartDate || !customEndDate}
                                onClick={() => {
                                  if (customStartDate && customEndDate) {
                                    setDateFilter("custom");
                                    setShowDateDropdown(false);
                                  }
                                }}
                                data-testid="button-apply-custom-date"
                              >
                                Apply Range
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#6b7280] hover:text-[#1f2937] hover:bg-slate-100"
                      onClick={() => setShowRightSidebar(!showRightSidebar)}
                      data-testid="button-details"
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
                    ) : filteredMessages.length === 0 ? (
                      <div className="text-center py-16 text-[#6b7280]">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        {messages.length === 0 ? (
                          <>
                            <p className="font-medium text-[#1f2937]">No messages yet</p>
                            <p className="text-sm mt-1">Start the conversation for this property</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-[#1f2937]">No messages in this time period</p>
                            <p className="text-sm mt-1">Try selecting a different date range</p>
                            <button 
                              onClick={() => setDateFilter("all")}
                              className="mt-3 text-sm text-[#0077b6] hover:underline"
                            >
                              Show all messages
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      groupMessagesByDate(filteredMessages).map(group => (
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
