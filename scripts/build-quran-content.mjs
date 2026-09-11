// Fetches real Quran content from verified, no-auth-required public sources
// (never generated/paraphrased from memory) and emits a SQL seed file.
//
// Sources (all confirmed working during planning, see the approved plan):
//   - Arabic (Uthmani) + Saheeh International translation:
//     https://api.quran.com/api/v4/verses/by_chapter/{n}?translations=20&fields=text_uthmani
//   - Chapter metadata: https://api.quran.com/api/v4/chapters?language=en
//   - Tafsir (Ibn Kathir, Ma'arif al-Qur'an, Jalalayn), one consistent
//     free/no-auth mirror: https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/{slug}/{surah}.json
//
// Module-chunking rule: a surah with <=11 ayahs is one module; otherwise
// consecutive chunks of 11, last chunk is the remainder (1-11 ayahs).
//
// Usage: node scripts/build-quran-content.mjs 78 114   (surah range, inclusive)
//        node scripts/build-quran-content.mjs           (defaults to 1 114 -- the whole Quran)

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [, , fromArg, toArg] = process.argv;
const FROM = parseInt(fromArg || "1", 10);
const TO = parseInt(toArg || "114", 10);

const TAFSIR_SLUGS = {
  ibn_kathir: "en-tafisr-ibn-kathir",
  maarif_ul_quran: "en-tafsir-maarif-ul-quran",
  jalalayn: "en-al-jalalayn",
};

const CHUNK_SIZE = 11;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function moduleRanges(totalAyahs) {
  if (totalAyahs <= CHUNK_SIZE) return [{ moduleNumber: 1, start: 1, end: totalAyahs }];
  const ranges = [];
  let start = 1;
  let n = 1;
  while (start <= totalAyahs) {
    const end = Math.min(start + CHUNK_SIZE - 1, totalAyahs);
    ranges.push({ moduleNumber: n, start, end });
    start = end + 1;
    n++;
  }
  return ranges;
}

