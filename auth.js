document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");

    // Регистрация
    registerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("register-username").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;

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

        // 2. Записываем в таблицу users
        if (userId) {
            const { error: insertError } = await supabase
                .from("users")
                .insert([{ id: userId, username }]);
            if (insertError) {
                alert("Ошибка записи в users: " + insertError.message);
                return;
            }
        }

        alert("Регистрация успешна! Теперь войдите в систему.");
    });

    // Вход
    loginForm?.addEventListener("submit", async (e) => {
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
});
