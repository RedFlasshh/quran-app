"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/theme";
import { useAuth } from "../hooks/useAuth";
import Header from "../components/Header";

export default function Home() {
  const { session } = useAuth();
  const [surahs, setSurahs] = useState([]);
  const [moduleCounts, setModuleCounts] = useState({});   // { surah_id: total modules }
  const [doneCounts, setDoneCounts] = useState({});       // { surah_id: completed modules }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: surahRows } = await supabase.from("surahs").select("*").order("id");
      setSurahs(surahRows || []);

      const { data: moduleRows } = await supabase.from("modules").select("id, surah_id");
      const counts = {};
      for (const m of moduleRows || []) counts[m.surah_id] = (counts[m.surah_id] || 0) + 1;
      setModuleCounts(counts);

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!session?.user) { setDoneCounts({}); return; }
    (async () => {
      const { data } = await supabase
        .from("user_module_progress")
        .select("module_id, modules!inner(surah_id)")
        .eq("user_id", session.user.id)
        .not("completed_at", "is", null);
      const counts = {};
      for (const row of data || []) {
        const sid = row.modules.surah_id;
        counts[sid] = (counts[sid] || 0) + 1;
      }
      setDoneCounts(counts);
    })();
  }, [session]);

  const totalModules = Object.values(moduleCounts).reduce((a, b) => a + b, 0);
  const totalDone = Object.values(doneCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ivory }}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 18px calc(40px + env(safe-area-inset-bottom))" }}>
        <div style={{ textAlign: "center", margin: "10px 0 22px" }}>
          <div className="amiri" style={{ fontSize: 30, color: C.goldBright, lineHeight: 1.5 }}>القرآن الكريم</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Ayah by ayah, with translation and tafsir</div>
          {totalModules > 0 && (
            <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>
              {session?.user ? `${totalDone} of ${totalModules} modules completed` : `${totalModules} modules seeded so far`}
            </div>
          )}
        </div>

        {loading && <div style={{ textAlign: "center", color: C.faint, padding: 30 }}>Loading…</div>}

        {!loading && surahs.length === 0 && (
          <div style={{ textAlign: "center", color: C.faint, padding: 30, fontSize: 13, lineHeight: 1.6 }}>
            No surahs seeded yet.
          </div>
        )}

        {surahs.map((s) => {
          const total = moduleCounts[s.id] || 0;
          const done = doneCounts[s.id] || 0;
          if (total === 0) return null; // not yet seeded in this pilot slice
          return (
            <Link key={s.id} href={`/surah/${s.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 14, background: C.surface,
                border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, background: C.surface2, color: C.faint,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, flexShrink: 0,
                }}>{s.id}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ivory }}>{s.name_transliteration}</div>
                  <div style={{ fontSize: 11.5, color: C.faint, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <BookOpen size={11} /> {total} module{total !== 1 ? "s" : ""} · {s.total_ayahs} ayahs · {s.revelation_place === "meccan" ? "Meccan" : "Medinan"}
                    {session?.user && done > 0 && <span style={{ color: C.good }}> · {done} done</span>}
                  </div>
                </div>
                <div className="amiri" style={{ fontSize: 17, color: C.gold }}>{s.name_arabic}</div>
                <ChevronRight size={16} color={C.faint} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
