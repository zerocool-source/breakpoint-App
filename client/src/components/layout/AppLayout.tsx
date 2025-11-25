import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary selection:text-background">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen relative overflow-hidden">
        {/* Background ambient effects */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <Header />
        <main className="flex-1 p-8 relative z-10 overflow-y-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}