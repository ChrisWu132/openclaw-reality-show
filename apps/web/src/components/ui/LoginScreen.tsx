import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { COLORS, FONTS } from "../../styles/theme";

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const { login, register, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await login(email, password);
    } else {
      await register(email, password, displayName);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    clearError();
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: FONTS.body,
    fontSize: "13px",
    color: COLORS.textPrimary,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "2px",
    padding: "10px 14px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.pixel,
          fontSize: "24px",
          color: COLORS.accentRed,
          letterSpacing: "0.2em",
          textShadow: "0 0 40px rgba(217, 74, 74, 0.4)",
          marginBottom: "40px",
        }}
      >
        OPENCLAW ARENA
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          width: "320px",
          padding: "30px",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "4px",
        }}
      >
        <div
          style={{
            fontFamily: FONTS.pixel,
            fontSize: "10px",
            color: COLORS.textSecondary,
            textAlign: "center",
            letterSpacing: "0.15em",
            marginBottom: "10px",
          }}
        >
          {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </div>

        {mode === "register" && (
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
          minLength={6}
        />

        {error && (
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: "11px",
              color: COLORS.accentRed,
              textAlign: "center",
              padding: "6px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: FONTS.pixel,
            fontSize: "9px",
            color: COLORS.accentRed,
            background: "transparent",
            border: `1px solid rgba(217, 74, 74, 0.4)`,
            padding: "12px",
            cursor: loading ? "wait" : "pointer",
            letterSpacing: "0.15em",
            marginTop: "6px",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "..." : mode === "login" ? "ENTER" : "REGISTER"}
        </button>

        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: "11px",
            color: COLORS.textSecondary,
            textAlign: "center",
            cursor: "pointer",
            marginTop: "4px",
          }}
          onClick={toggleMode}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </div>
      </form>
    </div>
  );
}
