# Wardrobe PWA — Project Spec & Build Checklist

You are building a digital wardrobe PWA called "Wardrobe". Work through the checklist below one feature at a time. When you finish a feature, mark it as done in this file with [x] and stop. Wait for the user to say "next" before moving on. If the user says "skip", mark it [skip] and move to the next one.

---

## Stack
- Vanilla HTML/CSS/JS only — no frameworks, no build tools, no npm
- Supabase JS client (via CDN) for database, storage, and auth
- Anthropic API (raw fetch) for AI outfit rating
- Open-Meteo API (free, no key needed) for Dundee weather
- jsPDF (CDN) for PDF export
- Deployable to GitHub Pages as static files — no server needed

---

## File structure
```
index.html           login/signup page
app.html             main app shell (redirect here after login)
manifest.json        PWA manifest
css/
  style.css          all styles
js/
  config.js          SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY (gitignored)
  supabase.js        supabase client init
  auth.js            login/signup logic
  app.js             tab routing, nav, shared state
  wardrobe.js        wardrobe tab
  outfits.js         outfits tab
  plan.js            planner tab
  stats.js           stats tab
  ai.js              Anthropic API calls
  weather.js         Open-Meteo weather fetch
  pdf.js             PDF export
supabase/
  schema.sql         full database schema
config.example.js    template with empty values
.gitignore           ignores config.js
README.md            setup instructions
```

---

## Design system
Apply consistently across all pages and components.

### Colour palette
```
--bg:           #f5f0e8   warm parchment background
--primary:      #4a5e3a   deep forest green
--secondary:    #7a9a5a   mid sage
--accent:       #9ab87a   light sage
--surface:      #efe7d4   warm cream (cards)
--surface-alt:  #e0d8c8   slightly darker surface
--text:         #3a2e1e   dark warm brown
--text-muted:   #7a6a52   mid brown
--clean:        #c8d8a8   laundry clean
--dirty:        #e8c8a8   laundry dirty
--washing:      #a8c8d8   laundry in wash
```

### Typography
- Headings: Georgia, serif
- Body/UI: system-ui, sans-serif
- Mix serif headings with sans-serif UI for editorial feel

### Layout
- Mobile-first, max-width 430px, centred on desktop
- Bottom nav: 4 tabs — Wardrobe, Outfits, Plan, Stats
- Cards: 14px border-radius, 3/4 aspect ratio for clothing photos
- Staggered grid: 3 columns, nth-child(2) gets margin-top: 14px, nth-child(3) gets margin-top: -8px — repeating pattern for eclectic feel
- Subtle paper texture on body: use CSS `background-image` with a repeating noise pattern (pure CSS, no image files)
- Primary button: background #4a5e3a, colour #f5f0e8, border-radius 20px
- Chip/pill filters: active = #4a5e3a bg + #d4e8c2 text, inactive = #e0d8c8 bg + #7a6a52 text

---

## Supabase schema
File: `supabase/schema.sql`

```sql
create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  category text not null,
  colour text not null,
  season text not null,
  brand text,
  care_notes text,
  image_url text,
  laundry_status text default 'clean',
  wear_count integer default 0,
  last_worn date,
  created_at timestamptz default now()
);

create table outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  item_ids uuid[] not null,
  ai_rating numeric,
  ai_feedback text,
  created_at timestamptz default now()
);

create table outfit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  outfit_id uuid references outfits,
  item_ids uuid[],
  worn_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

create table planned_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  outfit_id uuid references outfits,
  item_ids uuid[],
  planned_date date not null,
  created_at timestamptz default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now()
);

create table trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips on delete cascade,
  day_date date not null,
  outfit_id uuid references outfits,
  item_ids uuid[]
);
```

Enable RLS on all tables. Each table needs a policy: authenticated users can only SELECT/INSERT/UPDATE/DELETE their own rows where `user_id = auth.uid()`.

Storage: bucket called `wardrobe-images`, public read access.

---

## Build checklist

Work through these one at a time. Mark [x] when done, stop, and wait for "next".

### [ ] Feature 1 — Project scaffold & design system
- Create all files and folders listed in the file structure above (empty stubs where needed)
- Implement full CSS design system in `css/style.css` including all colour variables, typography, layout base, bottom nav styles, button styles, chip styles, card styles, paper texture background
- Create `index.html` with login/signup form styled to the design system (two views: login and signup, toggle between them)
- Create `app.html` shell with bottom nav bar (4 tabs: Wardrobe, Outfits, Plan, Stats), tab content areas (empty for now), and all script/style tags loaded in correct order
- Create `manifest.json` for PWA
- Create `config.example.js` with empty placeholder values
- Create `.gitignore` ignoring `js/config.js`
- Create `supabase/schema.sql` with the full schema above
- Do NOT create `js/config.js` itself — leave that for the user to fill in

### [ ] Feature 2 — Auth
- Implement `js/supabase.js`: init Supabase client from config values
- Implement `js/auth.js`: login, signup, logout via Supabase Auth
- On `index.html` submit: call Supabase signIn or signUp, redirect to `app.html` on success, show error message on failure
- On `app.html` load: check session via `supabase.auth.getSession()`, redirect to `index.html` if no session
- Add logout button in app header
- Implement `js/app.js`: tab switching logic — show/hide tab panels, highlight active nav item

