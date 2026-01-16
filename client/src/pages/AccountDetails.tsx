import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageCircle, ClipboardList, Camera, FileText, ArrowLeft, Search, 
  Send, Pin, AlertTriangle, Wrench, Droplets, CheckCircle2, HelpCircle,
  User, Users, Building, Clock, Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MESSAGE_TYPES = [
  { value: "update", label: "Update", icon: MessageCircle, color: "bg-[#0078D4]/20 text-[#0078D4] border-[#0078D4]/50" },
  { value: "assist", label: "Assist", icon: HelpCircle, color: "bg-[#22D69A]/20 text-green-300 border-green-400/50" },
  { value: "issue", label: "Issue", icon: AlertTriangle, color: "bg-red-500/20 text-red-300 border-red-400/50" },
  { value: "repair", label: "Repair Needed", icon: Wrench, color: "bg-[#FF8000]/20 text-orange-300 border-orange-400/50" },
  { value: "chemical", label: "Chemical/Safety", icon: Droplets, color: "bg-[#17BEBB]/20 text-purple-300 border-purple-400/50" },
  { value: "task", label: "Task Created", icon: CheckCircle2, color: "bg-[#17BEBB]/20 text-[#17BEBB] border-[#17BEBB]/50" },
  { value: "photo", label: "Photo", icon: Camera, color: "bg-[#EF4444]/20 text-pink-300 border-[#EF4444]/50" },
];

const ROLES = [
  { value: "tech", label: "@tech" },
  { value: "supervisor", label: "@supervisor" },
  { value: "office", label: "@office" },
  { value: "repair", label: "@repair" },
];

interface ThreadMessage {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  type: string;
  text: string | null;
  photoUrls: string[];
  taggedUserIds: string[];
  taggedRoles: string[];
  visibility: string;
  pinned: boolean;
  createdAt: string;
}

