// supabaseClient.js
// Глобальный клиент Supabase для всего приложения.
// ВАЖНО: window.supabase из CDN — это неймспейс с createClient.
// Ниже мы ПРЕОБРАЗУЕМ window.supabase в сам клиент, чтобы везде работало supabase.auth...

(function () {
  try {
    if (!window.supabase || !window.supabase.createClient) {
      console.error('[Supabase] CDN не загружен до supabaseClient.js');
      return;
    }

    const SUPABASE_URL = 'https://xovxokupvsnnjtskdgvr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdnhva3VwdnNubmp0c2tkZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDk4NjMsImV4cCI6MjA3MDQyNTg2M30.Vl5Z9DABFmHQWGtfbyuAZGGgfX4hDYGAPD8C7fr540E';

    // сохраняем ссылку на фабрику, создаём клиент и ПЕРЕЗАПИСЫВАЕМ window.supabase клиентом
    const createClient = window.supabase.createClient;
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // теперь во всём коде supabase === клиент
    window.supabase = client;

    console.debug('[Supabase] Клиент создан');
  } catch (err) {
    console.error('[Supabase] Ошибка инициализации клиента:', err);
  }
})();
