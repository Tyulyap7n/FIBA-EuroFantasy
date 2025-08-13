document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");

    // Регистрация
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;
            const username = document.getElementById("register-username").value;

            // 1. Создаём пользователя в auth.users
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password
            });

            if (signUpError) {
                alert("Ошибка регистрации: " + signUpError.message);
                return;
            }

            const userId = signUpData.user?.id;
            if (!userId) {
                alert("Ошибка: не удалось получить ID пользователя");
                return;
            }

            // 2. Записываем в public.users
            const { error: insertError } = await supabase
                .from("users")
                .insert([{ id: userId, username }]);

            if (insertError) {
                alert("Ошибка записи в таблицу users: " + insertError.message);
                return;
            }

            alert("Регистрация успешна! Проверьте почту для подтверждения.");
        });
    }

    // Вход
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                alert("Ошибка входа: " + error.message);
                return;
            }

            window.location.href = "dashboard.html";
        });
    }
});
