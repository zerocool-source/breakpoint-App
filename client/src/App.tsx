import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IntroVideo } from "@/components/IntroVideo";
import { LoadingScreen } from "@/components/LoadingScreen";
import Dashboard from "@/pages/Dashboard";
import Intelligence from "@/pages/Intelligence";
import Automations from "@/pages/Automations";
import Settings from "@/pages/Settings";
import Chat from "@/pages/Chat";
import Repairs from "@/pages/Repairs";
import Chemicals from "@/pages/Chemicals";
import Jobs from "@/pages/Jobs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/repairs" component={Repairs} />
      <Route path="/chemicals" component={Chemicals} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/intelligence" component={Intelligence} />
      <Route path="/automations" component={Automations} />
      <Route path="/chat" component={Chat} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

type AppStage = "intro" | "loading" | "ready";

function App() {
  const [stage, setStage] = useState<AppStage>("intro");

  if (stage === "intro") {
    return <IntroVideo onComplete={() => setStage("loading")} />;
  }

  if (stage === "loading") {
    return <LoadingScreen onLoadingComplete={() => setStage("ready")} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
