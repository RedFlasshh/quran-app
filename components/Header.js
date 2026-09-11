"use client";
import { useState } from "react";
import Link from "next/link";
import { LogOut, Mail, X, User, Award } from "lucide-react";
import { C } from "../lib/theme";
import { useAuth } from "../hooks/useAuth";

export default function Header() {
  const { session, profile, authBusy, email, setEmail, emailSent, signInGoogle, signInEmail, signOut, isNativeApp, exitApp } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(14px + env(safe-area-inset-top)) 18px 14px", maxWidth: 640, margin: "0 auto" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <span className="amiri" style={{ fontSize: 20, color: C.goldBright }}>ق</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.ivory }}>Understanding the Quran</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/progress" aria-label="Your progress" style={{ color: C.faint, display: "flex" }}>
          <Award size={18} />
        </Link>
        {isNativeApp() && (
          <button onClick={exitApp} aria-label="Exit app" style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", padding: 4 }}><X size={18} /></button>
        )}
        {session === undefined ? null : session?.user ? (
          <button onClick={signOut} aria-label="Sign out" title={profile?.alias || "Sign out"}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.faint, cursor: "pointer", padding: 4 }}>
            <User size={16} /><LogOut size={16} />
          </button>
        ) : (
          <button onClick={() => setShowSignIn(true)}
            style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.gold, borderRadius: 999, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
            Sign in
          </button>
        )}
      </div>

      {showSignIn && (
        <div onClick={() => setShowSignIn(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(6,12,10,0.78)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380, width: "100%", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.ivory, marginBottom: 4 }}>Sign in</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>Saves your reading progress and quiz scores across devices. Browsing and quizzes work fine without it too.</div>

            <button onClick={signInGoogle} disabled={authBusy}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: C.gold, color: "#1B1508", fontWeight: 700, border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14.5, cursor: "pointer", opacity: authBusy ? 0.7 : 1, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#1B1508" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.2l6-6C34.9 4.5 29.7 2.5 24 2.5 12.1 2.5 2.5 12.1 2.5 24S12.1 45.5 24 45.5c11 0 21-8 21-21.5 0-1.4-.2-2.7-.5-4z"/></svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", color: C.faint, fontSize: 11.5 }}>
              <div style={{ flex: 1, height: 1, background: C.line }} /> or <div style={{ flex: 1, height: 1, background: C.line }} />
            </div>

            {!emailSent ? (
              <>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com"
                  onKeyDown={(e) => e.key === "Enter" && signInEmail()}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px", color: C.ivory, fontSize: 14, marginBottom: 10 }} />
                <button onClick={signInEmail} disabled={authBusy}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.surface2, color: C.ivory, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 16px", fontSize: 14, cursor: "pointer" }}>
                  <Mail size={15} /> Email me a sign-in link
                </button>
              </>
            ) : (
              <div style={{ background: C.surface2, border: `1px solid ${C.gold}44`, borderRadius: 12, padding: 14, textAlign: "center", fontSize: 13, lineHeight: 1.5 }}>
                Link sent to <b>{email}</b>. Open it on this device.
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
