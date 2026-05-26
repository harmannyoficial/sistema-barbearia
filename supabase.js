/* ===============================
   SUPABASE CONFIG
================================= */

const SUPABASE_URL = "https://kwnevbyiqngozwddnrho.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bmV2YnlpcW5nb3p3ZGRucmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMzA3NzcsImV4cCI6MjA5NDcwNjc3N30.em81QLD-7mH1yeWRVaywh32haghKnw3bEVjBvBupnbE";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);








