import { Application } from "pixi.js";
import { CANVAS, COLORS } from "./constants";

export async function createPixiApp(container: HTMLElement): Promise<Application> {
  const app = new Application();

  await app.init({
    width: CANVAS.width,
    height: CANVAS.height,
    background: COLORS.background,
    antialias: false,
    resolution: 1,
  });

  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.imageRendering = "pixelated";
  canvas.style.width = `${CANVAS.width}px`;
  canvas.style.height = `${CANVAS.height}px`;

  container.appendChild(canvas);
  return app;
}
