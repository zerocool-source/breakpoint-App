import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex font-sans">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
