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

export function GameContainer() {
  const sprites = getSpritesMap();
  const app = getPixiApp();
  useSceneProcessor(sprites, app);

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
      </div>
      {/* Inline monologue panel — shown below the scene when reasoning is available */}
      <div style={{ width: "960px" }}>
        <MonologuePanel />
      </div>
    </div>
  );
}
