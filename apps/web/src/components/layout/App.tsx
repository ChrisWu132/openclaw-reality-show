import { useGameStore } from "../../stores/gameStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useBackgroundMusic } from "../../hooks/useBackgroundMusic";
import { useNarration } from "../../hooks/useNarration";
import { IntroScreen } from "../ui/IntroScreen";
import { ScenarioPicker } from "../ui/ScenarioPicker";
import { LoadingScreen } from "../ui/LoadingScreen";
import { GameContainer } from "./GameContainer";
import { ConsequenceScene } from "../ui/ConsequenceScene";
import { ErrorOverlay } from "../ui/ErrorOverlay";
import { MuteButton } from "../ui/MuteButton";

export function App() {
  const phase = useGameStore((s) => s.phase);
  const wsUrl = useGameStore((s) => s.wsUrl);

  // Connect WebSocket at App level so it's active during "connecting" phase
  useWebSocket(wsUrl);

  // Background music — starts on first click, persists mute preference
  const { isMuted, toggleMute, triggerStart } = useBackgroundMusic();

  // Voice narration — plays TTS audio for each scene event, respects same mute toggle
  useNarration(isMuted);

  let content;
  switch (phase) {
    case "intro":
      content = <IntroScreen onFirstInteraction={triggerStart} />;
      break;
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
      content = (
        <>
          <GameContainer />
          <ConsequenceScene />
        </>
      );
      break;
    default:
      content = <IntroScreen />;
  }

  return (
    <>
      {content}
      <ErrorOverlay />
      <MuteButton isMuted={isMuted} onToggle={toggleMute} />
    </>
  );
}
