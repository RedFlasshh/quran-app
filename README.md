# Understanding the Quran — Chapter by Chapter

A self-paced learning app covering each Surah of the Quran: snapshot, fun facts,
key knowledge, and respect & adab, with a short personal quiz per chapter.
Built to run as a website now, and wrap into Android/iOS apps later via Capacitor.

## Architecture

- `www/` — the actual app (this is what ships, on web and in the native app)
- - `www/index.html` — chapter directory (all 114 surahs, end to start)
  - - `www/module.html` — shared template rendering any surah via a surah number
    - - `www/config.js` — your Supabase project URL and anon key (fill this in)
      - - `www/data-layer.js` — loads content from Supabase, with automatic offline fallback
        - - `www/data.js` — the bundled offline snapshot (also the migration source for Supabase)
          - - `supabase_seed.sql` — creates the surahs and user_progress tables and loads the current 37-surah dataset
            - - `capacitor.config.json` and `package.json` — Capacitor wrapper config for Android/iOS
             
              - ## Setup
             
              - - Create a Supabase project at supabase.com
                - - Run supabase_seed.sql in the SQL editor there
                  - - Fill in www/config.js with your project URL and anon key
                    - - Open www/index.html in a browser to test
                     
                      - ## Wrapping it as an Android/iOS app (Capacitor)
                     
                      - Needs Xcode and/or Android Studio on your own machine. Run these in order:
                      - npm install, then npx cap add android, then npx cap add ios, then npx cap sync,
                      - then npm run open:android or npm run open:ios.
                     
                      - ## Status
                     
                      - Surahs 114 down to 78, the full Juz Amma, are complete and seeded into Supabase.
                      - Surahs 77 down to 1 are still to follow.
                     
                      - ## Content accuracy
                     
                      - Verse counts and Meccan/Medinan classification follow standard reference sources.
                      - Deeper content should be reviewed by a knowledgeable person before being treated as final.
                      - 
