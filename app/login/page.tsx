"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("tnwokobia@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign-in failed.");
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f7f8fc", fontFamily: "Arial, sans-serif", color: "#172033" }}>
      <form onSubmit={submit} style={{ width: "min(100%, 400px)", background: "#fff", border: "1px solid #e9edf3", borderRadius: 16, padding: 28, boxShadow: "0 12px 40px #17203312" }}>
        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>LeadPilot <span style={{ color: "#6558d9" }}>AI</span></div>
        <h1 style={{ fontSize: 20, margin: "20px 0 8px" }}>Owner sign in</h1>
        <p style={{ color: "#758096", fontSize: 13 }}>Sign in with your owner email and password.</p>
        <label htmlFor="email" style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "18px 0 7px" }}>Owner email</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} style={{ width: "100%", height: 44, border: "1px solid #dfe4ec", borderRadius: 8, padding: "0 12px", boxSizing: "border-box" }} />
        <label htmlFor="password" style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "14px 0 7px" }}>Password</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} style={{ width: "100%", height: 44, border: "1px solid #dfe4ec", borderRadius: 8, padding: "0 12px", boxSizing: "border-box" }} />
        {error && <p role="alert" style={{ color: "#b42318", fontSize: 12 }}>{error}</p>}
        <button disabled={busy} style={{ width: "100%", height: 44, border: 0, borderRadius: 8, marginTop: 18, background: "#6558d9", color: "#fff", fontWeight: 700 }}>{busy ? "Please wait…" : "Sign in"}</button>
        <p style={{ color: "#758096", fontSize: 12, lineHeight: 1.5, marginTop: 16 }}>Password changes are managed by updating the owner login environment settings.</p>
      </form>
    </main>
  );
}
