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

## Categories
The `category` field uses a two-level system: a top-level group and a specific subcategory. The `category` column stores the **subcategory** value (e.g. "Hoodie", "Jeans"). The top-level group is used only for display grouping in filters and chips.

**Category structure:**

| Group | Subcategories |
|---|---|
| Outerwear | Windbreaker, Coat |
| Jumpers & Hoodies | Knitwear, Jumper, Hoodie |
| Tops | T-Shirt, Graphic Tee, Shirt |
| Bottoms | Joggers, Jeans, Cargos, Other Bottoms |
| Shoes | Trainers, Boots, Formal Shoes, Sandals, Slippers |
| Accessories | Cap, Beanie, Scarf, Belt, Bag, Watch, Sunglasses, Jewellery |

**The add/edit item form** uses a grouped `<select>` with `<optgroup label="Group Name">` for each group, with subcategories as `<option>` values. The saved value is the subcategory.

**The category filter chips** on the wardrobe tab filter by group — selecting "Tops" shows all items whose subcategory belongs to the Tops group. Chips: All · Outerwear · Jumpers & Hoodies · Tops · Bottoms · Shoes · Accessories.

**`CATEGORY_GROUPS` constant in app.js** — maps every subcategory to its group:
```js
const CATEGORY_GROUPS = {
  'Windbreaker': 'Outerwear', 'Coat': 'Outerwear',
  'Knitwear': 'Jumpers & Hoodies', 'Jumper': 'Jumpers & Hoodies', 'Hoodie': 'Jumpers & Hoodies',
  'T-Shirt': 'Tops', 'Graphic Tee': 'Tops', 'Shirt': 'Tops',
  'Joggers': 'Bottoms', 'Jeans': 'Bottoms', 'Cargos': 'Bottoms', 'Other Bottoms': 'Bottoms',
  'Trainers': 'Shoes', 'Boots': 'Shoes', 'Formal Shoes': 'Shoes', 'Sandals': 'Shoes', 'Slippers': 'Shoes',
  'Cap': 'Accessories', 'Beanie': 'Accessories', 'Scarf': 'Accessories', 'Belt': 'Accessories',
  'Bag': 'Accessories', 'Watch': 'Accessories', 'Sunglasses': 'Accessories', 'Jewellery': 'Accessories',
};
```

**`categoryEmoji(category)` in app.js** — maps every subcategory to an emoji:
```js
function categoryEmoji(category) {
  const map = {
    'Windbreaker': '🧥', 'Coat': '🧥',
    'Knitwear': '🧶', 'Jumper': '🧡', 'Hoodie': '👕',
    'T-Shirt': '👕', 'Graphic Tee': '👕', 'Shirt': '👔',
    'Joggers': '👖', 'Jeans': '👖', 'Cargos': '👖', 'Other Bottoms': '👖',
    'Trainers': '👟', 'Boots': '🥾', 'Formal Shoes': '👞', 'Sandals': '🩴', 'Slippers': '🩴',
    'Cap': '🧢', 'Beanie': '🎩', 'Scarf': '🧣', 'Belt': '👔',
    'Bag': '👜', 'Watch': '⌚', 'Sunglasses': '🕶', 'Jewellery': '💍',
  };
  return map[category] || '👗';
}
```

**Weather suggestion logic** should treat these groups as warm/layering/light:
- Outerwear group → prioritised when temp < 8°C or raining
- Jumpers & Hoodies group → included when temp 8–15°C
- Tops + Bottoms → always included in suggestions

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
- No trips — all trips/packing list code in plan.js, app.html, and style.css must be removed

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

### [x] Feature 8 — Bug fixes (season, photos, colour dropdown)

### [x] Feature 9 — Edit & delete outfits

### [x] Feature 10 — Log individual items as worn

### [x] Feature 11 — Laundry status filter

### [x] Feature 12 — Weather & outfit suggestions

### [ ] Feature 13 — Subcategory refactor
Update the entire codebase to use the two-level category system defined above. Do all of the following in one go:

**app.js**
- Add the `CATEGORY_GROUPS` constant (exact object above)
- Replace `categoryEmoji` with the full subcategory → emoji function above

**app.html**
- Replace the flat category `<select>` in the add/edit item form with a grouped `<select>` using `<optgroup>` for each group and the correct subcategories as `<option>` values (saved value = subcategory name)
- Replace the category filter chips with group-level chips: All · Outerwear · Jumpers & Hoodies · Tops · Bottoms · Shoes · Accessories
- Remove all trips-related modals (create-trip-overlay, trip-detail-overlay, packing-list-overlay) from app.html

**wardrobe.js**
- Update `applyFilters`: when `activeCategory !== 'all'`, filter using `CATEGORY_GROUPS[item.category] === activeCategory`
- Update category chip wiring to use group names instead of old category names

**weather.js**
- Update outfit suggestion logic to use group matching: `CATEGORY_GROUPS[item.category] === 'Outerwear'` etc.

**plan.js**
- Remove all trips code: `loadTrips`, `renderTripsList`, `openTripDetail`, `renderTripDays`, `openTripDayPlan`, `deleteTripHandler`, `generatePackingList`, `openTripDayPlan`, and all trip modal event listeners
- Remove `trips`, `tripPlanContext` state variables
- Remove the trips section from `loadPlan` (the `<div class="trips-section">` block and related event listeners)
- Keep only the calendar and plan outfit modal logic

**style.css**
- Remove all trips-related CSS: `.trips-section`, `.trips-header`, `.trips-header-title`, `.trips-collapse-btn`, `.trips-list-body`, `.trips-empty`, `.trip-card`, `.trip-card-info`, `.trip-card-name`, `.trip-card-dates`, `.modal-sheet-tall`, `.modal-subtitle`, `.trip-day-row`, `.trip-day-date`, `.trip-day-right`, `.trip-day-thumbs`, `.trip-thumb`, `.trip-detail-actions`, `.packing-category`, `.packing-category-title`, `.packing-item`, `.packing-checkbox`, `.packing-item-info`, `.packing-item-name`, `.packing-item-sub`

### [ ] Feature 14 — Stats tab
- Implement `js/stats.js` fully, replacing the placeholder
- Summary metric cards at top: total items, total outfits, total outfit logs this month
- Most worn: top 5 items by wear_count, shown as a ranked list with emoji, item name, subcategory badge, wear count
- Forgotten items: items where wear_count = 0 or last_worn > 60 days ago — shown as a list with a nudge message
- Haven't worn in 30 days: separate list
- Style stats: most worn colour, most worn subcategory, most worn brand — each as a horizontal CSS bar chart (no library); bar widths as percentage of max value
- Outfit history: compact current-month calendar view with dots on days that have outfit_log entries; no month navigation needed
- "Export PDF" button at bottom that calls `exportWardrobePDF()`

### [ ] Feature 15 — PDF export
- Implement `js/pdf.js` fully
- Expose a global `exportWardrobePDF()` function
- PDF: title "My Wardrobe Export — [date]", subtitle "Generated for AI analysis", items grouped by subcategory, each item: name · colour · brand · worn N× · care notes
- Trigger browser download on generation

### [ ] Feature 16 — PWA polish & README
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
- No trips — remove all trips/packing list code from plan.js, app.html, and style.css