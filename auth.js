document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");

  const ensureClient = () => {
    if (!window.supabase || !window.supabase.auth) {
      console.error("[Auth] Supabase клиент недоступен.");
      alert("Произошла ошибка инициализации.");
      return false;
    }
    return true;
  };

  // Создание записи user_team после регистрации/входа
  async function ensureUserTeam(user) {
    if (!user?.id) return;
    
    // проверка существующей команды
    const { data: existingTeam } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (!existingTeam) {
      // берём имя из user_metadata (username)
      const username = user.user_metadata?.username || "Игрок";

      await supabase.from('user_teams').insert([{ user_id: user.id, team_name: username }]);
    }
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

// в Supabase v2 объект пользователя
const user = data?.user || data?.session?.user;
if (!user) {
  alert("Не удалось получить пользователя после входа.");
  return;
}

// создаём команду пользователя
await ensureUserTeam(user);

// редирект на дашборд
window.location.href = "dashboard.html";


      if (data?.user) await ensureUserTeam(data.user);

      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Ошибка выполнения входа:", err);
      alert("Не удалось войти. Попробуйте снова.");
    }
  });

  // Подписка на изменения сессии
  try {
    if (window.supabase?.auth?.onAuthStateChange) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.debug("[Auth] onAuthStateChange:", event);
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
