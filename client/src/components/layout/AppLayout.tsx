import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30 selection:text-foreground">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen relative overflow-hidden">
        <Header />
        <main className="flex-1 p-6 relative z-10 overflow-y-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}