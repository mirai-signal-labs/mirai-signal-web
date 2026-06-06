"use client";
import { useState } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!email) return;
    setStatus("loading");
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("success");
      setMessage("登録しました！毎朝メールをお届けします。");
      setEmail("");
    } else {
      setStatus("error");
      setMessage(data.error ?? "登録に失敗しました");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{ flex: 1, padding: "8px 12px", background: "#080810", border: "0.5px solid #1e1e30", borderRadius: "6px", color: "#afa9ec", fontSize: "13px", outline: "none" }}
        />
        <button
          onClick={handleSubmit}
          disabled={status === "loading"}
          style={{ padding: "8px 20px", background: "#534ab7", border: "none", borderRadius: "6px", color: "#fff", fontSize: "13px", cursor: "pointer" }}
        >
          {status === "loading" ? "..." : "登録"}
        </button>
      </div>
      {message && (
        <p style={{ fontSize: "12px", color: status === "success" ? "#1d9e75" : "#993c1d", margin: "8px 0 0" }}>
          {message}
        </p>
      )}
    </div>
  );
}