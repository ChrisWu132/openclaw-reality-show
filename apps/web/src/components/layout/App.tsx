import { useGameStore } from "../../stores/gameStore";
import { useWebSocket } from "../../hooks/useWebSocket";
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
  const wsUrl = useGameStore((s) => s.wsUrl);

  useWebSocket(wsUrl);

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
