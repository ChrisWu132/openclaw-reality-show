import { useStartupStore } from "../../stores/startupStore";
import { StartupLobby } from "./StartupLobby";
import { StartupGameView } from "./StartupGameView";
import { StartupResults } from "./StartupResults";

export function StartupApp() {
  const phase = useStartupStore((s) => s.phase);

  switch (phase) {
    case "lobby":
      return <StartupLobby />;
    case "watching":
      return <StartupGameView />;
    case "finished":
      return <StartupResults />;
    default:
      return <StartupLobby />;
  }
}
