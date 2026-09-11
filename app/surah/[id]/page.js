"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { C } from "../../../lib/theme";
import { useAuth } from "../../../hooks/useAuth";
import Header from "../../../components/Header";

export default function SurahPage() {
  const { id } = useParams();
  const surahId = parseInt(id, 10);
  const { session } = useAuth();
  const [surah, setSurah] = useState(null);
  const [modules, setModules] = useState([]);
  const [doneModuleIds, setDoneModuleIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("surahs").select("*").eq("id", surahId).maybeSingle();
      setSurah(s);
      const { data: mods } = await supabase.from("modules").select("*").eq("surah_id", surahId).order("module_number");
      setModules(mods || []);
      setLoading(false);
    })();
  }, [surahId]);

  useEffect(() => {
    if (!session?.user || modules.length === 0) { setDoneModuleIds(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from("user_module_progress")
        .select("module_id")
        .eq("user_id", session.user.id)
        .in("module_id", modules.map((m) => m.id))
        .not("completed_at", "is", null);
      setDoneModuleIds(new Set((data || []).map((r) => r.module_id)));
    })();
  }, [session, modules]);

  if (loading) return <div style={{ background: C.bg, minHeight: "100vh" }}><Header /><div style={{ textAlign: "center", color: C.faint, padding: 40 }}>Loading…</div></div>;
  if (!surah) return <div style={{ background: C.bg, minHeight: "100vh" }}><Header /><div style={{ textAlign: "center", color: C.faint, padding: 40 }}>Surah not found.</div></div>;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ivory }}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 18px calc(40px + env(safe-area-inset-bottom))" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.faint, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
          <ChevronLeft size={14} /> All surahs
        </Link>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div className="amiri" style={{ fontSize: 32, color: C.goldBright }}>{surah.name_arabic}</div>
          <div style={{ fontSize: 19, fontWeight: 600, marginTop: 4 }}>{surah.name_transliteration}</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{surah.name_translation} · {surah.total_ayahs} ayahs · {surah.revelation_place === "meccan" ? "Meccan" : "Medinan"}</div>
        </div>

        {modules.map((m) => {
          const done = doneModuleIds.has(m.id);
          return (
            <Link key={m.id} href={`/module/${m.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12, background: done ? C.surface2 : C.surface,
                border: `1px solid ${done ? C.good : C.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, background: done ? C.good : C.surface2,
                  color: done ? "#0E1A16" : C.faint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, flexShrink: 0, fontWeight: 700,
                }}>{done ? <Check size={15} /> : m.module_number}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Ayahs {m.ayah_start}–{m.ayah_end}</div>
                  <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>Module {m.module_number} of {modules.length}</div>
                </div>
                <ChevronRight size={16} color={C.faint} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
