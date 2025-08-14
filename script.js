/* script.js — таблица, круговой селектор ролей, бюджет, ограничения */

// ====== Константы ======
const BUDGET_CAP = 60;
const DEFAULT_AVATAR = ""; // при желании укажи путь к заглушке, например "img/default.png"

const ROLE_OPTIONS = [
  { key: "Scorer",    label: "SCORER" },
  { key: "Assistant", label: "ASSISTANT" },
  { key: "Rebounder", label: "REBOUNDER" },
  { key: "Stopper",   label: "STOPPER" },
  { key: "Shooter",   label: "SHOOTER" },
  { key: "Young",     label: "SURPRISE", maxPrice: 7 } // Ограничение: цена ≤ 7$
];

// id игрока в каждом слоте
const selectedRoles = {
  Scorer: null,
  Assistant: null,
  Rebounder: null,
  Stopper: null,
  Shooter: null,
  Young: null
};

// ====== Демо-фолбек (если в Supabase пусто) ======
let players = [
  { id: 1, name: "Demo Player", price: 10, avg: 20, pts: 100, reb: 50, stl: 5, blk: 5, to: 5, threes: 10, country: "DemoLand", pos: "G", flag: "", photo: "" }
];

// ====== Загрузка игроков из Supabase ======
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

// ====== Авторизация ======
async function checkAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = "index.html";
  } catch (e) {
    console.error("Проблема с проверкой сессии:", e);
    window.location.href = "index.html";
  }
}

// ====== Таблица игроков ======
// --- Функция рендера таблицы (обновлено для клика по строке)
function renderPlayersTable() {
  const tbody = document.getElementById("players-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  players.forEach(p => {
    const tr = document.createElement("tr");
    tr.dataset.playerId = p.id; // связываем строку с игроком
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

  // --- Слушатель клика на строку для открытия карточки
  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", (e) => {
      // Игнорируем клик по кнопке "+"
      if (e.target.closest(".add-btn")) return;

      const playerId = tr.dataset.playerId;
      const player = players.find(p => p.id == playerId);
      if (!player) return;

      showPlayerPreview(player);
    });
  });
}

// Функция показа профиля игрока
function showPlayerPreview(player) {
  const preview = document.getElementById("player-preview");
  if (!preview) return;

  preview.classList.add("show"); // добавляем класс show
  preview.style.display = "block"; // на всякий случай

  // Заполняем данные игрока
  document.getElementById("profile-name").textContent = player.name || "";
  document.getElementById("profile-photo").src = player.photo || "";
  document.getElementById("profile-country-pos").textContent = `${player.pos || ""} — ${player.country || ""}`;
  document.getElementById("profile-price").textContent = player.price ?? "";
  if (player.flag) {
    document.getElementById("profile-flag").style.backgroundImage = `url(${player.flag})`;
  } else {
    document.getElementById("profile-flag").style.backgroundImage = "";
  }
  document.getElementById("profile-avg").textContent = player.avg ?? 0;
  document.getElementById("profile-total").textContent = player.pts ?? 0;
  document.getElementById("profile-picked").textContent = player.pickPercent ?? "0%";
}

// Скрытие карточки
function hidePlayerPreview() {
  const preview = document.getElementById("player-preview");
  if (!preview) return;
  preview.classList.remove("show");
  preview.style.display = "none";
}

// Пример привязки к строкам таблицы
document.querySelectorAll(".player-row").forEach(row => {
  row.addEventListener("click", () => {
    const playerData = {
      name: row.dataset.name,
      photo: row.dataset.photo,
      pos: row.dataset.pos,
      country: row.dataset.country,
      price: row.dataset.price,
      flag: row.dataset.flag,
      avg: row.dataset.avg,
      pts: row.dataset.pts,
      pickPercent: row.dataset.pickPercent
    };
    showPlayerPreview(playerData);
  });
});

// ====== Делегирование клика по плюсикам (чтобы не терялось после ререндера) ======
function initAddButtonDelegation() {
  const tbody = document.getElementById("players-tbody");
  if (!tbody) return;
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    const player = players.find(pl => String(pl.id) === String(id));
    if (player) openRoleSelector(btn, player);
  });
}

// ====== Роль игрока, если уже назначен ======
function roleOfPlayer(playerId) {
  return Object.entries(selectedRoles).find(([, id]) => String(id) === String(playerId))?.[0] || null;
}

