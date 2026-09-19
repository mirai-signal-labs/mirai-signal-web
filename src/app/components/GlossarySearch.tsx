"use client";

import { useState, useMemo } from "react";
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

const DOMAIN_ORDER = ["ai", "robotics", "biotech", "semiconductor", "energy", "space", "defense"];

type Term = {
  term: string;
  term_en: string | null;
  domain: string | null;
};

export default function GlossarySearch({ terms }: { terms: Term[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter((t) => {
      const termMatch = t.term.toLowerCase().includes(q);
      const enMatch = t.term_en ? t.term_en.toLowerCase().includes(q) : false;
      return termMatch || enMatch;
    });
  }, [terms, query]);

  const grouped: Record<string, Term[]> = {};
  for (const t of filtered) {
    const key = t.domain && DOMAIN_LABELS[t.domain] ? t.domain : "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const domainKeys = [
    ...DOMAIN_ORDER.filter((d) => grouped[d]?.length),
    ...(grouped["other"]?.length ? ["other"] : []),
  ];

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="用語を検索（日本語・英語どちらでも）"
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontSize: "14px",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "0.5px solid var(--ms-border)",
            background: "var(--ms-bg-card)",
            color: "var(--ms-text-primary)",
            outline: "none",
          }}
        />
        <p style={{ fontSize: "11px", color: "var(--ms-text-muted)", margin: "8px 0 0" }}>
          {filtered.length}件 / 全{terms.length}件
        </p>
      </div>

      {domainKeys.length === 0 ? (
        <p style={{ color: "var(--ms-text-secondary)", fontSize: "14px" }}>
          一致する用語が見つかりません。
        </p>
      ) : (
        domainKeys.map((key) => (
          <div key={key} style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", color: "var(--ms-accent-strong)", background: "var(--ms-accent-dim)", padding: "3px 12px", borderRadius: "20px", letterSpacing: "0.06em" }}>
                {DOMAIN_LABELS[key] ?? key.toUpperCase()}
              </span>
              <span style={{ fontSize: "11px", color: "var(--ms-text-muted)" }}>
                {grouped[key].length}件
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {grouped[key].map((t) => (
                <Link
                  key={t.term}
                  href={"/glossary/" + t.term}
                  style={{
                    fontSize: "13px",
                    color: "var(--ms-text-primary)",
                    background: "var(--ms-bg-card)",
                    border: "0.5px solid var(--ms-border)",
                    borderRadius: "20px",
                    padding: "6px 16px",
                    textDecoration: "none",
                  }}
                >
                  {t.term}
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
