/**
 * Visual E2E test for the AI Startup Arena flow.
 * Takes screenshots at every key interaction point.
 *
 * Usage:
 *   1. Start the app: npm run dev
 *   2. Run: node test-startup-visual.mjs
 *
 * Output: screenshots/startup/01-login.png, 02-mode-select.png, ...
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ITERATION = process.argv[2] || "1";
const SCREENSHOTS_DIR = path.resolve(`screenshots/startup-v${ITERATION}`);
if (fs.existsSync(SCREENSHOTS_DIR)) fs.rmSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const API_URL = "http://localhost:3001";

let shotIndex = 0;
async function snap(page, label) {
  shotIndex++;
  const name = `${String(shotIndex).padStart(2, "0")}-${label}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, name);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  [snap] ${name}`);
  return filePath;
}

async function waitAndSnap(page, label, ms = 1000) {
  await page.waitForTimeout(ms);
  return snap(page, label);
}

async function registerTestUser() {
  const email = `startup-test-${Date.now()}@visual-test.local`;
  const password = "testpass123";
  const displayName = "Startup Tester";

  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });

  if (!res.ok) {
    // Try login if already registered
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "startup-test@visual-test.local", password: "testpass123" }),
    });
    if (!loginRes.ok) throw new Error("Could not register or login test user");
    return loginRes.json();
  }
  return res.json();
}

async function main() {
  console.log(`\n===================================`);
  console.log(`  STARTUP VISUAL TEST — Iteration ${ITERATION}`);
  console.log(`===================================\n`);

  // Health check
  try {
    await fetch(`${API_URL}/api/health`);
    console.log("[ok] Server is running\n");
  } catch {
    console.error("[fail] Server not running at", API_URL);
    console.error("  Run: npm run dev");
    process.exit(1);
  }

  // Register/login test user to get a JWT
  console.log("[0] Registering test user...");
  const auth = await registerTestUser();
  console.log(`  Token: ${auth.token.slice(0, 20)}...`);

  const browser = await chromium.launch({ headless: false });
  const videosDir = path.join(SCREENSHOTS_DIR, "videos");
  fs.mkdirSync(videosDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: videosDir,
      size: { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();

  // Auto-dismiss alert dialogs (from failed API calls, etc.)
  page.on("dialog", (dialog) => {
    console.log(`  [dialog] ${dialog.type()}: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`  [console.error] ${msg.text()}`);
  });
  page.on("pageerror", (err) => console.log(`  [pageerror] ${err.message}`));

  try {
    // ===========================
    // PART 0: LOGIN
    // ===========================
    console.log("--- PART 0: Login ---\n");

    await page.goto(WEB_URL, { waitUntil: "networkidle" });
    await waitAndSnap(page, "login-screen", 1000);

    // Inject the auth token into localStorage to bypass login form
    await page.evaluate((token) => {
      localStorage.setItem("openclaw_token", token);
    }, auth.token);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await snap(page, "after-login");

    // ===========================
    // PART 1: INTRO & MODE SELECT
    // ===========================
    console.log("--- PART 1: Intro & Mode Selection ---\n");

    console.log("[1] Waiting for intro animation (8s)...");
    await waitAndSnap(page, "intro", 8000);

    // Click "ENTER THE ARENA"
    console.log("[2] Clicking ENTER THE ARENA...");
    const enterBtn = page.locator("button:visible").filter({ hasText: /ENTER THE ARENA/i });
    if (await enterBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterBtn.first().click();
    } else {
      console.log("  (ENTER button not found, clicking first visible button)");
      const buttons = page.locator("button:visible");
      if (await buttons.count() > 0) await buttons.first().click();
    }
    await waitAndSnap(page, "mode-select", 1500);

    // ===========================
    // PART 2: STARTUP LOBBY
    // ===========================
    console.log("\n--- PART 2: Startup Lobby ---\n");

    console.log("[3] Selecting AI Startup Arena...");
    // Use a more specific selector — the mode select card button, not the title text
    const startupBtn = page.locator("button:visible").filter({ hasText: /STARTUP ARENA/i });
    if (await startupBtn.first().isVisible().catch(() => false)) {
      await startupBtn.first().click();
      await waitAndSnap(page, "startup-lobby", 1000);
    } else {
      console.log("  (Startup button not found, snapping current state)");
      await snap(page, "startup-lobby-fallback");
    }

    // ===========================
    // PART 3: LAUNCH GAME
    // ===========================
    console.log("\n--- PART 3: Launch Game ---\n");

    console.log("[4] Clicking LAUNCH ARENA...");
    await snap(page, "startup-lobby-ready");
    // Scroll to bottom to make LAUNCH visible, then click it
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    try {
      await page.getByRole("button", { name: "LAUNCH ARENA" }).click({ timeout: 3000 });
      console.log("  Clicked LAUNCH ARENA via getByRole");
    } catch {
      console.log("  getByRole failed, trying text selector...");
      await page.click("text=LAUNCH ARENA", { timeout: 3000 }).catch(() => {
        console.log("  text selector also failed");
      });
    }
    await page.waitForTimeout(6000);
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log("  [debug] body after LAUNCH:", bodyText.replace(/\n/g, " | ").slice(0, 300));
    await snap(page, "intro-page");

    // ===========================
    // PART 3.5: INTRO PAGE -> BEGIN
    // ===========================
    console.log("\n--- PART 3.5: Intro Page ---\n");

    console.log("[4b] Clicking BEGIN...");
    const beginBtn = page.locator("button:visible").filter({ hasText: /BEGIN/i });
    if (await beginBtn.first().isVisible().catch(() => false)) {
      await beginBtn.first().click();
      await waitAndSnap(page, "game-initial", 5000);
    } else {
      console.log("  (BEGIN button not found, snapping current state)");
      await snap(page, "game-initial-fallback");
    }

    // ===========================
    // PART 4: WATCH GAME (click-gated)
    // ===========================
    console.log("\n--- PART 4: Watching Game (click to advance) ---\n");

    // Click through events, taking snapshots at intervals
    const captureLabels = ["game-q1", "game-q2", "game-q3", "game-q4", "game-q5"];

    for (const label of captureLabels) {
      // Click through several events before snapping
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(2000);
        await page.click("body");
      }
      console.log(`  Snapping ${label}...`);
      await snap(page, label);
    }

    // Late game / results — keep clicking
    console.log("[5] Clicking through to late game / results...");
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1500);
      await page.click("body");
    }
    await snap(page, "game-late");

    // Keep clicking until finished or timeout
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1500);
      await page.click("body");
      // Check if we hit results
      const resultsVisible = await page.locator("text=FINAL STANDINGS").isVisible().catch(() => false);
      if (resultsVisible) break;
    }
    await waitAndSnap(page, "game-results", 2000);

    // ===========================
    // SUMMARY
    // ===========================
    console.log(`\n===================================`);
    console.log(`  DONE — ${shotIndex} screenshots saved`);
    console.log(`  Location: ${SCREENSHOTS_DIR}`);
    console.log(`===================================\n`);

  } catch (err) {
    console.error("\n[fail] Test failed:", err.message);
    await snap(page, "ERROR-final-state");
  } finally {
    const video = page.video();
    if (video) {
      const videoPath = await video.path();
      console.log(`\n  Video: ${videoPath}`);
    }
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
