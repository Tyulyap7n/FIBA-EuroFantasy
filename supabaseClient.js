// supabaseClient.js
// Глобальный клиент Supabase для всего приложения.
// И одновременно поддержка импорта как модуля

(function () {
  try {
    if (!window.supabase || !window.supabase.createClient) {
      console.error('[Supabase] CDN не загружен до supabaseClient.js');
      return;
    }

    const SUPABASE_URL = 'https://xovxokupvsnnjtskdgvr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdnhva3VwdnNubmp0c2tkZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDk4NjMsImV4cCI6MjA3MDQyNTg2M30.Vl5Z9DABFmHQWGtfbyuAZGGgfX4hDYGAPD8C7fr540E';

    // Если клиент уже создан, не создаём заново
    if (!window._supabaseClient) {
      const createClient = window.supabase.createClient;
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Сохраняем в window и отдельной переменной для модулей
      window.supabase = client;
      window._supabaseClient = client;

      console.debug('[Supabase] Клиент создан');
    }
  } catch (err) {
    console.error('[Supabase] Ошибка инициализации клиента:', err);
  }
})();

// Дополнительно для модульного импорта
export const supabase = window._supabaseClient;
