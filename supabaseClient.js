// supabaseClient.js — robust initializer
(function () {
  const SUPABASE_URL = 'https://xovxokupvsnnjtskdgvr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdnhva3VwdnNubmp0c2tkZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDk4NjMsImV4cCI6MjA3MDQyNTg2M30.Vl5Z9DABFmHQWGtfbyuAZGGgfX4hDYGAPD8C7fr540E';

  // Увеличиваем таймаут ожидания
  const WAIT_TIMEOUT = 10000; // 10 секунд
  const POLL_INTERVAL = 50; // 50 мс
  
  function findFactory() {
    // Возвращает { owner: 'supabase'|'Supabase', fn: createClient } или null
    try {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        return { owner: 'supabase', fn: window.supabase.createClient };
      }
      if (window.Supabase && typeof window.Supabase.createClient === 'function') {
        return { owner: 'Supabase', fn: window.Supabase.createClient };
      }
      // некоторые сборки могут экспортировать createClient напрямую (редко)
      if (typeof window.createClient === 'function') {
        return { owner: 'createClient', fn: window.createClient };
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  async function waitForFactory(timeout = WAIT_TIMEOUT, interval = POLL_INTERVAL) {
    const start = Date.now();
    // если уже клиент — ничего не делаем
    if (window.supabase && typeof window.supabase.auth !== 'undefined') {
      return { alreadyClient: true, client: window.supabase };
    }
    while (Date.now() - start < timeout) {
      const f = findFactory();
      if (f) return { alreadyClient: false, factoryOwner: f.owner, factory: f.fn };
      await new Promise((r) => setTimeout(r, interval));
    }
    return null;
  }

  (async function init() {
    try {
      const wait = await waitForFactory();
      if (!wait) {
        console.error('[Supabase] CDN фабрика createClient не обнаружена в window (timeout). Проверь подключение CDN и порядок скриптов.');
        return;
      }

      if (wait.alreadyClient) {
        console.debug('[Supabase] window.supabase уже является клиентом — ничего не делаем.');
        return;
      }

      const { factoryOwner, factory } = wait;
      let client;
      try {
        client = factory(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (e) {
        console.error('[Supabase] Ошибка при вызове createClient():', e);
        return;
      }

      // Перезаписываем window.supabase клиентом (унифицируем)
      window.supabase = client;

      console.debug('[Supabase] Клиент создан через', factoryOwner, client);
      // Флаг для отладки
      window.__supabaseClientInitialized = true;
    } catch (err) {
      console.error('[Supabase] Неожиданная ошибка инициализации:', err);
    }
  })();
})();
