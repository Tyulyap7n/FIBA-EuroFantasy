// supabaseClient.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const SUPABASE_URL = 'https://xovxokupvsnnjtskdgvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdnhva3VwdnNubmp0c2tkZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDk4NjMsImV4cCI6MjA3MDQyNTg2M30.Vl5Z9DABFmHQWGtfbyuAZGGgfX4hDYGAPD8C7fr540E';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase client initialized:", supabase);