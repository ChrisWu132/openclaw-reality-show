import React, { useEffect, useState, useCallback } from "react";
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

const BASE_W = 960;
const BASE_H = 540;

export function GameContainer() {
  const sprites = getSpritesMap();
  const app = getPixiApp();
  useSceneProcessor(sprites, app);

  const phase = useGameStore((s) => s.phase);
  const waitingForClick = useGameStore((s) => s.waitingForClick);
  const advanceDialogue = useGameStore((s) => s.advanceDialogue);
  const isConsequence = phase === "consequence";

  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const scaleX = window.innerWidth / BASE_W;
    const scaleY = window.innerHeight / BASE_H;
    setScale(Math.min(scaleX, scaleY));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        background: COLORS.bgPrimary,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: `${BASE_W}px`,
          height: `${BASE_H}px`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <div
          style={{
            filter: isConsequence ? "grayscale(60%) brightness(0.3)" : "none",
            transition: "filter 3s ease-out",
            width: "100%",
            height: "100%",
          }}
        >
          <SceneCanvas />
        </div>
        {!isConsequence && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
