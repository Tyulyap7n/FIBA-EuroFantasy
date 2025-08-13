// ======== Общие настройки ========
let cachedPlayers = [];
let activeTab = null;

// ======== Загрузка игроков один раз при старте ========
async function fetchPlayersOnce() {
    if (cachedPlayers.length > 0) return cachedPlayers;

    const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("last_name", { ascending: true });

    if (error) {
        console.error("Ошибка загрузки игроков:", error);
        return [];
    }

    cachedPlayers = data;
    return cachedPlayers;
}

// ======== Переключение вкладок ========
function initTabs() {
    const buttons = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const target = button.getAttribute("data-tab");

            // Если вкладка уже открыта — закрываем её
            if (activeTab === target) {
                document.getElementById(target).classList.remove("active");
                button.classList.remove("active");
                activeTab = null;
                return;
            }

            // Закрываем все вкладки
            contents.forEach(content => content.classList.remove("active"));
            buttons.forEach(btn => btn.classList.remove("active"));

            // Открываем выбранную
            document.getElementById(target).classList.add("active");
            button.classList.add("active");
            activeTab = target;

            // Анимация открытия
            setTimeout(() => {
                document.getElementById(target).classList.add("show");
            }, 50);
        });
    });
}

// ======== Проверка авторизации ========
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "index.html";
    }
}

// ======== Инициализация ========
document.addEventListener("DOMContentLoaded", async () => {
    await checkAuth();
    initTabs();
    await fetchPlayersOnce();
});
