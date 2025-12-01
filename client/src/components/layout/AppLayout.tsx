import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import bgImage from "@assets/ChatGPT Image Dec 1, 2025, 10_45_37 AM_1764614772230.png";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary selection:text-background">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen relative overflow-hidden">
        {/* Background Image & Overlay */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.6
          }}
        />
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