// Data layer for the Quran app.
//
// Why this exists: once this ships as an Android/iOS app via Capacitor,
// the app needs to work with no signal (train, flight, weak connection).
// So the flow is:
//   1. Try Supabase (gets the latest content, and lets you push fixes
//      without an app-store re-review).
//   2. If that fails, use whatever was cached locally from the last
//      successful fetch.
//   3. If there's no cache either (first-ever launch, fully offline),
//      fall back to the bundled data.js snapshot so the app never shows
//      a blank screen.

const CACHE_KEY = 'quran_app_surah_cache_v1';

async function loadSurahData() {
    try {
          const res = await fetch(SUPABASE_URL + '/rest/v1/surahs?select=*', {
                  headers: {
                            apikey: SUPABASE_ANON_KEY,
                            Authorization: 'Bearer ' + SUPABASE_ANON_KEY
                  }
          });
          if (!res.ok) throw new Error('Supabase request failed: ' + res.status);
          const rows = await res.json();
          if (!rows.length) throw new Error('Supabase returned no rows');

      const data = {};
          rows.forEach(r => {
                  data[r.n] = {
                            ar: r.arabic,
                            translit: r.translit,
                            meaning: r.meaning,
                            verses: r.verses,
                            type: r.type,
                            snapshot: r.snapshot,
                            facts: r.facts,
                            key: r.key_knowledge,
                            respect: r.respect,
                            quiz: r.quiz
                  };
          });

      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          return { data, source: 'live' };
    } catch (err) {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
                  return { data: JSON.parse(cached), source: 'cache' };
          }
          if (typeof surahData !== 'undefined') {
                  return { data: surahData, source: 'bundled' };
          }
          throw err;
    }
}
