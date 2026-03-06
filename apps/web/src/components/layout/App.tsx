import { useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";
import { useAuthStore } from "../../stores/authStore";
import { useSSE } from "../../hooks/useSSE";
import { LoginScreen } from "../ui/LoginScreen";
import { IntroScreen } from "../ui/IntroScreen";
import { ModeSelector } from "../ui/ModeSelector";
import { AgentPicker } from "../ui/AgentPicker";
import { LoadingScreen } from "../ui/LoadingScreen";
import { GameContainer } from "./GameContainer";
import { MoralProfileCard } from "../ui/MoralProfileCard";
import { StartupApp } from "../startup/StartupApp";
import { ErrorOverlay } from "../ui/ErrorOverlay";

export function App() {
  const phase = useGameStore((s) => s.phase);
  const sseUrl = useGameStore((s) => s.sseUrl);

  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useSSE(sseUrl);

  // Restore auth session on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Show loading spinner during auth restore
  if (authLoading && !user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#707080" }}>
        ...
      </div>
    );
  }

  // Auth gate — show login if no user
  if (!user) {
    return <LoginScreen />;
  }

  let content;
  switch (phase) {
    case "intro":
      content = <IntroScreen />;
      break;
    case "mode-select":
      content = <ModeSelector />;
      break;
    case "agent-select":
      content = <AgentPicker />;
      break;
    case "connecting":
      content = <LoadingScreen />;
      break;
    case "playing":
      content = <GameContainer />;
      break;
    case "profile":
      content = <MoralProfileCard />;
      break;
    case "startup":
      content = <StartupApp />;
      break;
    default:
      content = <IntroScreen />;
  }

  return (
    <>
      {content}
      <ErrorOverlay />
    </>
  );
}
