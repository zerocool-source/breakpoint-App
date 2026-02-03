import { createContext, useContext, useState, ReactNode } from "react";

interface AiWidgetsContextType {
  showMonitor: boolean;
  showHelper: boolean;
  toggleMonitor: () => void;
  toggleHelper: () => void;
  showAll: () => void;
  hideAll: () => void;
}

const AiWidgetsContext = createContext<AiWidgetsContextType | null>(null);

export function useAiWidgets() {
  const context = useContext(AiWidgetsContext);
  if (!context) {
    return {
      showMonitor: true,
      showHelper: true,
      toggleMonitor: () => {},
      toggleHelper: () => {},
      showAll: () => {},
      hideAll: () => {},
    };
  }
  return context;
}

export function AiWidgetsProvider({ children }: { children: ReactNode }) {
  const [showMonitor, setShowMonitor] = useState(true);
  const [showHelper, setShowHelper] = useState(true);

  return (
    <AiWidgetsContext.Provider
      value={{
        showMonitor,
        showHelper,
        toggleMonitor: () => setShowMonitor(!showMonitor),
        toggleHelper: () => setShowHelper(!showHelper),
        showAll: () => {
          setShowMonitor(true);
          setShowHelper(true);
        },
        hideAll: () => {
          setShowMonitor(false);
          setShowHelper(false);
        },
      }}
    >
      {children}
    </AiWidgetsContext.Provider>
  );
}
