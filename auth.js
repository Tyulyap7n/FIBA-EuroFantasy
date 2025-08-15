// auth.js — регистрация и вход с реальной авторизацией в Supabase
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");

  // Проверка наличия Supabase клиента
  const ensureClient = () => {
    if (!window.supabase || !window.supabase.auth) {
      console.error("[Auth] Supabase клиент недоступен.");
      alert("Произошла ошибка инициализации. Обновите страницу.");
      return false;
    }
    return true;
  };

  // Создание записи user_team после регистрации/входа
  async function ensureUserTeam(user) {
    if (!user?.id) return;

    try {
      const { data: existingTeam } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!existingTeam) {
        const username = user.user_metadata?.username || "Игрок";
        await supabase.from('user_teams').insert([{ user_id: user.id, team_name: username }]);
      }
    } catch (err) {
      console.error("Ошибка при проверке/создании user_team:", err);
    }
  }
let currentUserTeamId = null;

async function fetchUserTeam(userId) {
  const { data, error } = await supabase
    .from('user_teams')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (!error) currentUserTeamId = data.id;
}

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

      if (data?.user) await ensureUserTeam(data.user);

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        alert("Ошибка входа: " + error.message);
        return;
      }

      const user = data?.user || data?.session?.user;
      if (!user) {
        alert("Не удалось получить пользователя после входа.");
        return;
      }

      await ensureUserTeam(user);

      // Редирект на дашборд
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Ошибка входа:", err);
      alert("Не удалось войти. Попробуйте снова.");
    }
  });
if (data?.user) {
  await fetchUserTeam(data.user.id);
  window.location.href = "dashboard.html";
}

  // Подписка на изменения сессии
  try {
    if (window.supabase?.auth?.onAuthStateChange) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await ensureUserTeam(session.user);
          if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname === "") {
            window.location.href = "dashboard.html";
          }
        }
      });
    }
  } catch (e) {
    console.warn("onAuthStateChange failed:", e);
  }
});
