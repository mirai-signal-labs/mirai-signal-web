"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI",
  robotics: "Robotics",
  biotech: "Biotech",
  semiconductor: "Semiconductor",
  energy: "Energy",
  space: "Space",
  defense: "Defense",
  other: "Other",
};

type Term = {
  term: string;
  term_en: string | null;
  domain: string | null;
  explanation: string;
};

export default function GlossaryGacha({
  terms,
  buttonLabel = "🎲 ランダムに1つ",
}: {
  terms: Term[];
  buttonLabel?: string;
}) {
  const [gachaTerm, setGachaTerm] = useState<Term | null>(null);
  const [gachaKey, setGachaKey] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDisplay, setSpinDisplay] = useState<Term | null>(null);

  const spinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearInterval(spinTimerRef.current);
      if (spinStopRef.current) clearTimeout(spinStopRef.current);
    };
  }, []);

  const handleGacha = () => {
    if (terms.length === 0) return;

    if (spinTimerRef.current) clearInterval(spinTimerRef.current);
    if (spinStopRef.current) clearTimeout(spinStopRef.current);

    const finalTerm = terms[Math.floor(Math.random() * terms.length)];

    setIsSpinning(true);
    setGachaTerm(null);
    setSpinDisplay(terms[Math.floor(Math.random() * terms.length)]);

    spinTimerRef.current = setInterval(() => {
      setSpinDisplay(terms[Math.floor(Math.random() * terms.length)]);
    }, 55);

    spinStopRef.current = setTimeout(() => {
      if (spinTimerRef.current) {
        clearInterval(spinTimerRef.current);
        spinTimerRef.current = null;
      }
      setIsSpinning(false);
      setSpinDisplay(null);
      setGachaKey((k) => k + 1);
      setGachaTerm(finalTerm);
    }, 750);
  };

  const closeGacha = () => {
    if (isSpinning) return;
    setGachaTerm(null);
  };

  const showModal = isSpinning || !!gachaTerm;

  return (
    <>
      <style>{`
        @keyframes gachaOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gachaPopIn {
          0% { opacity: 0; transform: scale(0.4) rotate(-8deg); }
          50% { opacity: 1; transform: scale(1.15) rotate(4deg); }
          75% { transform: scale(0.94) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes gachaFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes gachaSpinFlicker {
          0% { opacity: 0.25; transform: translateY(8px) scale(0.94); }
          50% { opacity: 1; transform: translateY(0) scale(1.04); }
          100% { opacity: 0.5; transform: translateY(-6px) scale(0.98); }
        }
        @keyframes gachaShake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          20% { transform: translateX(-4px) rotate(-1deg); }
          40% { transform: translateX(4px) rotate(1deg); }
          60% { transform: translateX(-3px) rotate(-0.6deg); }
          80% { transform: translateX(3px) rotate(0.6deg); }
        }
      `}</style>

      <button
        onClick={handleGacha}
        style={{
          flexShrink: 0,
          fontSize: "13px",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "0.5px solid var(--ms-accent)",
          background: "var(--ms-accent-dim)",
          color: "var(--ms-accent-strong)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {buttonLabel}
      </button>

      {showModal && (
        <div
          onClick={closeGacha}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px",
            animation: "gachaOverlayIn 0.15s ease-out",
          }}
        >
          {isSpinning ? (
            <div
              style={{
                background: "var(--ms-bg-card)",
                border: "0.5px solid var(--ms-border)",
                borderRadius: "16px",
                padding: "40px 32px",
                maxWidth: "440px",
                width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                animation: "gachaShake 0.3s ease-in-out infinite",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "10px", color: "var(--ms-accent)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 20px" }}>
                🎰 ガチャ中…
              </p>
              <h2
                key={spinDisplay?.term ?? "spin"}
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "var(--ms-text-strong)",
                  margin: 0,
                  animation: "gachaSpinFlicker 0.13s linear",
                }}
              >
                {spinDisplay?.term ?? "？？？"}
              </h2>
            </div>
          ) : (
            <div
              key={gachaKey}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                overflow: "hidden",
                background: "var(--ms-bg-card)",
                border: "0.5px solid var(--ms-border)",
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "440px",
                width: "100%",
                animation: "gachaPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 65%)",
                  animation: "gachaFlash 0.5s ease-out",
                  animationFillMode: "forwards",
                  pointerEvents: "none",
                }}
              />
              <p style={{ fontSize: "10px", color: "var(--ms-accent)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>
                🎉 今日の用語
              </p>
              {gachaTerm!.domain && (
                <span style={{ fontSize: "10px", color: "var(--ms-accent-strong)", background: "var(--ms-accent-dim)", padding: "3px 12px", borderRadius: "20px", letterSpacing: "0.06em", display: "inline-block", marginBottom: "12px" }}>
                  {DOMAIN_LABELS[gachaTerm!.domain] ?? gachaTerm!.domain.toUpperCase()}
                </span>
              )}
              <h2 style={{ fontSize: "22px", fontWeight: 600, color: "var(--ms-text-strong)", margin: "0 0 4px" }}>
                {gachaTerm!.term}
              </h2>
              {gachaTerm!.term_en && (
                <p style={{ fontSize: "12px", color: "var(--ms-text-label)", margin: "0 0 16px" }}>
                  {gachaTerm!.term_en}
                </p>
              )}
              <p style={{ fontSize: "14px", color: "var(--ms-text-secondary)", lineHeight: 1.8, margin: "0 0 24px" }}>
                {gachaTerm!.explanation}
              </p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Link
                  href={"/glossary/" + encodeURIComponent(gachaTerm!.term)}
                  style={{ fontSize: "12px", color: "var(--ms-accent-strong)", border: "0.5px solid var(--ms-accent)", padding: "8px 18px", borderRadius: "20px", textDecoration: "none" }}
                >
                  詳しく見る
                </Link>
                <button
                  onClick={handleGacha}
                  style={{ fontSize: "12px", color: "var(--ms-text-primary)", border: "0.5px solid var(--ms-border)", padding: "8px 18px", borderRadius: "20px", background: "transparent", cursor: "pointer" }}
                >
                  🎲 もう一回
                </button>
                <button
                  onClick={() => setGachaTerm(null)}
                  style={{ fontSize: "12px", color: "var(--ms-text-muted)", border: "none", padding: "8px 12px", background: "transparent", cursor: "pointer", marginLeft: "auto" }}
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
