// auth.js — регистрация и вход с реальной авторизацией в Supabase
// Этот файл безопасно ждёт появления window.supabase (если SDK/клиент загружаются чуть позже).

(function () {
  const MAX_RETRIES = 40;
  const RETRY_INTERVAL = 100; // ms
  let retries = 0;
  let tryInitInterval = null;

  function initAuth() {
    if (!window.supabase) {
      retries++;
      if (retries === 1) console.warn("supabase ещё не инициализирован, ожидаю...");
      if (retries > MAX_RETRIES) {
        clearInterval(tryInitInterval);
        console.error("supabase так и не инициализирован. Проверьте порядок скриптов.");
      }
      return;
    }
    clearInterval(tryInitInterval);

    document.addEventListener("DOMContentLoaded", () => {
      const registerForm = document.getElementById("register-form");
      const loginForm = document.getElementById("login-form");

      // Регистрация
      registerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const usernameEl = document.getElementById("register-username");
        const emailEl = document.getElementById("register-email");
        const passwordEl = document.getElementById("register-password");
        const username = usernameEl ? usernameEl.value.trim() : "";
        const email = emailEl ? emailEl.value.trim() : "";
        const password = passwordEl ? passwordEl.value : "";

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
          });

          if (error) {
            console.error("Ошибка регистрации:", error);
            alert("Ошибка регистрации: " + error.message);
            return;
          }

          if (data?.user && !data?.session) {
            alert("Регистрация успешна. На ваш почтовый ящик отправлено письмо подтверждения. После подтверждения войдите.");
            return;
          }

          if (data?.session) {
            window.location.href = "dashboard.html";
            return;
          }

          alert("Регистрация завершена. Проверьте почту для подтверждения (если требуется).");
        } catch (err) {
          console.error("Ошибка при регистрации:", err);
          alert("Ошибка регистрации (см. консоль).");
        }
      });

      // Вход
      loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const emailEl = document.getElementById("login-email");
        const passwordEl = document.getElementById("login-password");
        const email = emailEl ? emailEl.value.trim() : "";
        const password = passwordEl ? passwordEl.value : "";

        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });

          if (error) {
            console.error("Ошибка входа:", error);
            alert("Ошибка входа: " + error.message);
            return;
          }

          if (data?.session) {
            window.location.href = "dashboard.html";
            return;
          }

          console.warn("signInWithPassword вернул no session:", data);
          alert("Вход инициирован, но сессия не создана. Проверьте почту для подтверждения или попробуйте снова.");
        } catch (err) {
          console.error("Ошибка выполнения входа:", err);
          alert("Ошибка входа (см. консоль).");
        }
      });

      // Подписка на изменение статуса
      try {
        supabase.auth.onAuthStateChange((event, session) => {
          console.debug("Auth event:", event, session);
          if (event === "SIGNED_IN" && session) {
            if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname === "/index.html") {
              window.location.href = "dashboard.html";
            }
          }
        });
      } catch (err) {
        console.warn("onAuthStateChange unavailable or failed:", err);
      }
    });
  }

  // пытаемся инициализировать сразу; если supabase ещё не готов — используем интервал
  if (window.supabase) {
    initAuth();
  } else {
    tryInitInterval = setInterval(initAuth, RETRY_INTERVAL);
  }
})();
