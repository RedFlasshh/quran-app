"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, HelpCircle } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { C, TAFSIR_LABEL } from "../../../lib/theme";
import Header from "../../../components/Header";

export default function ModulePage() {
  const { id } = useParams();
  const router = useRouter();
  const [module, setModule] = useState(null);
  const [surah, setSurah] = useState(null);
  const [ayahs, setAyahs] = useState([]);
  const [tafsirs, setTafsirs] = useState([]);
  const [openTafsir, setOpenTafsir] = useState(null);
  const [siblingModules, setSiblingModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: mod } = await supabase.from("modules").select("*").eq("id", id).maybeSingle();
      if (!mod) { setLoading(false); return; }
      setModule(mod);

      const [{ data: s }, { data: ay }, { data: taf }, { data: sibs }] = await Promise.all([
        supabase.from("surahs").select("*").eq("id", mod.surah_id).maybeSingle(),
        supabase.from("ayahs").select("*").eq("module_id", mod.id).order("ayah_number"),
        supabase.from("tafsir_entries").select("*").eq("module_id", mod.id),
        supabase.from("modules").select("id, module_number").eq("surah_id", mod.surah_id).order("module_number"),
      ]);
      setSurah(s);
      setAyahs(ay || []);
      setTafsirs(taf || []);
      setSiblingModules(sibs || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div style={{ background: C.bg, minHeight: "100vh" }}><Header /><div style={{ textAlign: "center", color: C.faint, padding: 40 }}>Loading…</div></div>;
  if (!module || !surah) return <div style={{ background: C.bg, minHeight: "100vh" }}><Header /><div style={{ textAlign: "center", color: C.faint, padding: 40 }}>Module not found.</div></div>;

  const idx = siblingModules.findIndex((m) => m.id === module.id);
  const prevModule = idx > 0 ? siblingModules[idx - 1] : null;
  const nextModule = idx >= 0 && idx < siblingModules.length - 1 ? siblingModules[idx + 1] : null;
  const tafsirOrder = ["ibn_kathir", "maarif_ul_quran", "jalalayn"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ivory }}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 18px calc(100px + env(safe-area-inset-bottom))" }}>
        <Link href={`/surah/${surah.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.faint, fontSize: 13, textDecoration: "none", marginBottom: 10 }}>
          <ChevronLeft size={14} /> {surah.name_transliteration}
        </Link>
        <div style={{ fontSize: 12, color: C.faint, marginBottom: 18 }}>
          Module {module.module_number} of {siblingModules.length} · Ayahs {module.ayah_start}–{module.ayah_end}
        </div>

        {ayahs.map((a) => (
          <div key={a.id} style={{ borderBottom: `1px solid ${C.line}`, padding: "18px 0" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: C.surface2, color: C.gold, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 3 }}>
                {a.ayah_number}
              </div>
              <div style={{ flex: 1 }}>
                <div className="amiri" style={{ fontSize: 22, color: C.goldBright, lineHeight: 2, direction: "rtl", textAlign: "right", marginBottom: 8 }}>
                  {a.arabic_text}
                </div>
                <div style={{ fontSize: 14, color: C.ivory, lineHeight: 1.6 }}>{a.translation_text}</div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint, marginBottom: 10 }}>Tafsir</div>
          {tafsirOrder.map((source) => {
            const entry = tafsirs.find((t) => t.source === source);
            if (!entry) return null;
            const open = openTafsir === source;
            return (
              <div key={source} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
                <button onClick={() => setOpenTafsir(open ? null : source)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", color: C.ivory, padding: "13px 15px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  {TAFSIR_LABEL[source]}
                  <ChevronDown size={16} color={C.faint} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </button>
                {open && (
                  <div style={{ padding: "0 15px 16px", fontSize: 13.5, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>
                    {entry.body_text}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={() => router.push(`/module/${module.id}/quiz`)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: C.gold, color: "#1B1508", fontWeight: 700, border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 15, cursor: "pointer", marginTop: 22 }}>
          <HelpCircle size={18} /> Take the quiz
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, gap: 10 }}>
          {prevModule ? (
            <Link href={`/module/${prevModule.id}`} style={{ flex: 1, textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", padding: "10px 0", border: `1px solid ${C.line}`, borderRadius: 10, color: C.muted, fontSize: 13 }}>
                <ChevronLeft size={14} /> Previous
              </div>
            </Link>
          ) : <div style={{ flex: 1 }} />}
          {nextModule ? (
            <Link href={`/module/${nextModule.id}`} style={{ flex: 1, textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", padding: "10px 0", border: `1px solid ${C.line}`, borderRadius: 10, color: C.muted, fontSize: 13 }}>
                Next <ChevronRight size={14} />
              </div>
            </Link>
          ) : <div style={{ flex: 1 }} />}
        </div>
      </div>
    </div>
  );
}
