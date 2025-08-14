/* script.js — фильтры, роли, сохранение состава + загрузка из Supabase */

// Демо fallback — используется, если в Supabase нет данных
let players = [
  { id: 1, name: "Demo Player", price: 10, avg: 20, pts: 100, reb: 50, stl: 5, blk: 5, to: 5, threes: 10, country: "DemoLand", pos: "G", flag: "", photo: "" }
];

// Загрузка игроков из Supabase
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
      console.error("Ошибка Supabase:", error);
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.info("Нет игроков в таблице players или получен неожиданный формат — используем demo-fallback.");
      return;
    }

    players = data.map(p => ( {
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

    console.debug(`Загружено ${players.length} игроков из Supabase`);
  } catch (e) {
    console.error("Ошибка при загрузке игроков:", e);
  }
}

// Проверка авторизации
async function checkAuth() {
  if (!window.supabase) {
    console.error("supabase не инициализирован в checkAuth");
    // если нет supabase — перенаправлять не будем, чтобы не потерять контекст, но логируем.
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "index.html";
    } else {
      console.debug("Есть сессия:", session);
    }
  } catch (err) {
    console.error("Ошибка при проверке сессии:", err);
    window.location.href = "index.html";
  }
}

// Отрисовка таблицы игроков
function renderPlayersTable() {
  const tbody = document.getElementById("players-tbody");
  if (!tbody) {
    console.warn("Не найден #players-tbody");
    return;
  }
  tbody.innerHTML = "";

  players.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><button class="add-btn" data-id="${p.id}">+</button></td>
      <td><img src="${p.photo || 'player-placeholder.png'}" alt="" style="width:40px;height:40px;border-radius:6px;"></td>
      <td>${escapeHtml(p.name)}</td>
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

  // делегируем клик по добавлению
  tbody.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".add-btn");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));
    handleAddPlayer(id, btn);
  });
}

function escapeHtml(text) {
  if (typeof text !== "string") return text;
  return text.replace(/[&<>"']/g, function (m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]);
  });
}

function handleAddPlayer(id, btn) {
  const player = players.find(p => p.id === id);
  if (!player) {
    console.warn("Игрок не найден по id:", id);
    return;
  }
  console.log("Добавляю игрока:", player.name);
  btn.classList.add("active");
  btn.disabled = true;
  // TODO: добавить логику добавления в слот/состав
}

// Инициализация страницы
document.addEventListener("DOMContentLoaded", async () => {
  // если это dashboard, проверяем auth
  if (location.pathname.endsWith("dashboard.html") || location.pathname.endsWith("/dashboard.html")) {
    await checkAuth();
    await loadPlayersFromSupabase();
    renderPlayersTable();
  } else {
    console.debug("Не dashboard — загружать игроков не обязательно.");
  }
});