### [ ] Feature 3 — Wardrobe tab: display & filters
- Implement wardrobe item fetching from Supabase in `js/wardrobe.js`
- Render items as staggered 3-column grid with the design system card style
- Each card: photo (or placeholder if no image), name, category badge, wear count badge, laundry status coloured dot (green=clean, amber=dirty, blue=washing)
- Category filter chips: All / Tops / Bottoms / Shoes / Outerwear / Accessories / Bags
- Collapsible secondary filters: colour, season, brand (dropdowns populated from existing item values)
- Laundry status tap to cycle: clean → dirty → washing → clean (updates Supabase immediately)
- Empty state when no items

### [ ] Feature 4 — Wardrobe tab: add & edit items
- "Add item" floating button (bottom right, above nav)
- Add item modal: fields for name, category (select), colour (text), season (select), brand (text), care notes (textarea), laundry status (select), photo upload
- Photo upload: `<input type="file" accept="image/*" capture="environment">` — upload to Supabase Storage bucket `wardrobe-images`, save public URL to item record
- Tap item card → item detail view (full screen or modal): shows all fields, full photo, wear count, last worn date, care notes
- Edit button on detail view → pre-filled edit modal
- Delete button on detail view → confirmation then delete from Supabase (also delete image from storage)

### [ ] Feature 5 — Outfits tab: display & create
- Fetch outfits from Supabase in `js/outfits.js`
- Render as grid — each outfit card shows overlapping item photo thumbnails (stacked with slight offset), outfit name, AI rating badge if rated
- Create outfit button → modal: search/pick items from wardrobe (show item thumbnails, tap to select/deselect), name the outfit, save
- "Worn today" button on each outfit card → create outfit_log entry, increment wear_count on all items in the outfit, update last_worn to today

### [ ] Feature 6 — AI outfit rating
- Implement `js/ai.js` with a `rateOutfit(outfit, items)` function
- Calls Anthropic API via fetch with header `anthropic-dangerous-direct-browser-access: true`
- Prompt: rate outfit out of 10 and give 2 sentences of honest style feedback like a fashion editor
- Send: outfit name + list of item names, colours, categories
- Parse response, save `ai_rating` and `ai_feedback` to the outfit record in Supabase
- Show rating and feedback on outfit card and detail view
- "Rate with AI" button on each outfit (re-rateable)
- Use model: `claude-sonnet-4-20250514`, max_tokens: 300

### [ ] Feature 7 — Plan tab: calendar
- Implement `js/plan.js`
- Monthly calendar view — current month shown by default, prev/next month navigation
- Fetch planned_outfits for the visible month
- Each day cell shows a small colour dot if an outfit is planned
- Tap a day → day detail panel: shows planned outfit (if any) with item thumbnails, or empty with "Plan outfit" button
- "Plan outfit" → pick from saved outfits or build from individual items → saves to planned_outfits table
- "Mark as worn" button on a planned day → creates outfit_log, updates wear counts, marks day as worn (visual indicator)

### [ ] Feature 8 — Plan tab: trips & packing lists
- Trips section below calendar (collapsible)
- Create trip: name, start date, end date
- Trip detail: day-by-day list between start and end dates, each day can have an assigned outfit (pick from saved outfits or build from items)
- "Generate packing list" button → collects all unique items across all trip days, groups by category, displays as a checklist
- Packing list can be dismissed or exported (plain text copy or included in PDF export)

### [ ] Feature 9 — Weather & outfit suggestions
- Implement `js/weather.js`
- Fetch from Open-Meteo on wardrobe tab load: `https://api.open-meteo.com/v1/forecast?latitude=56.462&longitude=-2.9707&current=temperature_2m,weathercode&timezone=Europe/London`
- Show weather strip at top of wardrobe tab: temperature, condition text, weather icon (CSS-only icon or simple emoji mapping)
- "Suggest outfit" button → filter wardrobe items by season and logic: if temp <8°C prioritise outerwear; if temp 8-15°C suggest layering; if rain (weathercode 51-67) flag waterproof items; pick a suggested combination and display it
- "Shop my wardrobe" button → modal: enter colour and/or category → shows matching items you already own

### [ ] Feature 10 — Stats tab
- Implement `js/stats.js`
- Summary metric cards: total items, total outfits, total outfit logs this month
- Most worn items: top 5 by wear_count, shown as a ranked list with photo thumbnails
- Forgotten items: items with wear_count = 0 or last_worn > 60 days ago — shown with a nudge message
- "Haven't worn in 30 days" list
- Style stats: most worn colour (horizontal bar chart, pure CSS no library), most worn category, most worn brand
- Outfit history calendar: compact month view, dots on days where outfit_logs exist

### [ ] Feature 11 — PDF export
- Implement `js/pdf.js` using jsPDF from CDN: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- "Export wardrobe PDF" button in Stats tab
- PDF contents: title "My Wardrobe Export — [date]", items grouped by category, each item: name, colour, brand, wear count, care notes
- Note at top: "Generated for AI analysis"
- Trigger browser download on generation

### [ ] Feature 12 — PWA polish & README
- Add PWA meta tags to both `index.html` and `app.html`
- Generate a simple `icon.png` (192x192, solid #4a5e3a) using a Python script or canvas — save to root
- Verify manifest.json is complete and correct
- Write `README.md` with: Supabase setup steps, how to run schema.sql, storage bucket setup, how to fill in config.js, GitHub Pages deployment steps, how to add to iPhone home screen (Safari → Share → Add to Home Screen), how to get Anthropic API key, security note about config.js

---

## Key implementation notes
- No ES modules — use globally scoped functions and objects, load scripts in order via `<script>` tags
- Supabase CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- All Supabase queries filter by `user_id: (await supabase.auth.getUser()).data.user.id`
- config.js is gitignored — user fills it in manually after cloning
- Keep all JS files focused on their single responsibility
- The app is single-user — no sharing, no multi-user features
