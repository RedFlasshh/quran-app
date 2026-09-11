// One-off fix: re-derives tafsir_entries.body_text for already-seeded
// modules using deduped logic (see build-quran-content.mjs's comment on
// this), and emits UPDATE statements keyed by each module's real
// database id -- read from scripts/.modules-<range>.json, dumped
// beforehand via:
//   psql "$CONN" -t -A -c "select json_agg(row_to_json(m)) from
//     (select id, surah_id, module_number, ayah_start, ayah_end from
//      modules where surah_id between X and Y order by surah_id,
//      module_number) m;" > scripts/.modules-X-Y.json
//
// Usage: node scripts/fix-tafsir-dedup.mjs 78 114

import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [, , fromArg, toArg] = process.argv;
const FROM = parseInt(fromArg || "1", 10);
const TO = parseInt(toArg || "114", 10);

const TAFSIR_SLUGS = {
  ibn_kathir: "en-tafisr-ibn-kathir",
  maarif_ul_quran: "en-tafsir-maarif-ul-quran",
  jalalayn: "en-al-jalalayn",
};

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
function sqlEscape(s) { return String(s).replace(/'/g, "''"); }

async function main() {
  const modulesFile = join(process.cwd(), "scripts", `.modules-${FROM}-${TO}.json`);
  const allModules = JSON.parse(readFileSync(modulesFile, "utf8"));

  const updates = [];

  for (let n = FROM; n <= TO; n++) {
    const modRows = allModules.filter((m) => m.surah_id === n);
    if (modRows.length === 0) { console.warn(`No modules found for surah ${n}, skipping`); continue; }
    console.log(`Surah ${n}: ${modRows.length} modules`);

    const tafsirBySource = {};
    for (const [source, slug] of Object.entries(TAFSIR_SLUGS)) {
      const data = await fetchJson(`https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${slug}/${n}.json`);
      const list = Array.isArray(data) ? data : data.ayahs;
      const byAyah = {};
      for (const a of list) byAyah[a.ayah] = a.text;
      tafsirBySource[source] = byAyah;
      await sleep(80);
    }

    for (const mod of modRows) {
      for (const source of Object.keys(TAFSIR_SLUGS)) {
        const blocks = [];
        for (let ayahNum = mod.ayah_start; ayahNum <= mod.ayah_end; ayahNum++) {
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
        updates.push(`update tafsir_entries set body_text = '${sqlEscape(body)}' where module_id = '${mod.id}' and source = '${source}';`);
      }
    }
    await sleep(100);
  }

  const outFile = join(process.cwd(), "supabase", "seed-parts", "fix_tafsir_dedup.sql");
  writeFileSync(outFile, updates.join("\n"));
  console.log(`\nWrote ${updates.length} update statements to ${outFile}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
