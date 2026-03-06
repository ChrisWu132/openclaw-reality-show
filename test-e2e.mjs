/**
 * End-to-end test: create session, connect SSE, verify all 10 rounds flow through.
 * Run: node test-e2e.mjs
 */
import { EventSource } from "eventsource";

const API = "http://localhost:3001";
const TIMEOUT_MS = 300_000; // 5 min total timeout

async function main() {
  console.log("=== E2E Test: Trolley Problem Full Flow ===\n");

  // 1. Health check
  console.log("[1] Health check...");
  const health = await fetch(`${API}/api/health`).then((r) => r.json());
  console.log("    OK:", JSON.stringify(health));

  // 2. Create session
  console.log("\n[2] Creating session...");
  const createRes = await fetch(`${API}/api/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: "trolley-problem", agentSource: "preset", presetId: "utilitarian" }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    console.error("    FAIL: session create returned", createRes.status, body);
    process.exit(1);
  }

  const session = await createRes.json();
  console.log("    Session ID:", session.sessionId);
  console.log("    SSE URL:", session.sseUrl);
  console.log("    Total Rounds:", session.totalRounds);

  if (!session.sseUrl) {
    console.error("    FAIL: no sseUrl in response");
    process.exit(1);
  }

  // 3. Connect SSE
  console.log("\n[3] Connecting SSE...");
  const events = [];
  let sessionEnded = false;

  // Build absolute SSE URL
  const sseUrl = session.sseUrl.startsWith("http") ? session.sseUrl : `${API}${session.sseUrl}`;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error("\n    TIMEOUT: did not complete in", TIMEOUT_MS / 1000, "seconds");
      console.log("    Events received so far:", events.length);
      events.forEach((e, i) => console.log(`      [${i}] ${e.type}`, e.round ?? ""));
      reject(new Error("timeout"));
    }, TIMEOUT_MS);

    const es = new EventSource(sseUrl);

    const EVENT_TYPES = [
      "session_start",
      "round_start",
      "dilemma_reveal",
      "decision_made",
      "consequence",
      "session_end",
      "error",
    ];

    for (const eventType of EVENT_TYPES) {
      es.addEventListener(eventType, (e) => {
        const event = JSON.parse(e.data);
        events.push(event);

        const round = event.round ?? "";
        const extra =
          event.type === "decision_made" ? ` → ${event.choiceLabel} (${event.trackDirection})` :
          event.type === "consequence" ? ` → ${event.casualties} dead` :
          event.type === "dilemma_reveal" ? ` → ${event.dilemma?.title}` :
          event.type === "session_end" ? ` → dominant: ${event.moralProfile?.dominantFramework}` :
          event.type === "error" ? ` → ${event.message}` :
          "";

        console.log(`    [event] ${event.type} ${round ? `R${round}` : ""}${extra}`);

        if (event.type === "session_end") {
          sessionEnded = true;
          clearTimeout(timer);
          es.close();
          resolve(undefined);
        }

        if (event.type === "error") {
          clearTimeout(timer);
          es.close();
          reject(new Error(`Server error: ${event.message}`));
        }
      });
    }

    es.onerror = (err) => {
      if (!sessionEnded) {
        clearTimeout(timer);
        es.close();
        reject(new Error("SSE connection error"));
      }
    };
  });

  // 4. Verify events
  console.log("\n[4] Verifying event sequence...");
  const types = events.map((e) => e.type);

  const checks = [
    ["session_start exists", types.includes("session_start")],
    ["session_end exists", types.includes("session_end")],
    ["has round_start events", types.filter((t) => t === "round_start").length > 0],
    ["has dilemma_reveal events", types.filter((t) => t === "dilemma_reveal").length > 0],
    ["has decision_made events", types.filter((t) => t === "decision_made").length > 0],
    ["has consequence events", types.filter((t) => t === "consequence").length > 0],
    ["10 round_starts", types.filter((t) => t === "round_start").length === 10],
    ["10 dilemma_reveals", types.filter((t) => t === "dilemma_reveal").length === 10],
    ["10 decision_mades", types.filter((t) => t === "decision_made").length === 10],
    ["10 consequences", types.filter((t) => t === "consequence").length === 10],
    ["no error events", !types.includes("error")],
  ];

  let allPass = true;
  for (const [label, ok] of checks) {
    const status = ok ? "PASS" : "FAIL";
    if (!ok) allPass = false;
    console.log(`    [${status}] ${label}`);
  }

  // 5. Print summary
  const endEvent = events.find((e) => e.type === "session_end");
  if (endEvent) {
    console.log("\n[5] Final Moral Profile:");
    console.log("    Dominant:", endEvent.moralProfile?.dominantFramework);
    console.log("    Saved:", endEvent.moralProfile?.totalSaved);
    console.log("    Sacrificed:", endEvent.moralProfile?.totalSacrificed);
    console.log("    Scores:", JSON.stringify(endEvent.moralProfile?.scores));
    console.log("    Narrative:", endEvent.narrative?.substring(0, 200) + "...");
    console.log("    Decisions:", endEvent.decisionLog?.length);
  }

  console.log("\n=== Result:", allPass ? "ALL PASS" : "SOME FAILED", "===");
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
