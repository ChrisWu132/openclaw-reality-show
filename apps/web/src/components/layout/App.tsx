import { useGameStore } from "../../stores/gameStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { ScenarioPicker } from "../ui/ScenarioPicker";
import { LoadingScreen } from "../ui/LoadingScreen";
import { GameContainer } from "./GameContainer";
import { ConsequenceScene } from "../ui/ConsequenceScene";
import { ErrorOverlay } from "../ui/ErrorOverlay";

export function App() {
  const phase = useGameStore((s) => s.phase);
  const wsUrl = useGameStore((s) => s.wsUrl);

  // Connect WebSocket at App level so it's active during "connecting" phase
  useWebSocket(wsUrl);

  let content;
  switch (phase) {
    case "picker":
      content = <ScenarioPicker />;
      break;
    case "connecting":
      content = <LoadingScreen />;
      break;
    case "playing":
      content = <GameContainer />;
      break;
    case "consequence":
      content = <ConsequenceScene />;
      break;
    default:
      content = <ScenarioPicker />;
  }

  return (
    <>
      {content}
      <ErrorOverlay />
    </>
  );
}
