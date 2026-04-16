# Wardrobe

A digital wardrobe PWA built with vanilla HTML/CSS/JS and Supabase.

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Once the project is ready, open the **SQL Editor** in the Supabase dashboard.
3. Paste and run the contents of `supabase/schema.sql` to create all tables and enable Row Level Security.

### 2. Configure your credentials

1. Copy the example config file:
   ```
   cp config.example.js js/config.js
   ```
2. Open `js/config.js` and fill in your Supabase project URL and anon key — both are found in **Project Settings → API** in the Supabase dashboard:
   ```js
   const SUPABASE_URL  = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

> **Security note:** `js/config.js` is listed in `.gitignore` and must never be committed to source control. The anon key is safe for client-side use (it is locked to RLS policies), but you should still keep it out of public repositories.

### 3. Run locally

Open `index.html` directly in a browser, or serve the folder with any static file server:

```
npx serve .
# or
python3 -m http.server 8080
```

---

## Deploy to GitHub Pages

1. Push the repository to GitHub (ensure `js/config.js` is not committed).
2. Go to **Settings → Pages** in your GitHub repo.
3. Set the source to **Deploy from a branch**, select `main` and `/ (root)`.
4. GitHub Pages will serve the site at `https://<username>.github.io/<repo>/`.

> `config.js` is gitignored, so you will need to either inject credentials via a CI secret or manually place `config.js` in the deployed branch without committing it to history.

---

## Add to iPhone home screen

1. Open the deployed URL in **Safari** on iOS.
2. Tap the **Share** button (square with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Name it "Wardrobe" and tap **Add**.

The app opens full-screen with no browser chrome, just like a native app.

---

## Project structure

```
index.html        Login / signup page
app.html          Main app shell
manifest.json     PWA manifest
icon.png          192×192 app icon
css/style.css     All styles
js/
  config.js       Your Supabase credentials (gitignored — fill in manually)
  supabase.js     Supabase client init
  auth.js         Login / signup logic
  app.js          Tab routing, shared state, helper functions
  wardrobe.js     Wardrobe tab
  outfits.js      Outfits tab
  plan.js         Planner tab (calendar)
  stats.js        Stats tab
  weather.js      Open-Meteo weather + outfit suggestions
  pdf.js          PDF export via jsPDF
supabase/
  schema.sql      Full database schema with RLS policies
config.example.js Template config (safe to commit)
```
