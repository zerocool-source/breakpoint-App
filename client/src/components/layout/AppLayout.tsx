import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import bgVideo from "@assets/Lets_just_give_202512071620_1765153241061.mp4";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary selection:text-background">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen relative overflow-hidden">
        {/* Background Video & Overlay */}
        <video
          className="absolute inset-0 z-0 w-full h-full object-cover pointer-events-none opacity-60"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 z-0 bg-background/60 backdrop-blur-[2px] pointer-events-none" />
        
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