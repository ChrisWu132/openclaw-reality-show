import { useGameStore } from "../../stores/gameStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { IntroScreen } from "../ui/IntroScreen";
import { AgentPicker } from "../ui/AgentPicker";
import { LoadingScreen } from "../ui/LoadingScreen";
import { GameContainer } from "./GameContainer";
import { MoralProfileCard } from "../ui/MoralProfileCard";
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
