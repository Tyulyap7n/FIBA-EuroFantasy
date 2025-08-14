// auth.js — регистрация и вход с реальной авторизацией в Supabase
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");

  // маленький хелпер
  const ensureClient = () => {
    if (!window.supabase || !window.supabase.auth) {
      console.error("[Auth] Supabase клиент недоступен. Проверь порядок скриптов (CDN → supabaseClient.js → auth.js).");
      alert("Произошла ошибка инициализации. Обновите страницу. Если не поможет — проверьте подключение Supabase.");
      return false;
    }
    return true;
  };

  // Регистрация
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ensureClient()) return;

    const username = document.getElementById("register-username").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });

      if (error) {
        alert("Ошибка регистрации: " + error.message);
        return;
      }

      alert("Регистрация успешна! Подтвердите email, затем войдите.");
    } catch (err) {
      console.error("Ошибка регистрации:", err);
      alert("Не удалось завершить регистрацию. Попробуйте снова.");
    }
  });

  // Вход
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ensureClient()) return;

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Ошибка входа: " + error.message);
        return;
      }
      // успех — редирект
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Ошибка выполнения входа:", err);
      alert("Не удалось войти. Попробуйте снова.");
    }
  });

  // Безопасно подписываемся на изменения сессии (если доступно)
  try {
    if (window.supabase && window.supabase.auth && typeof window.supabase.auth.onAuthStateChange === "function") {
      supabase.auth.onAuthStateChange((event, session) => {
        console.debug("[Auth] onAuthStateChange:", event);
        if (event === "SIGNED_IN" && session) {
          // если пользователь уже на index — отправим на дашборд
          if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname === "") {
            window.location.href = "dashboard.html";
          }
        }
      });
    } else {
      console.warn("onAuthStateChange недоступен (Supabase клиент ещё не проинициализирован?)");
    }
  } catch (e) {
    console.warn("onAuthStateChange unavailable or failed:", e);
  }
});
