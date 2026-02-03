import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PaymentNotifications } from "../PaymentNotifications";
import { AiSystemMonitor } from "../AiSystemMonitor";
import { AiContextHelper } from "../AiContextHelper";
import { AiWidgetsProvider } from "@/contexts/AiWidgetsContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AiWidgetsProvider>
      <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex font-sans">
        <Sidebar />
        <div className="flex-1 ml-[68px] flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-4 overflow-y-auto scrollbar-thin">
            <div className="w-full space-y-4 animate-fade-in">
              {children}
            </div>
          </main>
        </div>
        <PaymentNotifications />
        <AiSystemMonitor />
        <AiContextHelper />
      </div>
    </AiWidgetsProvider>
  );
}
