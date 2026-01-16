import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function Chat() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch chat history
  const { data: history = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/history"],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage, saveHistory: true }),
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ 
            error: "Failed to connect to ace-breakpoint-app", 
            errorCode: response.status === 503 ? "PROXY_OFFLINE" : "UNKNOWN" 
          }));
          const errorWithCode = new Error(error.error || "Failed to send message") as any;
          errorWithCode.errorCode = error.errorCode;
          errorWithCode.status = response.status;
          throw errorWithCode;
        }
        
        return response.json();
      } catch (error: any) {
        // Handle network-level errors (fetch throws TypeError before response)
        if (error.name === "TypeError" && !error.errorCode) {
          const networkError = new Error("ace-breakpoint-app is not reachable") as any;
          networkError.errorCode = "PROXY_OFFLINE";
          networkError.status = 503;
          throw networkError;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      setMessage("");
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      const errorCode = error.errorCode || "";
      let errorTitle = "Connection Error";
      let errorDescription = error.message;
      
      if (errorCode === "PROXY_OFFLINE") {
        errorTitle = "Proxy Offline";
        errorDescription = "Start ace-breakpoint-app on your Mac to chat with Ace.";
      } else if (errorCode === "NOT_CONFIGURED") {
        errorTitle = "Configuration Error";
        errorDescription = "ACE_APP_URL needs to be configured in environment variables.";
      } else if (errorCode === "OLLAMA_ERROR") {
        errorTitle = "Ollama Error";
        errorDescription = "Check if Ollama is running on your Mac.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/chat/history", {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to clear history");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      toast({
        title: "History Cleared",
        description: "Chat history has been cleared successfully.",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    sendMessageMutation.mutate(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      {/* Hex Grid Background */}
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, transparent 0%, rgba(6, 182, 212, 0.05) 50%, transparent 100%),
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(6, 182, 212, 0.03) 50px, rgba(6, 182, 212, 0.03) 52px),
            repeating-linear-gradient(60deg, transparent, transparent 50px, rgba(168, 85, 247, 0.03) 50px, rgba(168, 85, 247, 0.03) 52px),
            repeating-linear-gradient(-60deg, transparent, transparent 50px, rgba(6, 182, 212, 0.03) 50px, rgba(6, 182, 212, 0.03) 52px)
          `,
          backgroundSize: '100% 100%, 86.6px 50px, 86.6px 50px, 86.6px 50px',
          backgroundPosition: '0 0, 0 0, 43.3px 25px, 43.3px 25px'
        }}
      />

      {/* Gradient Orbs */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-[#17BEBB]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-[#17BEBB]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#17BEBB] to-[#17BEBB] bg-clip-text text-transparent" style={{ fontFamily: "Orbitron, sans-serif" }}>
            ACE AI ASSISTANT
          </h1>
          <p className="text-[#17BEBB]/70" style={{ fontFamily: "Rajdhani, sans-serif" }}>
            Your local pool chemistry and compliance expert
          </p>
        </div>

        {/* Chat Container */}
        <Card className="border-[#17BEBB]/30 bg-black/40 backdrop-blur-md shadow-lg shadow-#17BEBB/10">
          <CardHeader className="border-b border-[#17BEBB]/20 flex flex-row items-center justify-between">
            <CardTitle className="text-[#17BEBB] flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <MessageSquare className="w-5 h-5" />
              CHAT INTERFACE
            </CardTitle>
            <Button
              onClick={() => clearHistoryMutation.mutate()}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              data-testid="button-clear-history"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages Area */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4" data-testid="chat-messages-container">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-[#17BEBB]" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-center">
                  <MessageSquare className="w-16 h-16 text-[#17BEBB]/30 mb-4" />
                  <p className="text-[#17BEBB]/50 text-lg" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                    Start a conversation with Ace
                  </p>
                  <p className="text-[#17BEBB]/30 text-sm mt-2">
                    Ask about pool chemistry, Title 22, QC, or PoolBrain
                  </p>
                </div>
              ) : (
                history.slice().reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-[#17BEBB]/20 to-[#17BEBB]/20 border border-[#17BEBB]/30 text-white"
                          : "bg-gradient-to-br from-[#17BEBB]/10 to-[#17BEBB]/10 border border-[#17BEBB]/30 text-[#17BEBB]1A"
                      }`}
                    >
                      <div className="text-xs opacity-60 mb-1" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                        {msg.role === "user" ? "YOU" : "ACE"}
                      </div>
                      <div className="whitespace-pre-wrap" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                        {msg.content}
                      </div>
                      <div className="text-xs opacity-40 mt-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isSubmitting && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-4 bg-gradient-to-br from-[#17BEBB]/10 to-[#17BEBB]/10 border border-[#17BEBB]/30">
                    <div className="text-xs opacity-60 mb-1" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                      ACE
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#17BEBB]" />
                      <span className="text-[#17BEBB]/70">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-[#17BEBB]/20 p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Ace about pool chemistry, Title 22, QC, or PoolBrain..."
                  className="flex-1 min-h-[60px] max-h-[200px] bg-black/50 border-[#17BEBB]/30 focus:border-[#17BEBB] text-white placeholder:text-[#17BEBB]/30 resize-none"
                  style={{ fontFamily: "Rajdhani, sans-serif" }}
                  disabled={isSubmitting}
                  data-testid="input-chat-message"
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || isSubmitting}
                  className="bg-gradient-to-r from-[#17BEBB] to-[#17BEBB] hover:from-[#17BEBB] hover:to-purple-400 text-white self-end"
                  data-testid="button-send-message"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
              <p className="text-xs text-[#17BEBB]/40 mt-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[#17BEBB]/50" style={{ fontFamily: "Rajdhani, sans-serif" }}>
            Connected to local Ace model via ace-breakpoint-app
          </p>
        </div>
      </div>
    </div>
  );
}
