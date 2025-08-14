// supabaseClient.js
// Глобальный клиент Supabase — убедитесь, что <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// подключён **перед** этим файлом.

(function () {
  if (typeof supabase === "undefined") {
    console.error("Supabase SDK не найден. Убедитесь, что CDN <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"></script> подключён перед supabaseClient.js");
    return;
  }

  const SUPABASE_URL = 'https://xovxokupvsnnjtskdgvr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdnhva3VwdnNubmp0c2tkZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDk4NjMsImV4cCI6MjA3MDQyNTg2M30.Vl5Z9DABFmHQWGtfbyuAZGGgfX4hDYGAPD8C7fr540E';

  try {
    window.supabase = window.supabase || supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.debug("Supabase client created");
  } catch (err) {
    console.error("Ошибка создания Supabase client:", err);
  }
})();
