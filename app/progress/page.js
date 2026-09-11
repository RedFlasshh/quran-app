"use client";
import { useState, useEffect } from "react";
import { Award } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { C } from "../../lib/theme";
import { useAuth } from "../../hooks/useAuth";
import Header from "../../components/Header";

// Same badge idea as the old progress.html, recomputed from actual
// completions each time rather than stored -- there's only one source of
// truth (user_module_progress), so it can never drift from a second list.
const BADGES = [
  { count: 1, label: "First Module" },
  { count: 10, label: "Ten Modules" },
  { count: 25, label: "Quarter Century" },
  { count: 66, label: "Juz Amma Complete" },
  { count: 150, label: "Halfway There" },
  { count: 300, label: "Deep Reader" },
];

export default function ProgressPage() {
  const { session } = useAuth();
  const [totalModules, setTotalModules] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from("modules").select("id", { count: "exact", head: true });
      setTotalModules(count || 0);

      if (session?.user) {
        const { data } = await supabase
          .from("user_module_progress")
          .select("module_id, quiz_score, quiz_total, completed_at, modules(surah_id, module_number, surahs(name_transliteration))")
          .eq("user_id", session.user.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false });
        setCompleted(data || []);
      }
      setLoading(false);
    })();
  }, [session]);

  const doneCount = completed.length;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ivory }}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 18px calc(40px + env(safe-area-inset-bottom))" }}>
        <div className="display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>Your Progress</div>

        {!session?.user ? (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
            Sign in (top right) to start tracking completed modules and quiz scores.
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", color: C.faint, padding: 30 }}>Loading…</div>
        ) : (
          <>
            <div style={{ background: C.surface2, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: 20, marginBottom: 18, textAlign: "center" }}>
              <div className="display" style={{ fontSize: 38, fontWeight: 700, color: C.goldBright }}>{doneCount}</div>
              <div style={{ fontSize: 12.5, color: C.muted }}>of {totalModules} modules completed</div>
              <div style={{ height: 8, background: C.surface, borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
                <div style={{ height: "100%", width: `${totalModules ? Math.min((doneCount / totalModules) * 100, 100) : 0}%`, background: C.gold }} />
              </div>
            </div>

            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint, marginBottom: 10 }}>Badges</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 22 }}>
              {BADGES.map((b) => {
                const earned = doneCount >= b.count;
                return (
                  <div key={b.count} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 10px",
                    background: earned ? C.surface2 : C.surface, border: `1px solid ${earned ? C.gold : C.line}`, borderRadius: 12,
                    opacity: earned ? 1 : 0.55,
                  }}>
                    <Award size={20} color={earned ? C.goldBright : C.faint} />
                    <div style={{ fontSize: 12, textAlign: "center", color: earned ? C.ivory : C.faint }}>{b.label}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint, marginBottom: 10 }}>Recently completed</div>
            {completed.slice(0, 20).map((c) => (
              <div key={c.module_id} style={{ display: "flex", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, fontSize: 13.5 }}>
                <span>{c.modules?.surahs?.name_transliteration} · Module {c.modules?.module_number}</span>
                <span style={{ color: C.muted }}>{c.quiz_score}/{c.quiz_total}</span>
              </div>
            ))}
            {completed.length === 0 && <div style={{ color: C.faint, fontSize: 13 }}>No modules completed yet.</div>}
          </>
        )}
      </div>
    </div>
  );
}
