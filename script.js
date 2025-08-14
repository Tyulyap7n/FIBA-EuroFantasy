/* script.js — фильтры, роли, сохранение состава + загрузка из Supabase */

// Демо fallback — используется, если в Supabase нет данных
let players = [
  { id: 1, name: "Demo Player", price: 10, avg: 20, pts: 100, reb: 50, stl: 5, blk: 5, to: 5, threes: 10, country: "DemoLand", pos: "G", flag: "", photo: "" }
];

// Загрузка игроков из Supabase
async function loadPlayersFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Ошибка Supabase:", error);
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      players = data.map(p => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.name || `Player #${p.id}`,
        price: Number(p.price ?? 0),
        avg: Number(p.avg ?? p.average ?? 0),
        pts: Number(p.pts ?? p.points ?? 0),
        threes: Number(p.threes ?? p.three_pointers_made ?? 0),
        reb: Number(p.reb ?? p.rebounds ?? 0),
        stl: Number(p.stl ?? p.steals ?? 0),
        blk: Number(p.blk ?? p.blocks ?? 0),
        to: Number(p.to ?? p.turnovers ?? 0),
        country: p.country || "",
        pos: p.position || "",
        flag: p.flag_url || "",
        photo: p.photo_url || ""
      }));
    }
  } catch (e) {
    console.error("Ошибка при загрузке игроков:", e);
  }
}

// Проверка авторизации (локальная, не конфликтует с app.js — одинаковая логика)
async function checkAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "index.html";
    }
  } catch (e) {
    console.error("Проблема с проверкой сессии:", e);
    window.location.href = "index.html";
  }
}

// Отрисовка таблицы игроков
function renderPlayersTable() {
  const tbody = document.getElementById("players-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  players.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><button class="add-btn" data-id="${p.id}">+</button></td>
      <td>${p.photo ? `<img src="${p.photo}" alt="" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">` : ''}</td>
      <td>${p.name}</td>
      <td>${p.price}$</td>
      <td>${p.avg}</td>
      <td>${p.pts}</td>
      <td>${p.threes}</td>
      <td>${p.reb}</td>
      <td>${p.stl}</td>
      <td>${p.blk}</td>
      <td>${p.to}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Инициализация страницы
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadPlayersFromSupabase();
  renderPlayersTable();
});
