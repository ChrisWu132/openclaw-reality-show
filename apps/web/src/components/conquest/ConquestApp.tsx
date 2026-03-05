import { useConquestStore } from "../../stores/conquestStore";
import { ConquestLobby } from "./ConquestLobby";
import { ConquestGameView } from "./ConquestGameView";
import { ConquestResults } from "./ConquestResults";

export function ConquestApp() {
  const phase = useConquestStore((s) => s.phase);

  switch (phase) {
    case "lobby":
      return <ConquestLobby />;
    case "watching":
      return <ConquestGameView />;
    case "finished":
      return <ConquestResults />;
    default:
      return <ConquestLobby />;
  }
}
