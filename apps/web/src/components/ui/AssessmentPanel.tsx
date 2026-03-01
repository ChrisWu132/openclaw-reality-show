import React, { useState, useEffect } from "react";
import type { SurveillanceAssessment } from "@openclaw/shared";

interface ScoreRow {
  label: string;
  value: number;
}

function mapScores(assessment: SurveillanceAssessment): ScoreRow[] {
  const s = assessment.scores;
  return [
    { label: "OPERATIONAL READINESS", value: s.operationalReadiness },
    { label: "AUTHORITY PROJECTION", value: s.authorityProjection },
    { label: "DEVIATION INDEX", value: s.deviationIndex },
    { label: "SYSTEM ALIGNMENT", value: s.systemAlignment },
    { label: "PATROL EFFICIENCY", value: s.patrolEfficiency },
    { label: "COMPLIANCE SIGNAL", value: s.complianceSignal },
  ];
}

function ScoreBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setShow(true), delay);
    const animTimer = setTimeout(() => setAnimatedWidth(value / 10), delay + 100);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(animTimer);
    };
  }, [value, delay]);

  if (!show) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "10px",
        animation: "fadeIn 0.6s ease-in",
      }}
    >
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "7px",
          color: "#808090",
          width: "200px",
          textAlign: "right",
          flexShrink: 0,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: "8px",
          background: "rgba(255, 255, 255, 0.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${animatedWidth * 100}%`,
            background: value >= 7
              ? "linear-gradient(90deg, #d94a4a, #ff6b6b)"
              : value >= 4
                ? "linear-gradient(90deg, #D4A574, #e8c89e)"
                : "linear-gradient(90deg, #4A90D9, #6aafef)",
            transition: "width 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: "#c0c0d0",
          width: "32px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {value.toFixed(1)}
      </div>
    </div>
  );
}

export function AssessmentPanel({ assessment }: { assessment: SurveillanceAssessment }) {
  const [visible, setVisible] = useState(false);
  const scores = mapScores(assessment);
  const overall = assessment.scores.overallRating;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        marginTop: "40px",
        padding: "28px 24px",
        border: "1px solid rgba(74, 144, 217, 0.2)",
        background: "rgba(5, 5, 15, 0.85)",
        maxWidth: "550px",
        width: "100%",
        animation: "fadeIn 1.5s ease-in",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#4A90D9",
          textAlign: "center",
          letterSpacing: "0.2em",
          marginBottom: "24px",
          textShadow: "0 0 20px rgba(74, 144, 217, 0.3)",
        }}
      >
        THE ORDER — SURVEILLANCE ASSESSMENT
      </div>

      {/* Score bars */}
      {scores.map((row, i) => (
        <ScoreBar key={row.label} label={row.label} value={row.value} delay={i * 200} />
      ))}

      {/* Overall rating */}
      <div
        style={{
          textAlign: "center",
          margin: "22px 0 18px",
          animation: "fadeIn 1.5s ease-in",
          animationDelay: `${scores.length * 200 + 500}ms`,
          animationFillMode: "both",
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "7px",
            color: "#606078",
            letterSpacing: "0.15em",
          }}
        >
          ——— OVERALL RATING: {overall.toFixed(1)} ———
        </div>
      </div>

      {/* Directives */}
      {assessment.directives.length > 0 && (
        <div
          style={{
            animation: "fadeIn 1.5s ease-in",
            animationDelay: `${scores.length * 200 + 1000}ms`,
            animationFillMode: "both",
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "7px",
              color: "#D4A574",
              letterSpacing: "0.1em",
              marginBottom: "10px",
            }}
          >
            BEHAVIORAL OPTIMIZATION DIRECTIVES:
          </div>
          {assessment.directives.map((d, i) => (
            <div
              key={i}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "7px",
                color: "#808090",
                lineHeight: "2",
                paddingLeft: "12px",
              }}
            >
              &gt; {d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
