"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Sign-in failed.");
      const next = params.get("next") || "/";
      router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally { setBusy(false); }
  }
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f7f8fc", fontFamily: "Arial, sans-serif", color: "#172033" }}>
    <form onSubmit={submit} style={{ width: "min(100%, 390px)", background: "#fff", border: "1px solid #e9edf3", borderRadius: 16, padding: 28, boxShadow: "0 12px 40px #17203312" }}>
      <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>LeadPilot <span style={{ color: "#6558d9" }}>AI</span></div>
      <h1 style={{ fontSize: 20, margin: "20px 0 8px" }}>Private workspace</h1>
      <p style={{ color: "#758096", fontSize: 13, lineHeight: 1.6 }}>Enter your workspace password to continue.</p>
      <label htmlFor="password" style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "18px 0 7px" }}>Workspace password</label>
      <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", height: 44, border: "1px solid #dfe4ec", borderRadius: 8, padding: "0 12px", boxSizing: "border-box" }} />
      {error && <p role="alert" style={{ color: "#b42318", fontSize: 12, margin: "10px 0 0" }}>{error}</p>}
      <button disabled={busy || !password} style={{ width: "100%", height: 44, border: 0, borderRadius: 8, marginTop: 18, background: "#6558d9", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  </main>;
}