// ====== Подсчёт бюджета ======
function getSpentCoins(nextMap = null) {
  const map = nextMap || selectedRoles;
  const ids = new Set(Object.values(map).filter(Boolean));
  let total = 0;
  ids.forEach(id => {
    const p = players.find(pl => String(pl.id) === String(id));
    if (p) total += Number(p.price || 0);
  });
  return total;
}
function updateBudgetDisplay() {
  const spentEl = document.getElementById("spent-money");
  if (spentEl) spentEl.textContent = String(getSpentCoins());
}

// ====== Обновление аватаров в слотах STARTING VI ======
function updateRoleSlotsUI() {
  ROLE_OPTIONS.forEach(opt => {
    const slot = document.getElementById(`slot-${opt.key}`);
    if (!slot) return;

    // если есть empty-slot — начнём с него
    let avatar = slot.querySelector("img");
    const empty = slot.querySelector(".empty-slot");
    const nameDiv = slot.querySelector(".role-name");

    const playerId = selectedRoles[opt.key];
    if (!playerId) {
      // очистить аватар
      if (avatar) avatar.remove();
      if (!slot.querySelector(".empty-slot")) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "empty-slot";
        emptyDiv.textContent = "—";
        slot.insertBefore(emptyDiv, nameDiv || null);
      }
      if (nameDiv) nameDiv.textContent = opt.label;
      return;
    }

    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) return;

    // создать/обновить аватар
    if (!avatar) {
      avatar = document.createElement("img");
      slot.insertBefore(avatar, nameDiv || null);
    }
    avatar.src = player.photo || DEFAULT_AVATAR || "";
    avatar.alt = player.name || "Player";

    // подпись роли
    if (nameDiv) nameDiv.textContent = opt.label;
    // убрать empty
    if (empty) empty.remove();
  });
}

// ====== Назначение игрока на роль (с проверками) ======
function assignPlayerToRole(player, roleKey) {
  // запрет: один игрок не может быть в нескольких ролях
  const existingRole = roleOfPlayer(player.id);
  if (existingRole && existingRole !== roleKey) {
    alert("Этот игрок уже выбран для другой роли.");
    return false;
  }

  // ограничение SURPRISE (Young)
  const roleDef = ROLE_OPTIONS.find(r => r.key === roleKey);
  if (roleDef?.key === "Young" && player.price > (roleDef.maxPrice || 7)) {
    alert(`Для роли SURPRISE допускаются игроки ценой не дороже $${roleDef.maxPrice || 7}.`);
    return false;
  }

  // если роль занята другим — готовим замену
  const next = { ...selectedRoles, [roleKey]: player.id };

  // лимит бюджета
  const nextSpent = getSpentCoins(next);
  if (nextSpent > BUDGET_CAP) {
    alert(`Превышен бюджет. Лимит: ${BUDGET_CAP}$, получилось: ${nextSpent}$.`);
    return false;
  }

  // применяем
  selectedRoles[roleKey] = player.id;
  updateBudgetDisplay();
  updateRoleSlotsUI();
  return true;
}

// ====== Круговой селектор ролей ======
let selectorOverlay = null;
let selectorEl = null;

