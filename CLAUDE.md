# Wardrobe PWA — Project Spec & Build Checklist

You are building a digital wardrobe PWA called "Wardrobe". Work through the checklist below one feature at a time. When you finish a feature, mark it as done in this file with [x] and stop. Wait for the user to say "next" before moving on. If the user says "skip", mark it [skip] and move to the next one.

---

## Stack
- Vanilla HTML/CSS/JS only — no frameworks, no build tools, no npm
- Supabase JS client (via CDN) for database, storage, and auth
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
  config.js          SUPABASE_URL, SUPABASE_ANON_KEY (gitignored)
  supabase.js        supabase client init
  auth.js            login/signup logic
  app.js             tab routing, nav, shared state
  wardrobe.js        wardrobe tab
  outfits.js         outfits tab
  plan.js            planner tab
  stats.js           stats tab
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
- Cards: 14px border-radius
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
  brand text,
  care_notes text,
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
```

Enable RLS on all tables. Each table needs a policy: authenticated users can only SELECT/INSERT/UPDATE/DELETE their own rows where `user_id = auth.uid()`.

---

## Colour options
The colour field is always a `<select>` dropdown — never a free-text input. Use exactly these options:

```
Black, White, Grey, Navy, Blue, Light Blue, Green, Khaki, Olive,
Brown, Tan, Beige, Cream, Red, Burgundy, Pink, Purple, Orange, Yellow, Multicolour
```

---

## Key constraints
- No photos — items have no image_url field, no file uploads, no Supabase Storage
- No season — items have no season field, no season filter anywhere
- Colour is always a dropdown select, never free-text
- No AI integration — Feature 6 is skipped

---

## Build checklist

Work through these one at a time. Mark [x] when done, stop, and wait for "next".

### [x] Feature 1 — Project scaffold & design system

### [x] Feature 2 — Auth

### [x] Feature 3 — Wardrobe tab: display & filters

### [x] Feature 4 — Wardrobe tab: add & edit items

### [x] Feature 5 — Outfits tab: display & create

### [skip] Feature 6 — AI outfit rating

### [x] Feature 7 — Plan tab: calendar

### [x] Feature 8 — Bug fixes
Fix all of the following in one go:

**app.html**
- Remove the season `<select>` from the secondary filters section
- Replace the colour `<input type="text">` in the add/edit item form with a `<select>` using the colour options listed above
- Remove the "Season" row from the item detail overlay
- Remove the photo upload `<div class="form-group">` block (file input, preview image) from the item form
- Remove `detail-photo`, `detail-photo-placeholder`, and the back-button wrapper `<div style="position:relative">` from the item detail overlay — replace with a simple emoji placeholder `<div class="item-detail-icon" id="detail-icon">` at the top of item-detail-content

**wardrobe.js**
- Remove `activeSeason`, all season filter logic, and the `filter-season` event listener
- Remove season from form validation and the submit payload
- Remove `populateSecondaryFilterOptions` season block
- Replace colour `<input>` handling in `openItemModal` and submit with `<select>` value
- Remove `uploadedImageUrl`, `isSubmittingItem` photo branch, `compressImage` function, and all storage upload code
- Remove `image_url` from the insert/update payload
- Update `buildItemCard`: remove photo `<img>` branch — cards always show the emoji placeholder
- Update `openItemDetail`: remove `detail-photo`/`detail-photo-placeholder` logic; set `detail-icon` to `categoryEmoji(item.category)`; remove the Season row population
- Update `detail-delete-btn` handler: remove the storage image deletion block

**outfits.js**
- Remove all `image_url` / photo thumbnail references from `buildOutfitCard` and `populateItemPicker`
- Outfit thumbnails always use `outfit-thumb-placeholder` with `categoryEmoji`
- Item picker cards always use the `.item-picker-placeholder` emoji div, never an `<img>`

**plan.js**
- Remove all `image_url` / photo thumbnail references from `openDayDetail` and `populatePlanItemPicker`
- All thumbnails use emoji placeholders only

**supabase/schema.sql**
- Remove `season`, `image_url` columns from items table
- Remove `ai_rating`, `ai_feedback` columns from outfits table
- Remove trips and trip_days tables and their RLS policies
- Remove the Storage bucket section comment

### [x] Feature 9 — Edit & delete outfits
- Each outfit card gets an edit (✏️) and delete (🗑) icon button in the top-right corner of the card
- Edit: opens a modal pre-filled with the outfit name and currently selected items; user can rename and change item selection; save calls Supabase update on the outfits row; reload the outfits grid
- Delete: shows a confirm prompt, then deletes the row from Supabase; reload the outfits grid

### [x] Feature 10 — Log individual items as worn
- On the item detail view, add a "Worn today" button below the existing edit/delete action row
- Tapping it: increments wear_count by 1, sets last_worn to today's date in Supabase, updates the matching item in the local allItems cache, and shows "✓ Logged!" briefly on the button before resetting
- No outfit_log entry needed — this is a quick single-item wear log only

### [x] Feature 11 — Laundry status filter
- Add a laundry `<select>` to the secondary filters in app.html alongside the colour and brand selects
- Options: `<option value="">All statuses</option>`, Clean, Dirty, In wash (values: clean, dirty, washing)
- Wire up in wardrobe.js as `activeLaundry`; filter items where `item.laundry_status === activeLaundry` when set
- Works alongside the existing category, colour, and brand filters

### [x] Feature 12 — Weather & outfit suggestions
- Implement `js/weather.js`
- Fetch from Open-Meteo on wardrobe tab load: `https://api.open-meteo.com/v1/forecast?latitude=56.462&longitude=-2.9707&current=temperature_2m,weathercode&timezone=Europe/London`
- Show weather strip at top of wardrobe tab: temperature, condition text, weather emoji. Silently fail if fetch fails.
- "Suggest outfit" button → logic: if temp <8°C prioritise items with category Outerwear; if 8–15°C suggest a Top + Bottom + Outerwear combo; if >15°C suggest Top + Bottom; if rain (weathercode 51–67) add a note flagging waterproof items. Pick matching items from allItems and display the suggestion in a simple modal showing item names and category badges.
- "Shop my wardrobe" button → modal with a colour dropdown (the standard colour list) and category chip filters; shows matching items from allItems as a simple list of name + category badge

