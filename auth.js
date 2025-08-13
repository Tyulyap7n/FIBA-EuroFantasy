// Обработка регистрации
document.getElementById("register-btn").addEventListener("click", async () => {
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value.trim();
    const username = document.getElementById("register-username").value.trim();

    if (!email || !password || !username) {
        alert("Пожалуйста, заполните все поля");
        return;
    }

    // Регистрация в auth.users
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error("Ошибка регистрации:", error);
        alert(error.message);
        return;
    }

    const userId = data.user.id;

    // Добавление в таблицу users
    const { error: insertError } = await supabase
        .from("users")
        .insert([{ id: userId, username: username, role: "user" }]);

    if (insertError) {
        console.error("Ошибка сохранения пользователя:", insertError);
    } else {
        alert("Регистрация прошла успешно! Подтвердите email перед входом.");
    }
});

// Обработка входа
document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
        alert("Введите email и пароль");
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("Ошибка входа:", error);
        alert(error.message);
        return;
    }

    // Перенаправление в кабинет
    window.location.href = "dashboard.html";
});

// Проверка сессии при загрузке страницы (если пользователь уже вошёл)
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && window.location.pathname.includes("index.html")) {
        window.location.href = "dashboard.html";
    }
})();
