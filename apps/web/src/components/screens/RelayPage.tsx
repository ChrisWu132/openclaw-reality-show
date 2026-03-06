import { useState, useEffect, useRef, useCallback } from "react";
import { COLORS, FONTS } from "../../styles/theme";
import { OpenClawRelay } from "../../services/openclaw-gateway";

const DEFAULT_OPENCLAW_URL = "ws://localhost:18789";

type RelayStatus = "input" | "joining" | "probing" | "connecting_sse" | "waiting" | "relaying" | "done" | "error";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "error" | "success";
}

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export function RelayPage() {
  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get("code") || "";

  const [code, setCode] = useState(codeFromUrl);
  const [openclawUrl, setOpenclawUrl] = useState(DEFAULT_OPENCLAW_URL);
  const [status, setStatus] = useState<RelayStatus>(codeFromUrl ? "joining" : "input");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [relayCount, setRelayCount] = useState(0);
  const [sessionInfo, setSessionInfo] = useState<{ gameType: string; agentName?: string } | null>(null);

  const relayRef = useRef<OpenClawRelay | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev, { time: timestamp(), message, type }]);
  }, []);

  // Auto-join when code comes from URL
  useEffect(() => {
    if (codeFromUrl && status === "joining") {
      handleJoin(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin(joinCode?: string) {
    const c = (joinCode || code).trim().toUpperCase();
    if (!c) return;

    setStatus("joining");
    setErrorMsg(null);
    addLog(`Joining with code: ${c}`);

    try {
      const res = await fetch("/api/relay/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `Join failed (${res.status})`);
      }

      const data = await res.json();
      setSessionInfo({ gameType: data.gameType, agentName: data.agentName });
      addLog(`Joined ${data.gameType} session: ${data.sessionId}`, "success");

      // Probe local OpenClaw
      setStatus("probing");
      addLog(`Probing OpenClaw at ${openclawUrl}...`);

      const relay = new OpenClawRelay();
      relay.setUrl(openclawUrl);
      relayRef.current = relay;

      try {
        await relay.connect();
        addLog("OpenClaw connected!", "success");
      } catch {
        throw new Error(`Cannot connect to OpenClaw at ${openclawUrl}. Make sure it's running.`);
      }

      // Connect relay SSE
      setStatus("connecting_sse");
      addLog("Connecting relay SSE...");

      const relayUrl = data.agentId
        ? `${data.relayUrl}?token=${encodeURIComponent(data.delegationToken)}&agentId=${data.agentId}`
        : `${data.relayUrl}?token=${encodeURIComponent(data.delegationToken)}`;

      const es = new EventSource(relayUrl);
      esRef.current = es;

      es.addEventListener("relay_connected", () => {
        setStatus("waiting");
        addLog("Relay SSE connected. Waiting for game to start...", "success");
      });

      es.addEventListener("openclaw_request", async (e) => {
        let event: { requestId: string; prompt: string };
        try {
          event = JSON.parse(e.data);
        } catch {
          addLog("Failed to parse openclaw_request", "error");
          return;
        }

        setStatus("relaying");
        addLog(`Received prompt (${event.requestId.slice(0, 8)}...) — forwarding to OpenClaw...`);

        const openclawPostUrl = data.openclawUrl;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.delegationToken}`,
        };

        try {
          if (!relay.connected) {
            addLog("OpenClaw disconnected, reconnecting...");
            await relay.connect();
          }
          const text = await relay.sendPrompt(event.prompt);
          addLog(`Got response (${text.length} chars) — posting back...`, "success");

          await fetch(openclawPostUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ requestId: event.requestId, text }),
          });

          setRelayCount((prev) => prev + 1);
          addLog("Response delivered!", "success");
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Relay failed";
          addLog(`Relay error: ${errorMsg}`, "error");
          await fetch(openclawPostUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ requestId: event.requestId, error: errorMsg }),
          }).catch(() => {});
        }
      });

      // Also listen for startup_openclaw_request (same handler)
      es.addEventListener("startup_openclaw_request", async (e) => {
        let event: { requestId: string; prompt: string; agentId: string };
        try {
          event = JSON.parse(e.data);
        } catch {
          addLog("Failed to parse startup_openclaw_request", "error");
          return;
        }

        setStatus("relaying");
        addLog(`Received startup prompt (${event.requestId.slice(0, 8)}...) — forwarding...`);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.delegationToken}`,
        };

        try {
          if (!relay.connected) {
            addLog("OpenClaw disconnected, reconnecting...");
            await relay.connect();
          }
          const text = await relay.sendPrompt(event.prompt);
          addLog(`Got response (${text.length} chars) — posting back...`, "success");

          await fetch(data.openclawUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ requestId: event.requestId, text }),
          });

          setRelayCount((prev) => prev + 1);
          addLog("Response delivered!", "success");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Relay failed";
          addLog(`Relay error: ${msg}`, "error");
          await fetch(data.openclawUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ requestId: event.requestId, error: msg }),
          }).catch(() => {});
        }
      });

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          setStatus("done");
          addLog("Relay SSE connection closed (game may have ended).");
        }
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setStatus("error");
      setErrorMsg(msg);
      addLog(msg, "error");
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      relayRef.current?.disconnect();
      esRef.current?.close();
    };
  }, []);

  const statusColor =
    status === "error" ? COLORS.accentRed
    : status === "relaying" ? "#7ACC5A"
    : status === "waiting" ? COLORS.accentOrange
    : status === "done" ? COLORS.textSecondary
    : COLORS.accentBlue;

  const statusText: Record<RelayStatus, string> = {
    input: "ENTER JOIN CODE",
    joining: "JOINING...",
    probing: "PROBING OPENCLAW...",
    connecting_sse: "CONNECTING RELAY...",
    waiting: "CONNECTED — WAITING FOR GAME",
    relaying: "RELAYING",
    done: "FINISHED",
    error: "ERROR",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100vh",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: FONTS.body,
        color: COLORS.textPrimary,
        padding: "60px 20px",
        overflow: "auto",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.pixel,
          fontSize: "16px",
          color: COLORS.accentBlue,
          letterSpacing: "0.15em",
          marginBottom: "40px",
          textShadow: "0 0 25px rgba(74, 144, 217, 0.3)",
        }}
      >
        OPENCLAW RELAY
      </div>

      {/* Status indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "30px",
          fontFamily: FONTS.pixel,
          fontSize: "10px",
          color: statusColor,
        }}
      >
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
            animation: status === "relaying" || status === "joining" || status === "probing" ? "pulse 1.5s ease-in-out infinite" : "none",
          }}
        />
        {statusText[status]}
        {relayCount > 0 && <span style={{ color: COLORS.textSecondary, fontSize: "8px" }}>({relayCount} relayed)</span>}
      </div>

      {sessionInfo && (
        <div style={{ fontSize: "9px", color: COLORS.textSecondary, marginBottom: "20px", textAlign: "center" }}>
          Game: {sessionInfo.gameType.toUpperCase()}
          {sessionInfo.agentName && ` — Agent: ${sessionInfo.agentName}`}
        </div>
      )}

      {/* Input form */}
      {status === "input" && (
        <div
          style={{
            border: `1px solid ${COLORS.accentBlue}40`,
            padding: "24px",
            width: "400px",
            maxWidth: "100%",
          }}
        >
          <div style={{ fontSize: "8px", color: COLORS.textSecondary, marginBottom: "12px" }}>JOIN CODE</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A7X9K2"
            maxLength={6}
            style={{
              fontFamily: FONTS.pixel,
              fontSize: "20px",
              padding: "12px 16px",
              background: "rgba(0,0,0,0.4)",
              border: `1px solid ${COLORS.accentBlue}40`,
              color: COLORS.textPrimary,
              width: "100%",
              textAlign: "center",
              letterSpacing: "0.3em",
              marginBottom: "16px",
            }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />

          <div style={{ fontSize: "8px", color: COLORS.textSecondary, marginBottom: "12px" }}>OPENCLAW URL</div>
          <input
            value={openclawUrl}
            onChange={(e) => setOpenclawUrl(e.target.value)}
            placeholder="ws://localhost:18789"
            style={{
              fontFamily: FONTS.body,
              fontSize: "10px",
              padding: "8px 12px",
              background: "rgba(0,0,0,0.4)",
              border: `1px solid rgba(255,255,255,0.1)`,
              color: COLORS.textPrimary,
              width: "100%",
              marginBottom: "20px",
            }}
          />

          <button
            onClick={() => handleJoin()}
            disabled={!code.trim()}
            style={{
              fontFamily: FONTS.pixel,
              fontSize: "10px",
              color: code.trim() ? COLORS.accentBlue : "#555",
              background: "transparent",
              border: `1px solid ${code.trim() ? COLORS.accentBlue + "60" : "#33333360"}`,
              padding: "12px 24px",
              cursor: code.trim() ? "pointer" : "not-allowed",
              width: "100%",
              letterSpacing: "0.1em",
            }}
          >
            CONNECT
          </button>
        </div>
      )}

      {/* Error display with retry */}
      {status === "error" && (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", color: COLORS.accentRed, marginBottom: "16px" }}>{errorMsg}</div>
          <button
            onClick={() => { setStatus("input"); setErrorMsg(null); }}
            style={{
              fontFamily: FONTS.pixel,
              fontSize: "9px",
              color: COLORS.accentBlue,
              background: "transparent",
              border: `1px solid ${COLORS.accentBlue}40`,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Log panel */}
      {logs.length > 0 && (
        <div
          style={{
            width: "500px",
            maxWidth: "100%",
            marginTop: "20px",
            border: `1px solid rgba(255,255,255,0.08)`,
            background: "rgba(0,0,0,0.4)",
            maxHeight: "300px",
            overflow: "auto",
          }}
        >
          <div style={{ padding: "8px 12px", fontSize: "7px", color: COLORS.textSecondary, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            RELAY LOG
          </div>
          {logs.map((log, i) => (
            <div
              key={i}
              style={{
                padding: "4px 12px",
                fontSize: "8px",
                color: log.type === "error" ? COLORS.accentRed : log.type === "success" ? "#7ACC5A" : COLORS.textSecondary,
                borderBottom: "1px solid rgba(255,255,255,0.02)",
                lineHeight: "1.8",
              }}
            >
              <span style={{ color: "#505050", marginRight: "8px" }}>{log.time}</span>
              {log.message}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