### [ ] Feature 13 — Stats tab
- Implement `js/stats.js`
- Summary metric cards at top: total items, total outfits, total outfit logs this month
- Most worn: top 5 items by wear_count, shown as a ranked list with item name, category badge, and wear count
- Forgotten items: items where wear_count = 0 or last_worn > 60 days ago — shown as a list with a nudge message
- Haven't worn in 30 days: separate list
- Style stats section: most worn colour, most worn category, most worn brand — each as a horizontal CSS bar chart (no library)
- Outfit history: compact month calendar view with dots on days that have outfit_log entries
- "Export PDF" button at the bottom that calls `exportWardrobePDF()` from pdf.js

### [ ] Feature 14 — PDF export
- Implement `js/pdf.js` using jsPDF from CDN: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- Expose a global `exportWardrobePDF()` function called by the Stats tab button
- PDF contents: title "My Wardrobe Export — [date]", subtitle "Generated for AI analysis", items grouped by category, each item on its own line: name · colour · brand · worn N× · care notes
- Trigger browser download on generation

### [ ] Feature 15 — PWA polish & README
- Verify manifest.json is complete with correct start_url, icons, theme_color
- Generate icon.png (192x192, solid #4a5e3a background, white 👗 emoji centred) using an HTML canvas script — save to root
- Add any missing PWA meta tags to index.html and app.html
- Write README.md: Supabase project setup, how to run schema.sql, how to fill in config.js from config.example.js, GitHub Pages deployment steps, how to add to iPhone home screen, security note about never committing config.js

---

## Key implementation notes
- No ES modules — use globally scoped functions and objects, load scripts in order via `<script>` tags
- Supabase CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- All Supabase queries filter by `user_id: (await supabase.auth.getUser()).data.user.id`
- config.js is gitignored — user fills it in manually after cloning
- Keep all JS files focused on their single responsibility
- The app is single-user — no sharing, no multi-user features
- No photos, no image_url, no Supabase Storage — item cards use categoryEmoji placeholders only
- No season field anywhere in the app
- Colour is always a dropdown select using the fixed colour list above