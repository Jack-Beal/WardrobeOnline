// Initialise the Supabase client.
// Depends on: config.js (must be loaded first), @supabase/supabase-js CDN

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