function openRoleSelector(triggerBtn, player) {
  closeRoleSelector(); // закрыть предыдущий, если есть

  // Оверлей (для клика снаружи)
  selectorOverlay = document.createElement("div");
  selectorOverlay.className = "role-overlay";
  selectorOverlay.addEventListener("click", closeRoleSelector);

  // Сам селектор
  selectorEl = document.createElement("div");
  selectorEl.className = "role-selector";
  selectorEl.setAttribute("role", "dialog");
  selectorEl.setAttribute("aria-label", "Выбор роли");
  selectorEl.style.position = "fixed";

  // Размер и позиция относительно кнопки
  const rect = triggerBtn.getBoundingClientRect();
  const size = 220;
  let left = rect.left + rect.width / 2 - size / 2;
  let top  = rect.top  + rect.height / 2 - size / 2;

  left = Math.max(8, Math.min(left, window.innerWidth  - size - 8));
  top  = Math.max(8, Math.min(top,  window.innerHeight - size - 8));

  selectorEl.style.left = `${left}px`;
  selectorEl.style.top  = `${top}px`;
  selectorEl.style.width = `${size}px`;
  selectorEl.style.height = `${size}px`;

  // Разместим кнопки по кругу
  const rolesToShow = ROLE_OPTIONS.filter(r => !(r.key === "Young" && player.price > (r.maxPrice || 7)));
  const R = 80; // радиус
  rolesToShow.forEach((opt, i) => {
    const angle = (i / rolesToShow.length) * (Math.PI * 2) - Math.PI / 2; // старт сверху
    const bw = 90, bh = 40;
    const x = size / 2 + R * Math.cos(angle) - bw / 2;
    const y = size / 2 + R * Math.sin(angle) - bh / 2;

    const b = document.createElement("button");
    b.textContent = opt.label;
    b.style.position = "absolute";
    b.style.left = `${x}px`;
    b.style.top  = `${y}px`;
    b.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (assignPlayerToRole(player, opt.key)) closeRoleSelector();
    });
    selectorEl.appendChild(b);
  });

  // Вставка в DOM и анимация
  document.body.appendChild(selectorOverlay);
  document.body.appendChild(selectorEl);
  requestAnimationFrame(() => {
    selectorOverlay.classList.add("show");
    selectorEl.classList.add("show");
  });

  // закрытие по Esc / ресайз / скролл
  document.addEventListener("keydown", escCloseOnce);
  window.addEventListener("resize", closeRoleSelector, { once: true });
  window.addEventListener("scroll", closeRoleSelector, { once: true });
}

function escCloseOnce(e) {
  if (e.key === "Escape") closeRoleSelector();
}

function closeRoleSelector() {
  if (selectorOverlay) {
    selectorOverlay.classList.remove("show");
    setTimeout(() => selectorOverlay?.remove(), 180);
    selectorOverlay = null;
  }
  if (selectorEl) {
    selectorEl.classList.remove("show");
    setTimeout(() => selectorEl?.remove(), 180);
    selectorEl = null;
  }
  document.removeEventListener("keydown", escCloseOnce);
}

// ====== Инициализация ======
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadPlayersFromSupabase();
  renderPlayersTable();       // таблица
  initAddButtonDelegation();  // делегирование кликов на "+"

  // отрисовать текущие слоты и бюджет
  updateRoleSlotsUI();
  updateBudgetDisplay();

  // если у тебя есть initParButtons() для rules/scoring/roster — вызови:
  if (typeof initParButtons === "function") initParButtons();
});
// --- TOGGLE ДЛЯ rules / scoring / roster ---
(function () {
  function togglePanel(btn) {
    const targetId = btn?.dataset?.target;
    if (!targetId) return;

    const panel = document.getElementById(targetId);
    if (!panel) return;

    const wrap = btn.closest(".strip-wrapper");
    const strip = wrap?.querySelector(".strip");

    // закрыть все остальные панели/кнопки/полосы
    document.querySelectorAll(".panel.show").forEach(p => {
      if (p !== panel) p.classList.remove("show");
    });
    document.querySelectorAll(".par-btn.active").forEach(b => {
      if (b !== btn) {
        b.classList.remove("active");
        b.setAttribute("aria-expanded", "false");
      }
    });
    document.querySelectorAll(".strip.expanded").forEach(s => {
      if (s !== strip) s.classList.remove("expanded");
    });

    // переключаем выбранную
    const isOpen = panel.classList.toggle("show");
    if (isOpen) {
      strip?.classList.add("expanded");
      btn.classList.add("active");
      btn.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      strip?.classList.remove("expanded");
      btn.classList.remove("active");
      btn.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
    }
  }

  function initParButtons() {
    // ARIA для доступности
    document.querySelectorAll(".panel").forEach(p => {
      p.setAttribute("role", "region");
      p.setAttribute("aria-hidden", "true");
    });

    // Делегирование клика — работает даже после перерендера
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".par-btn");
      if (!btn) return;
      e.preventDefault();
      togglePanel(btn);
    });

    // Открытие по хэшу (например, /dashboard.html#scoring-panel)
    const hashId = location.hash?.slice(1);
    if (hashId) {
      const btn = document.querySelector(`.par-btn[data-target="${hashId}"]`);
      if (btn) togglePanel(btn);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initParButtons);
  } else {
    initParButtons();
  }
})();
