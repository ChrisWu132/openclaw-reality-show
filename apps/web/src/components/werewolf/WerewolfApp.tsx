import { useWerewolfStore } from "../../stores/werewolfStore";
import { WerewolfLobby } from "./WerewolfLobby";
import { WerewolfGameView } from "./WerewolfGameView";
import { WerewolfResults } from "./WerewolfResults";

export function WerewolfApp() {
  const phase = useWerewolfStore((s) => s.phase);

  switch (phase) {
    case "lobby":
      return <WerewolfLobby />;
    case "watching":
      return <WerewolfGameView />;
    case "finished":
      return <WerewolfResults />;
    default:
      return <WerewolfLobby />;
  }
}