function ThreadPanel({ threadId, accountName }: { threadId: string; accountName: string }) {
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("update");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [taggedRoles, setTaggedRoles] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["/api/threads", threadId, "messages", filterType, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/threads/${threadId}/messages?${params}`);
      return res.json();
    },
    enabled: !!threadId,
  });

  const createMessage = useMutation({
    mutationFn: async (data: { type: string; text: string; taggedRoles: string[] }) => {
      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: "office",
          authorName: "Office",
          type: data.type,
          text: data.text,
          taggedRoles: data.taggedRoles,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", threadId, "messages"] });
      setNewMessage("");
      setTaggedRoles([]);
      toast({ title: "Message posted", description: "Your message has been added to the thread." });
    },
  });

  const pinMessage = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const res = await fetch(`/api/messages/${id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", threadId, "messages"] });
    },
  });

  const messages: ThreadMessage[] = messagesData?.messages || [];
  const pinnedMessages = messages.filter(m => m.pinned);
  const regularMessages = messages.filter(m => !m.pinned);

  const handleSend = () => {
    if (!newMessage.trim() && messageType !== "photo") return;
    createMessage.mutate({ type: messageType, text: newMessage, taggedRoles });
  };

  const getMessageTypeInfo = (type: string) => {
    return MESSAGE_TYPES.find(t => t.value === type) || MESSAGE_TYPES[0];
  };

  const toggleRole = (role: string) => {
    setTaggedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-600"
            data-testid="input-search-messages"
          />
        </div>
        <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? null : v)}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600" data-testid="select-filter-type">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MESSAGE_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pinnedMessages.length > 0 && (
        <div className="mb-4 p-3 bg-[#FF8000]/20 border border-[#FF8000]/30 rounded-lg">
          <div className="flex items-center gap-2 text-[#FF8000] text-sm font-medium mb-2">
            <Pin className="w-4 h-4" />
            Pinned Messages
          </div>
          {pinnedMessages.map(msg => (
            <MessageCard key={msg.id} message={msg} onPin={pinMessage.mutate} getTypeInfo={getMessageTypeInfo} />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {isLoading ? (
          <div className="text-center text-slate-400 py-8">Loading messages...</div>
        ) : regularMessages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">No messages yet. Start the conversation!</div>
        ) : (
          regularMessages.map(msg => (
            <MessageCard key={msg.id} message={msg} onPin={pinMessage.mutate} getTypeInfo={getMessageTypeInfo} />
          ))
        )}
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Select value={messageType} onValueChange={setMessageType}>
            <SelectTrigger className="w-44 bg-slate-800/50 border-slate-600" data-testid="select-message-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {ROLES.map(role => (
              <Button
                key={role.value}
                variant={taggedRoles.includes(role.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleRole(role.value)}
                className={taggedRoles.includes(role.value) ? "bg-[#0078D4] text-white" : "border-slate-600 text-slate-400"}
                data-testid={`btn-tag-${role.value}`}
              >
                {role.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="bg-slate-800/50 border-slate-600 min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            data-testid="input-new-message"
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || createMessage.isPending}
            className="bg-[#0078D4] hover:bg-[#0078D4] text-white px-6"
            data-testid="btn-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageCard({ 
  message, 
  onPin, 
  getTypeInfo 
}: { 
  message: ThreadMessage; 
  onPin: (data: { id: string; pinned: boolean }) => void;
  getTypeInfo: (type: string) => typeof MESSAGE_TYPES[0];
}) {
  const typeInfo = getTypeInfo(message.type);
  const Icon = typeInfo.icon;

  return (
    <div className={`p-3 rounded-lg bg-slate-800/50 border border-slate-700 ${message.pinned ? 'border-[#FF8000]/50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={typeInfo.color}>
              <Icon className="w-3 h-3 mr-1" />
              {typeInfo.label}
            </Badge>
            <span className="text-sm font-medium text-white">{message.authorName}</span>
            <span className="text-xs text-slate-400">
              {new Date(message.createdAt).toLocaleString()}
            </span>
            {message.taggedRoles && message.taggedRoles.length > 0 && (
              <div className="flex gap-1">
                {message.taggedRoles.map(role => (
                  <Badge key={role} variant="outline" className="text-xs border-[#0078D4]/50 text-[#0078D4]">
                    @{role}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <p className="text-slate-200 whitespace-pre-wrap">{message.text}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPin({ id: message.id, pinned: !message.pinned })}
          className={message.pinned ? "text-[#FF8000]" : "text-slate-500 hover:text-[#FF8000]"}
          data-testid={`btn-pin-${message.id}`}
        >
          <Pin className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function WorkOrdersTab({ accountId }: { accountId: string }) {
  const { data: jobsData } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      return res.json();
    },
  });

  const jobs = jobsData?.jobs?.filter((j: any) => String(j.customerId) === accountId) || [];

  return (
    <div className="space-y-3">
      {jobs.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No work orders for this account.</div>
      ) : (
        jobs.map((job: any) => (
          <Card key={job.jobId} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">{job.title}</h4>
                  <p className="text-sm text-slate-400">{job.technicianName || "Unassigned"}</p>
                </div>
                <div className="text-right">
                  <Badge className={job.isCompleted ? "bg-[#22D69A]/20 text-green-300" : "bg-[#FF8000]/20 text-[#FF8000]"}>
                    {job.isCompleted ? "Complete" : job.status || "Pending"}
                  </Badge>
                  <p className="text-sm text-[#0078D4] mt-1">${(job.price || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function PhotosTab({ threadId }: { threadId: string }) {
  const { data: messagesData } = useQuery({
    queryKey: ["/api/threads", threadId, "messages", "photo"],
    queryFn: async () => {
      const res = await fetch(`/api/threads/${threadId}/messages?type=photo`);
      return res.json();
    },
    enabled: !!threadId,
  });

  const photoMessages = messagesData?.messages || [];

  return (
    <div className="space-y-3">
      {photoMessages.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No photos for this account yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photoMessages.map((msg: ThreadMessage) => (
            <Card key={msg.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3">
                <p className="text-sm text-slate-300">{msg.text}</p>
                <p className="text-xs text-slate-500 mt-2">{new Date(msg.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesTab({ threadId }: { threadId: string }) {
  const { data: messagesData } = useQuery({
    queryKey: ["/api/threads", threadId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/threads/${threadId}/messages`);
      return res.json();
    },
    enabled: !!threadId,
  });

  const allMessages = messagesData?.messages || [];
  const issueMessages = allMessages.filter((m: ThreadMessage) => 
    m.type === "issue" || m.type === "chemical" || m.type === "repair"
  );

  return (
    <div className="space-y-3">
      {issueMessages.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No issues or notes recorded.</div>
      ) : (
        issueMessages.map((msg: ThreadMessage) => {
          const typeInfo = MESSAGE_TYPES.find(t => t.value === msg.type) || MESSAGE_TYPES[0];
          const Icon = typeInfo.icon;
          return (
            <Card key={msg.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={typeInfo.color}>
                    <Icon className="w-3 h-3 mr-1" />
                    {typeInfo.label}
                  </Badge>
                  <span className="text-xs text-slate-400">{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-200">{msg.text}</p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

export default function AccountDetails() {
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId || "";
  
  const { data: customersData } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      return res.json();
    },
  });

  const customer = customersData?.customers?.find((c: any) => String(c.id) === accountId);
  const accountName = customer?.name || `Account ${accountId}`;

  const { data: threadData } = useQuery({
    queryKey: ["/api/accounts", accountId, "thread"],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/thread?accountName=${encodeURIComponent(accountName)}`);
      return res.json();
    },
    enabled: !!accountId,
  });

  const thread = threadData?.thread;

  return (
    <AppLayout>
      <div className="p-6 h-full flex flex-col">
        <div className="mb-4">
          <Link href="/jobs">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
        </div>

        <Card className="flex-1 bg-slate-900/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0078D4]/20 flex items-center justify-center">
                <Building className="w-6 h-6 text-[#0078D4]" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">{accountName}</CardTitle>
                <p className="text-sm text-slate-400">{customer?.address || "No address"}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <Tabs defaultValue="thread" className="h-full flex flex-col">
              <TabsList className="bg-slate-800/50 border border-slate-700 mb-4">
                <TabsTrigger value="thread" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white" data-testid="tab-thread">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Thread
                </TabsTrigger>
                <TabsTrigger value="workorders" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white" data-testid="tab-workorders">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Work Orders
                </TabsTrigger>
                <TabsTrigger value="photos" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white" data-testid="tab-photos">
                  <Camera className="w-4 h-4 mr-2" />
                  Photos
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-[#0078D4] data-[state=active]:text-white" data-testid="tab-notes">
                  <FileText className="w-4 h-4 mr-2" />
                  Notes
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent value="thread" className="h-full m-0">
                  {thread ? (
                    <ThreadPanel threadId={thread.id} accountName={accountName} />
                  ) : (
                    <div className="text-center text-slate-400 py-8">Loading thread...</div>
                  )}
                </TabsContent>
                <TabsContent value="workorders" className="h-full m-0 overflow-y-auto">
                  <WorkOrdersTab accountId={accountId} />
                </TabsContent>
                <TabsContent value="photos" className="h-full m-0 overflow-y-auto">
                  {thread && <PhotosTab threadId={thread.id} />}
                </TabsContent>
                <TabsContent value="notes" className="h-full m-0 overflow-y-auto">
                  {thread && <NotesTab threadId={thread.id} />}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
