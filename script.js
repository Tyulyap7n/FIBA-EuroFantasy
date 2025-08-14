/* script.js — фильтры, роли, сохранение состава + загрузка из Supabase */

// Демо fallback
let players = [
  { id: 1, name: "Demo Player", price: 10, avg: 20, pts: 100, reb: 50, stl: 5, blk: 5, to: 5, threes: 10, country: "DemoLand", pos: "G", flag: "", photo: "" }
];

async function loadPlayersFromSupabase() {
  if (!window.supabase) {
    console.error("supabase не инициализирован в loadPlayersFromSupabase");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Ошибка Supabase при загрузке игроков:", error);
      return;
    }

    if (!Array.isArray(data)) {
      console.warn("Supabase вернул не массив players:", data);
      return;
    }

    if (data.length === 0) {
      console.info("В таблице players нет записей — используем fallback demo-players");
      return;
    }

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
      pos: p.position || p.pos || "",
      flag: p.flag_url || p.flag || "",
      photo: p.photo_url || p.photo || ""
    }));

    console.debug(`Загружено ${players.length} игроков из Supabase`);
  } catch (e) {
    console.error("Ошибка при загрузке игроков (catch):", e);
  }
}

// Проверка авторизации (только для dashboard страницы)
async function checkAuth() {
  if (!window.supabase) {
    console.error("supabase не инициализирован в checkAuth");
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.info("Нет сессии — редирект на index.html");
      window.location.href = "index.html";
    } else {
      console.debug("Есть сессия:", session);
    }
  } catch (err) {
    console.error("Ошибка проверки сессии:", err);
    // в крайнем случае — редиректим
    window.location.href = "index.html";
  }
}

// Отрисовка таблицы игроков
function renderPlayersTable() {
  const tbody = document.getElementById("players-tbody");
  if (!tbody) {
    console.warn("Не найден #players-tbody в DOM");
    return;
  }
  tbody.innerHTML = "";

  players.forEach(p => {
    const tr = document.createElement("tr");

    // безопасное заполнение (без прямой вставки user-контента в HTML строку)
    const tdAdd = document.createElement("td");
    const addBtn = document.createElement("button");
    addBtn.className = "add-btn";
    addBtn.setAttribute("data-id", p.id);
    addBtn.innerText = "+";
    tdAdd.appendChild(addBtn);

    const tdPhoto = document.createElement("td");
    const img = document.createElement("img");
    img.src = p.photo || "player-placeholder.png";
    img.alt = p.name || "player";
    img.style.width = "40px";
    img.style.height = "40px";
    tdPhoto.appendChild(img);

    const tdName = document.createElement("td");
    tdName.textContent = p.name;

    const tdPrice = document.createElement("td");
    tdPrice.textContent = `${p.price}$`;

    const tdAvg = document.createElement("td"); tdAvg.textContent = p.avg;
    const tdPts = document.createElement("td"); tdPts.textContent = p.pts;
    const tdThrees = document.createElement("td"); tdThrees.textContent = p.threes;
    const tdReb = document.createElement("td"); tdReb.textContent = p.reb;
    const tdStl = document.createElement("td"); tdStl.textContent = p.stl;
    const tdBlk = document.createElement("td"); tdBlk.textContent = p.blk;
    const tdTo = document.createElement("td"); tdTo.textContent = p.to;

    tr.appendChild(tdAdd);
    tr.appendChild(tdPhoto);
    tr.appendChild(tdName);
    tr.appendChild(tdPrice);
    tr.appendChild(tdAvg);
    tr.appendChild(tdPts);
    tr.appendChild(tdThrees);
    tr.appendChild(tdReb);
    tr.appendChild(tdStl);
    tr.appendChild(tdBlk);
    tr.appendChild(tdTo);

    tbody.appendChild(tr);
  });

  // делегируем клик на кнопки "+"
  tbody.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".add-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    handleAddPlayer(Number(id), btn);
  });
}

function handleAddPlayer(id, btn) {
  const player = players.find(p => p.id === id);
  if (!player) return console.warn("Player not found for id", id);
  console.log("Добавляем игрока:", player.name);
  // тут логика добавления в состав — временно просто подсказка
  btn.classList.add("active");
  btn.disabled = true;
}

// Инициализация страницы
document.addEventListener("DOMContentLoaded", async () => {
  // если это dashboard, проверяем auth
  if (location.pathname.endsWith("dashboard.html")) {
    await checkAuth();
    await loadPlayersFromSupabase();
    renderPlayersTable();
  } else {
    // На страницы, где не нужен dashboard, можно просто загрузить данные при необходимости
    console.debug("Не dashboard — пропускаем checkAuth/loadPlayers");
  }
});
