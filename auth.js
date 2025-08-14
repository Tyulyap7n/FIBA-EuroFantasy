// auth.js — регистрация и вход
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");

  if (!window.supabase) {
    console.error("supabase не инициализирован в auth.js");
    return;
  }

  // Регистрация
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } } // v2: опции внутри объекта
      });

      if (error) {
        console.error("signUp error:", error);
        alert("Ошибка регистрации: " + error.message);
        return;
      }

      // Если нужна подтверждение email — сообщаем пользователю
      if (data?.user && !data?.session) {
        alert("Регистрация успешна. На ваш почтовый ящик отправлено письмо подтверждения. После подтверждения войдите.");
        return;
      }

      // Если сессия сразу вернулась — редиректим
      if (data?.session) {
        window.location.href = "dashboard.html";
      } else {
        alert("Регистрация завершена. Проверьте почту для подтверждения (если требуется).");
      }
    } catch (err) {
      console.error("Ошибка при регистрации:", err);
      alert("Ошибка регистрации (см. консоль).");
    }
  });

  // Вход
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Ошибка входа:", error);
        alert("Ошибка входа: " + error.message);
        return;
      }

      // Если сессия есть — сразу редиректим
      if (data?.session) {
        window.location.href = "dashboard.html";
        return;
      }

      // Если сессии нет, но нет ошибки — сообщаем пользователю (например, требуется подтверждение)
      console.warn("signInWithPassword returned no session:", data);
      alert("Вход инициирован, но сессия не создана. Проверьте почту для подтверждения или попробуйте снова.");
    } catch (err) {
      console.error("Ошибка выполнения входа:", err);
      alert("Ошибка входа (см. консоль).");
    }
  });

  // Подписка на изменение статуса (на всякий случай — полезно при magic links и т.п.)
  supabase.auth.onAuthStateChange((event, session) => {
    console.debug("Auth event:", event, session);
    if (event === "SIGNED_IN" && session) {
      // Если пользователь подписался, редиректим на dashboard
      if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        window.location.href = "dashboard.html";
      }
    }
  });
});
