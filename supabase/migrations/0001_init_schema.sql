-- Quran App revamp: ayah-level modules (~11 ayahs each; a surah with <=11
-- ayahs is one module, never padded/split to force exactly 11) replacing
-- the old whole-surah-summary content model. See the approved plan for the
-- full rationale (lazy-popping-hearth.md in this session's history).

create table surahs (
  id int primary key,                  -- 1-114
  name_arabic text not null,
  name_transliteration text not null,
  name_translation text not null,
  revelation_place text not null check (revelation_place in ('meccan','medinan')),
  total_ayahs int not null
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  surah_id int not null references surahs(id),
  module_number int not null,          -- 1-based within the surah
  ayah_start int not null,
  ayah_end int not null,
  unique (surah_id, module_number)
);

create table ayahs (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  surah_id int not null references surahs(id),
  ayah_number int not null,             -- position within the surah
  arabic_text text not null,
  translation_text text not null,       -- Saheeh International
  unique (surah_id, ayah_number)
);

-- Three labeled tafsir excerpts per module -- never blended, so nothing is
-- misattributed to a scholar who didn't write it.
create table tafsir_entries (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  source text not null check (source in ('ibn_kathir','maarif_ul_quran','jalalayn')),
  body_text text not null,
  unique (module_id, source)
);

create table module_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  prompt text not null,
  options jsonb not null,               -- ["...", "...", "...", "..."]
  correct_index int not null,
  explanation text
);

alter table surahs enable row level security;
alter table modules enable row level security;
alter table ayahs enable row level security;
alter table tafsir_entries enable row level security;
alter table module_quiz_questions enable row level security;
create policy "public read" on surahs for select using (true);
create policy "public read" on modules for select using (true);
create policy "public read" on ayahs for select using (true);
create policy "public read" on tafsir_entries for select using (true);
create policy "public read" on module_quiz_questions for select using (true);

-- Per-user, module-granularity progress (finer than the old per-surah row --
-- old user_progress data is not migrated, there's no meaningful mapping from
-- "5 sections viewed on the old whole-surah page" to "which new module").
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table user_module_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  completed_at timestamptz,
  quiz_score int,
  quiz_total int,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

alter table profiles enable row level security;
alter table user_module_progress enable row level security;
create policy "own profile rw" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own progress rw" on user_module_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
