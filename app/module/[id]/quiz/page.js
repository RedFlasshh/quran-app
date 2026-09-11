"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Check, X as XIcon } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import { C } from "../../../../lib/theme";
import { useAuth } from "../../../../hooks/useAuth";
import Header from "../../../../components/Header";

export default function QuizPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [module, setModule] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]); // [{correct: bool}]
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: mod } = await supabase.from("modules").select("*").eq("id", id).maybeSingle();
      setModule(mod);
      const { data: qs } = await supabase.from("module_quiz_questions").select("*").eq("module_id", id);
      setQuestions(qs || []);
      setLoading(false);
    })();
  }, [id]);

  const score = answers.filter((a) => a.correct).length;

  useEffect(() => {
    if (!finished || saved || !session?.user || !module) return;
    (async () => {
      await supabase.from("user_module_progress").upsert({
        user_id: session.user.id,
        module_id: module.id,
        completed_at: new Date().toISOString(),
        quiz_score: score,
        quiz_total: questions.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,module_id" });
      setSaved(true);
    })();
  }, [finished, saved, session, module, score, questions.length]);

  if (loading) return <div style={{ background: C.bg, minHeight: "100vh" }}><Header /><div style={{ textAlign: "center", color: C.faint, padding: 40 }}>Loading…</div></div>;
  if (!module) return <div style={{ background: C.bg, minHeight: "100vh" }}><Header /><div style={{ textAlign: "center", color: C.faint, padding: 40 }}>Module not found.</div></div>;

  if (questions.length === 0) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.ivory }}>
        <Header />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 18px" }}>
          <Link href={`/module/${module.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.faint, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
            <ChevronLeft size={14} /> Back to reading
          </Link>
          <div style={{ textAlign: "center", color: C.faint, padding: 30, fontSize: 13.5, lineHeight: 1.6 }}>
            No quiz written for this module yet.
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.ivory }}>
        <Header />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 18px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: C.muted, marginTop: 20 }}>Module {module.module_number} quiz</div>
          <div className="display" style={{ fontSize: 44, fontWeight: 700, color: C.goldBright, margin: "10px 0" }}>{score} / {questions.length}</div>
          <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 24 }}>
            {session?.user ? (saved ? "Saved to your progress." : "Saving…") : "Sign in to save this to your progress."}
          </div>
          {questions.map((q, i) => (
            <div key={q.id} style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                {answers[i]?.correct ? <Check size={16} color={C.good} style={{ flexShrink: 0, marginTop: 2 }} /> : <XIcon size={16} color={C.warn} style={{ flexShrink: 0, marginTop: 2 }} />}
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{q.prompt}</div>
              </div>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, paddingLeft: 24 }}>{q.explanation}</div>
            </div>
          ))}
          <Link href={`/surah/${module.surah_id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: C.gold, color: "#1B1508", fontWeight: 700, borderRadius: 12, padding: "13px 0", fontSize: 14.5, marginTop: 16, marginBottom: 30 }}>
              Continue
            </div>
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[step];

  const choose = (i) => {
    if (selected !== null) return;
    setSelected(i);
    setAnswers((prev) => [...prev, { correct: i === q.correct_index }]);
  };

  const next = () => {
    setSelected(null);
    if (step + 1 >= questions.length) setFinished(true);
    else setStep(step + 1);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ivory }}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 18px calc(40px + env(safe-area-inset-bottom))" }}>
        <Link href={`/module/${module.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.faint, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
          <ChevronLeft size={14} /> Back to reading
        </Link>
        <div style={{ fontSize: 12, color: C.faint, marginBottom: 6 }}>Question {step + 1} of {questions.length}</div>
        <div style={{ height: 4, background: C.surface2, borderRadius: 999, overflow: "hidden", marginBottom: 22 }}>
          <div style={{ height: "100%", width: `${((step) / questions.length) * 100}%`, background: C.gold, transition: "width .2s" }} />
        </div>

        <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, marginBottom: 20 }}>{q.prompt}</div>

        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct_index;
          const isSelected = i === selected;
          let bg = C.surface, border = C.line, color = C.ivory;
          if (selected !== null) {
            if (isCorrect) { bg = C.surface2; border = C.good; color = C.good; }
            else if (isSelected) { bg = C.surface2; border = C.warn; color = C.warn; }
          }
          return (
            <button key={i} onClick={() => choose(i)} disabled={selected !== null}
              style={{ width: "100%", textAlign: "left", background: bg, border: `1.5px solid ${border}`, color, borderRadius: 12, padding: "13px 16px", fontSize: 14.5, marginBottom: 10, cursor: selected === null ? "pointer" : "default" }}>
              {opt}
            </button>
          );
        })}

        {selected !== null && (
          <button onClick={next}
            style={{ width: "100%", background: C.gold, color: "#1B1508", fontWeight: 700, border: "none", borderRadius: 12, padding: "13px 16px", fontSize: 15, cursor: "pointer", marginTop: 8 }}>
            {step + 1 >= questions.length ? "See results" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}