async function main() {
  console.log(`Fetching chapters metadata...`);
  const chaptersRes = await fetchJson("https://api.quran.com/api/v4/chapters?language=en");
  const chapters = chaptersRes.chapters;

  const outDir = join(process.cwd(), "supabase", "seed-parts");
  mkdirSync(outDir, { recursive: true });

  const surahLines = [];
  const moduleLines = [];
  const ayahLines = [];
  const tafsirLines = [];

  for (let n = FROM; n <= TO; n++) {
    const chapter = chapters.find((c) => c.id === n);
    if (!chapter) { console.warn(`No chapter metadata for surah ${n}, skipping`); continue; }
    const totalAyahs = chapter.verses_count;
    console.log(`Surah ${n} (${chapter.name_simple}, ${totalAyahs} ayahs)...`);

    surahLines.push(
      `(${n}, '${sqlEscape(chapter.name_arabic)}', '${sqlEscape(chapter.name_simple)}', '${sqlEscape(chapter.translated_name.name)}', '${chapter.revelation_place === "makkah" ? "meccan" : "medinan"}', ${totalAyahs})`
    );

    // Arabic + translation, paginated (API caps per_page, so loop until we have them all)
    const ayahsBySurah = [];
    let page = 1;
    while (true) {
      const data = await fetchJson(
        `https://api.quran.com/api/v4/verses/by_chapter/${n}?translations=20&fields=text_uthmani&per_page=50&page=${page}`
      );
      ayahsBySurah.push(...data.verses);
      if (!data.pagination || !data.pagination.next_page) break;
      page = data.pagination.next_page;
    }

    // Tafsir, one file per source per surah -- keyed by ayah number
    const tafsirBySource = {};
    for (const [source, slug] of Object.entries(TAFSIR_SLUGS)) {
      const data = await fetchJson(`https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${slug}/${n}.json`);
      // This mirror is inconsistent: some files are a bare array of
      // {ayah, surah, text}, others wrap it as {ayahs: [...]}. Handle both.
      const list = Array.isArray(data) ? data : data.ayahs;
      const byAyah = {};
      for (const a of list) byAyah[a.ayah] = a.text;
      tafsirBySource[source] = byAyah;
      await sleep(100);
    }

    const ranges = moduleRanges(totalAyahs);
    for (const { moduleNumber, start, end } of ranges) {
      const modKey = `mod_${n}_${moduleNumber}`;
      moduleLines.push({ key: modKey, sql: `((select id from _modkey), ${n}, ${moduleNumber}, ${start}, ${end})`, n, moduleNumber, start, end });

      for (let ayahNum = start; ayahNum <= end; ayahNum++) {
        const verse = ayahsBySurah.find((v) => v.verse_number === ayahNum);
        if (!verse) { console.warn(`  missing ayah ${n}:${ayahNum}`); continue; }
        const arabic = verse.text_uthmani;
        const translation = verse.translations?.[0]?.text?.replace(/<sup[^>]*>.*?<\/sup>/g, "") || "";
        ayahLines.push({ modKey, n, ayahNum, arabic, translation });
      }

      for (const source of Object.keys(TAFSIR_SLUGS)) {
        // This mirror stores one commentary block per ayah even when a single
        // block of prose actually covers several consecutive ayahs together --
        // it just copy-pastes the identical text onto every ayah in that span.
        // Concatenating naively (as an earlier version of this script did)
        // multiplied that duplication, inflating some entries to 90,000+
        // characters. Collapse consecutive identical blocks into one, labeled
        // with the ayah range it actually covers.
        const blocks = [];
        for (let ayahNum = start; ayahNum <= end; ayahNum++) {
          const text = tafsirBySource[source][ayahNum];
          if (!text) continue;
          const last = blocks[blocks.length - 1];
          if (last && last.text === text) last.ayahEnd = ayahNum;
          else blocks.push({ ayahStart: ayahNum, ayahEnd: ayahNum, text });
        }
        const body = blocks
          .map((b) => {
            const label = b.ayahStart === b.ayahEnd ? `${n}:${b.ayahStart}` : `${n}:${b.ayahStart}-${b.ayahEnd}`;
            return `[${label}] ${b.text}`;
          })
          .join("\n\n");
        tafsirLines.push({ modKey, source, body });
      }
    }

    await sleep(150);
  }

  // Emit SQL. Modules need their surah's module row id, which needs a
  // stable lookup -- easiest correct approach: insert modules one at a
  // time with an explicit uuid we generate here, then reference that same
  // uuid for ayahs/tafsir, rather than relying on a DB-side subselect.
  const lines = [];
  lines.push("-- Auto-generated by scripts/build-quran-content.mjs -- do not hand-edit.");
  lines.push(`-- Surah range: ${FROM}-${TO}`);
  lines.push("");
  lines.push(`insert into surahs (id, name_arabic, name_transliteration, name_translation, revelation_place, total_ayahs) values`);
  lines.push(surahLines.join(",\n") + "\non conflict (id) do nothing;");
  lines.push("");

  const moduleIdFor = {};
  for (const m of moduleLines) {
    moduleIdFor[m.key] = crypto.randomUUID();
  }

  lines.push("insert into modules (id, surah_id, module_number, ayah_start, ayah_end) values");
  lines.push(
    moduleLines.map((m) => `('${moduleIdFor[m.key]}', ${m.n}, ${m.moduleNumber}, ${m.start}, ${m.end})`).join(",\n") +
      "\non conflict (surah_id, module_number) do nothing;"
  );
  lines.push("");

  lines.push("insert into ayahs (module_id, surah_id, ayah_number, arabic_text, translation_text) values");
  lines.push(
    ayahLines
      .map((a) => `('${moduleIdFor[a.modKey]}', ${a.n}, ${a.ayahNum}, '${sqlEscape(a.arabic)}', '${sqlEscape(a.translation)}')`)
      .join(",\n") + "\non conflict (surah_id, ayah_number) do nothing;"
  );
  lines.push("");

  lines.push("insert into tafsir_entries (module_id, source, body_text) values");
  lines.push(
    tafsirLines
      .map((t) => `('${moduleIdFor[t.modKey]}', '${t.source}', '${sqlEscape(t.body)}')`)
      .join(",\n") + "\non conflict (module_id, source) do nothing;"
  );
  lines.push("");

  const outFile = join(outDir, `content_${FROM}_${TO}.sql`);
  writeFileSync(outFile, lines.join("\n"));
  console.log(`\nWrote ${outFile}`);
  console.log(`Surahs: ${surahLines.length}, Modules: ${moduleLines.length}, Ayahs: ${ayahLines.length}, Tafsir rows: ${tafsirLines.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
