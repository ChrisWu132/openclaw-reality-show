/**
 * Visual E2E test for the AI Werewolf game flow.
 * Takes screenshots at every key interaction point.
 *
 * Usage:
 *   1. Start the app: npm run dev
 *   2. Run: node test-werewolf-visual.mjs
 *
 * Output: screenshots/werewolf-v{iteration}/01-login.png, ...
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ITERATION = process.argv[2] || "1";
const SCREENSHOTS_DIR = path.resolve(`screenshots/werewolf-v${ITERATION}`);
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
  const email = `werewolf-test-${Date.now()}@visual-test.local`;
  const password = "testpass123";
  const displayName = "Werewolf Tester";

  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });

  if (!res.ok) {
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "werewolf-test@visual-test.local", password: "testpass123" }),
    });
    if (!loginRes.ok) throw new Error("Could not register or login test user");
    return loginRes.json();
  }
  return res.json();
}

async function main() {
  console.log(`\n===================================`);
  console.log(`  WEREWOLF VISUAL TEST — Iteration ${ITERATION}`);
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
    deviceScaleFactor: 1,
    recordVideo: {
      dir: videosDir,
      size: { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();

  // Auto-dismiss alert dialogs
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

    // Inject auth token to bypass login form
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
    // PART 2: WEREWOLF LOBBY
    // ===========================
    console.log("\n--- PART 2: Werewolf Lobby ---\n");

    console.log("[3] Selecting AI Werewolf...");
    const werewolfBtn = page.locator("button:visible").filter({ hasText: /WEREWOLF/i });
    if (await werewolfBtn.first().isVisible().catch(() => false)) {
      await werewolfBtn.first().click();
      await waitAndSnap(page, "werewolf-lobby", 1500);
    } else {
      console.log("  (Werewolf button not found, snapping current state)");
      await snap(page, "werewolf-lobby-fallback");
    }

    // Capture the lobby with agent configuration
    await snap(page, "werewolf-lobby-agents");

    // Scroll down to see all agents + BEGIN button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await waitAndSnap(page, "werewolf-lobby-bottom", 500);

    // ===========================
    // PART 3: START GAME
    // ===========================
    console.log("\n--- PART 3: Start Game ---\n");

    console.log("[4] Clicking BEGIN THE NIGHT...");
    try {
      await page.getByRole("button", { name: /BEGIN THE NIGHT/i }).click({ timeout: 3000 });
      console.log("  Clicked BEGIN THE NIGHT via getByRole");
    } catch {
      console.log("  getByRole failed, trying text selector...");
      await page.click("text=BEGIN THE NIGHT", { timeout: 3000 }).catch(() => {
        console.log("  text selector also failed, trying any button with BEGIN");
        return page.locator("button:visible").filter({ hasText: /BEGIN/i }).first().click();
      });
    }
    await page.waitForTimeout(3000);
    await snap(page, "game-created");

    // Look for START GAME button (game transitions from lobby → watching)
    console.log("[4b] Looking for START GAME button...");
    const startBtn = page.locator("button:visible").filter({ hasText: /START GAME/i });
    if (await startBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await snap(page, "game-ready-to-start");
      await startBtn.first().click();
      console.log("  Clicked START GAME");
      await waitAndSnap(page, "game-starting", 3000);
    } else {
      console.log("  (No START GAME button, game may have auto-started)");
      await snap(page, "game-auto-started");
    }

    // ===========================
    // PART 4: WATCH GAME — DAWN
    // ===========================
    console.log("\n--- PART 4: Watching Game ---\n");

    // Wait for round content to appear
    try {
      await page.waitForSelector("text=ROUND", { timeout: 15000 });
    } catch {
      console.log("  (ROUND text not found, waiting longer...)");
      await page.waitForTimeout(5000);
    }
    await snap(page, "round1-dawn");

    // Click to advance past dawn
    await page.click("body");
    await page.waitForTimeout(1000);
    await snap(page, "round1-dawn-advanced");

    // ===========================
    // PART 5: DISCUSSION PHASE
    // ===========================
    console.log("\n--- PART 5: Discussion Phase ---\n");

    // Click through several discussion statements, capturing key moments
    for (let i = 1; i <= 6; i++) {
      await page.click("body");
      await page.waitForTimeout(2500); // Wait for typewriter animation
      if (i === 1 || i === 3 || i === 6) {
        await snap(page, `round1-discussion-${i}`);
      }
    }

    // Capture more discussion
    for (let i = 7; i <= 10; i++) {
      await page.click("body");
      await page.waitForTimeout(2000);
    }
    await snap(page, "round1-discussion-end");

    // ===========================
    // PART 6: VOTING PHASE
    // ===========================
    console.log("\n--- PART 6: Voting Phase ---\n");

    // Click through votes
    for (let i = 1; i <= 5; i++) {
      await page.click("body");
      await page.waitForTimeout(2000);
      if (i === 1 || i === 3 || i === 5) {
        await snap(page, `round1-vote-${i}`);
      }
    }

    // Vote result / elimination
    await page.click("body");
    await page.waitForTimeout(1500);
    await snap(page, "round1-vote-result");

    // ===========================
    // PART 7: NIGHT PHASE
    // ===========================
    console.log("\n--- PART 7: Night Phase ---\n");

    await page.click("body");
    await page.waitForTimeout(2000);
    await snap(page, "round1-night");

    // Click to advance past night
    await page.click("body");
    await page.waitForTimeout(2000);

    // ===========================
    // PART 8: ROUND 2+ (compressed)
    // ===========================
    console.log("\n--- PART 8: Round 2+ ---\n");

    // Round 2 dawn
    await page.click("body");
    await page.waitForTimeout(1500);
    await snap(page, "round2-dawn");

    // Click through round 2 discussion + vote (compressed)
    for (let i = 0; i < 15; i++) {
      await page.click("body");
      await page.waitForTimeout(2000);
    }
    await snap(page, "round2-mid");

    // Click through more rounds
    for (let i = 0; i < 20; i++) {
      await page.click("body");
      await page.waitForTimeout(1500);
    }
    await snap(page, "round3-mid");

    // ===========================
    // PART 9: KEEP CLICKING TO GAME END
    // ===========================
    console.log("\n--- PART 9: Playing to Completion ---\n");

    for (let i = 0; i < 80; i++) {
      await page.click("body");
      await page.waitForTimeout(1500);

      // Check for game over / results
      const gameOver = await page.locator("text=GAME OVER").isVisible().catch(() => false);
      if (gameOver) {
        console.log(`  Game over detected at click ${i}`);
        break;
      }

      // Periodic snapshots
      if (i === 20) await snap(page, "mid-game");
      if (i === 40) await snap(page, "late-game");
      if (i === 60) await snap(page, "very-late-game");
    }

    await snap(page, "game-end-state");

    // ===========================
    // PART 10: RESULTS SCREEN
    // ===========================
    console.log("\n--- PART 10: Results ---\n");

    // Wait for narrative to load
    await page.waitForTimeout(5000);
    await snap(page, "results-top");

    // Scroll to see full results
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await snap(page, "results-narrative");

    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(500);
    await snap(page, "results-roles");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await snap(page, "results-bottom");

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
