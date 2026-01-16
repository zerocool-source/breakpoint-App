import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, Terminal, Cpu, Network, Database, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Intelligence() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState("goss-20b");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch chat history
  const { data: messagesData = [], refetch: refetchMessages } = useQuery({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      const res = await fetch("/api/chat/history");
      if (!res.ok) return [];
      const msgs = await res.json();
      return msgs.reverse();
    },
  });

  const messages = messagesData || [];

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      // Add user message
      const userRes = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: text, model }),
      });

      if (!userRes.ok) throw new Error("Failed to save user message");

      // Get AI response
      const aiRes = await fetch("/api/chat/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text, model, conversationContext: messages }),
      });

      if (!aiRes.ok) throw new Error("Failed to get AI response");
      return aiRes.json();
    },
    onSuccess: () => {
      refetchMessages();
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    setInput("");
    setIsLoading(true);
    try {
      await sendMutation.mutateAsync(input);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground hover:text-[#17BEBB]" data-testid="btn-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight flex items-center gap-3">
            <SparkleIcon className="text-secondary w-8 h-8" />
            ACE PRIME
          </h2>
          <div className="flex items-center gap-2 text-muted-foreground font-ui tracking-wide">
             <span>Advanced AI Assistant</span>
             <span>•</span>
             <div className="flex items-center gap-1 text-primary">
               <Sparkles className="w-3 h-3" />
               Running on {model === "goss-20b" ? "Goss 20B" : model === "llama-3" ? "Llama 3" : "GPT-4o"}
             </div>
          </div>
        </div>
        <div className="flex gap-4">
          <StatusBadge icon={Cpu} label="Neural Core" status="Online" color="text-green-400" />
          <StatusBadge icon={Network} label="Pool Brain API" status="Connected" color="text-primary" />
          <StatusBadge icon={Database} label="Vector DB" status="Syncing" color="text-purple-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-240px)]">
        {/* Agent Status / Left Panel */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card border-white/5 h-full">
                <CardHeader>
                    <CardTitle className="font-display text-sm tracking-widest text-muted-foreground">SYSTEM CONFIGURATION</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Model</label>
                        <Select value={model} onValueChange={setModel} disabled={isLoading}>
                            <SelectTrigger className="bg-white/5 border-white/10 font-ui">
                                <SelectValue placeholder="Select Model" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-white/10 text-foreground">
                                <SelectItem value="goss-20b">Goss 20B (Fine-Tuned)</SelectItem>
                                <SelectItem value="llama-3">Llama 3 (70B)</SelectItem>
                                <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                                <SelectItem value="mistral">Mistral Large</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Agents</p>
                        <AgentStatus name="Analyzer Bot" action="Scanning pH Logs" progress={75} />
                        <AgentStatus name="Inventory Bot" action="Idle" progress={0} />
                        <AgentStatus name="Scheduler Bot" action="Optimizing Route" progress={45} />
                        <AgentStatus name="Alert Bot" action="Monitoring Streams" progress={100} pulse />
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Chat Interface / Main Panel */}
        <Card className="lg:col-span-3 glass-card border-white/5 flex flex-col h-full bg-black/20" data-testid="chat-interface">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Start a conversation with Ace Prime...</p>
              </div>
            ) : (
              messages.map((msg: any, idx: number) => (
                <div key={idx} className={cn("flex gap-4 animate-in fade-in slide-in-from-bottom-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role !== "user" && (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      {msg.role === "system" ? <Terminal className="w-5 h-5 text-primary" /> : <Bot className="w-5 h-5 text-secondary" />}
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-2xl font-ui text-sm leading-relaxed",
                    msg.role === "user" ? "bg-primary/10 border border-primary/20 text-white rounded-tr-none" : 
                    msg.role === "system" ? "bg-white/5 border border-white/10 text-mono text-xs font-mono text-muted-foreground" :
                    "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
                  )}>
                    <p>{msg.content}</p>
                    <span className="text-[10px] opacity-50 mt-2 block font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Bot className="w-5 h-5 text-secondary animate-pulse" />
                </div>
                <div className="bg-white/5 border border-white/10 text-gray-200 rounded-2xl rounded-tl-none p-4">
                  <span className="text-sm font-ui">Processing your request...</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-white/10 bg-black/40">
            <div className="flex gap-2">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={`Message ${model === "goss-20b" ? "Ace Prime (Goss 20B)" : "AI Assistant"}...`}
                className="bg-white/5 border-white/10 focus:border-primary/50 text-white font-ui"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button 
                onClick={handleSend} 
                className="bg-primary text-black hover:bg-primary/80 font-bold"
                disabled={isLoading || !input.trim()}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatusBadge({ icon: Icon, label, status, color }: any) {
  return (
    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-full border border-white/5">
      <Icon className={cn("w-4 h-4", color)} />
      <div className="flex flex-col leading-none">
        <span className="text-[10px] text-muted-foreground font-mono uppercase">{label}</span>
        <span className={cn("text-xs font-bold font-ui", color)}>{status}</span>
      </div>
    </div>
  );
}

function AgentStatus({ name, action, progress, pulse }: any) {
    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="flex justify-between items-center mb-2">
                <span className="font-display text-xs text-primary tracking-wide flex items-center gap-2">
                    {pulse && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                    {name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <p className="text-xs text-gray-400 mb-2 font-ui">{action}</p>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
        </div>
    )
}

function SparkleIcon({className}: {className?: string}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15.75a.75.75 0 01.721.544l.178.622a2.25 2.25 0 001.65 1.65l.622.178a.75.75 0 010 1.442l-.622.178a2.25 2.25 0 00-1.65 1.65l-.178.622a.75.75 0 01-1.442 0l-.178-.622a2.25 2.25 0 00-1.65 1.65l-.622-.178a.75.75 0 010-1.442l.622-.178a2.25 2.25 0 001.65-1.65l.178-.622a.75.75 0 01.721-.544z" clipRule="evenodd" />
        </svg>
    )
}
