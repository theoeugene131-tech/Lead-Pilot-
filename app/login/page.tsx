"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("tnwokobia@gmail.com");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (mode === "login" ? "Sign-in failed." : "Account creation failed."));
      if (mode === "register") {
        setMessage(result.message || "Owner account created. You can now sign in.");
        if (!result.confirmationRequired) setMode("login");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f7f8fc", fontFamily: "Arial, sans-serif", color: "#172033" }}>
      <form onSubmit={submit} style={{ width: "min(100%, 400px)", background: "#fff", border: "1px solid #e9edf3", borderRadius: 16, padding: 28, boxShadow: "0 12px 40px #17203312" }}>
        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>LeadPilot <span style={{ color: "#6558d9" }}>AI</span></div>
        <h1 style={{ fontSize: 20, margin: "20px 0 8px" }}>{mode === "login" ? "Owner sign in" : "Create owner account"}</h1>
        <p style={{ color: "#758096", fontSize: 13 }}>{mode === "login" ? "Sign in with your owner email and password." : "Create the private owner account. Registration is restricted to the configured owner email."}</p>
        <label htmlFor="email" style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "18px 0 7px" }}>Owner email</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} style={{ width: "100%", height: 44, border: "1px solid #dfe4ec", borderRadius: 8, padding: "0 12px", boxSizing: "border-box" }} />
        <label htmlFor="password" style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "14px 0 7px" }}>Password</label>
        <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : undefined} required value={password} onChange={event => setPassword(event.target.value)} style={{ width: "100%", height: 44, border: "1px solid #dfe4ec", borderRadius: 8, padding: "0 12px", boxSizing: "border-box" }} />
        {mode === "register" && <p style={{ color: "#758096", fontSize: 12, marginTop: 7 }}>Use at least 12 characters. Keep your password private.</p>}
        {error && <p role="alert" style={{ color: "#b42318", fontSize: 12 }}>{error}</p>}
        {message && <p role="status" style={{ color: "#16794b", fontSize: 12 }}>{message}</p>}
        <button disabled={busy} style={{ width: "100%", height: 44, border: 0, borderRadius: 8, marginTop: 18, background: "#6558d9", color: "#fff", fontWeight: 700 }}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create owner account"}</button>
        <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setMessage(""); }} style={{ width: "100%", border: 0, background: "transparent", color: "#6558d9", padding: "14px 4px 0", cursor: "pointer", fontWeight: 700 }}>
          {mode === "login" ? "First time? Create your owner account" : "Already registered? Sign in"}
        </button>
      </form>
    </main>
  );
}
