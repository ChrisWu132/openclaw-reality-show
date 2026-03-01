import React from "react";
import { COLORS } from "../../styles/theme";
import { useSceneProcessor } from "../../hooks/useSceneProcessor";
import { SceneCanvas, getSpritesMap, getPixiApp } from "../scene/SceneCanvas";
import { ZoneLabel } from "../scene/ZoneLabel";
import { DialogueOverlay } from "../scene/DialogueOverlay";
import { SessionStatus } from "../ui/SessionStatus";
import { IncidentPanel } from "../ui/IncidentPanel";
import { AIDecidingOverlay } from "../ui/AIDecidingOverlay";
import { SituationCard } from "../ui/SituationCard";
import { MonologuePanel } from "../ui/MonologueViewer";
import { useGameStore } from "../../stores/gameStore";

export function GameContainer() {
  const sprites = getSpritesMap();
  const app = getPixiApp();
  useSceneProcessor(sprites, app);

  const waitingForClick = useGameStore((s) => s.waitingForClick);
  const advanceDialogue = useGameStore((s) => s.advanceDialogue);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: COLORS.bgPrimary,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "960px",
          height: "540px",
        }}
      >
        <SceneCanvas />
        <ZoneLabel />
        <SessionStatus />
        <DialogueOverlay />
        <AIDecidingOverlay />
        <IncidentPanel />
        <SituationCard />
        <MonologuePanel />
        {/* Transparent click overlay — advances dialogue on click */}
        <div
          onClick={() => {
            if (waitingForClick) {
              advanceDialogue();
            }
          }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 25,
            cursor: waitingForClick ? "pointer" : "default",
            pointerEvents: waitingForClick ? "auto" : "none",
          }}
        />
      </div>
    </div>
  );
}
