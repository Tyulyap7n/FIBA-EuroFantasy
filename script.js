/* script.js — таблица, круговой селектор ролей, пагинация, назначение в БД (team_players)
   Полностью переписан: исправлены ошибки с типами, сделано сохранение/замена в team_players,
   пагинация по 8 игроков, фильтры, вычисление AVG по заданной формуле (без 3PTM),
   убрана карточка превью (удалена интерактивность показа превью при клике на строку).
   Предполагается, что supabaseClient.js уже проинициализировал window.supabase.
*/

/* ========== Константы / состояния ========== */
const BUDGET_CAP = 60;
const DEFAULT_AVATAR = ""; // путь к заглушке, если нужно
const playersPerPage = 8;
const ROLE_KEYS = [
  "Scorer",
  "Assistant",
  "Rebounder",
  "Stopper",
  "Shooter",
  "Young" // сюрприз / surprise
];

// ROLE_OPTIONS будет заполняться из БД (roles) и содержать { key, label, dbId, maxPrice? }
let ROLE_OPTIONS = [
  { key: "Scorer", label: "SCORER" },
  { key: "Assistant", label: "ASSISTANT" },
  { key: "Rebounder", label: "REBOUNDER" },
  { key: "Stopper", label: "STOPPER" },
  { key: "Shooter", label: "SHOOTER" },
  { key: "Young", label: "SURPRISE", maxPrice: 7 }
];

// выбранные игроки по ключу роли: { Scorer: playerId | null, ... }
const selectedRoles = {
  Scorer: null,
  Assistant: null,
  Rebounder: null,
  Stopper: null,
  Shooter: null,
  Young: null
};

// данные
let players = [];         // загруженные игроки
let rolesFromDb = [];     // записи roles из БД
let teamPlayers = [];     // записи team_players для текущей команды
let currentUser = null;   // supabase user object
let currentUserTeamId = null; // id из user_teams
let currentPage = 1;
let currentTourId = null; // глобальная переменная
/* ========== Помощники ========== */
function logDebug(...args) { console.debug("[script.js]", ...args); }

function ensureSupabase() {
  if (!window.supabase) {
    console.error("Supabase клиент не найден. Подключите supabaseClient.js перед script.js");
    return false;
  }
  return true;
}

/* ========== Загрузка ролей + маппинг ROLE_OPTIONS ========== */
async function loadRolesFromDb() {
  if (!ensureSupabase()) return;
  try {
    const { data, error } = await supabase
      .from("roles")
      .select("id,name,formula");

    if (error) throw error;
    rolesFromDb = data || [];

    // сопоставляем ROLE_OPTIONS по name -> key (регистронезависимо)
    ROLE_OPTIONS.forEach(opt => {
      const match = rolesFromDb.find(r => String(r.name).toLowerCase() === String(opt.key).toLowerCase() || String(r.name).toLowerCase() === String(opt.label).toLowerCase());
      if (match) opt.dbId = match.id;
    });

    logDebug("ROLE_OPTIONS mapped:", ROLE_OPTIONS);
  } catch (err) {
    console.error("Ошибка загрузки roles:", err);
  }
}

/* ========== АВТОРИЗАЦИЯ и команда пользователя ========== */
async function loadCurrentUserAndTeam() {
  if (!ensureSupabase()) return;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    currentUser = session?.user ?? null;
    // ищем запись в user_teams по user_id (создаём, если нет — но в auth.js уже пытались создать)
    const { data: teamData, error: teamError } = await supabase
      .from("user_teams")
      .select("id,team_name")
      .eq("user_id", currentUser.id)
      .limit(1)
      .maybeSingle();

    if (teamError) throw teamError;
    if (teamData) {
      currentUserTeamId = teamData.id;
    } else {
      // создать запись с username из метаданных (fallback)
      const username = currentUser.user_metadata?.username || `user_${currentUser.id.slice(0,6)}`;
      const { data: newTeam, error: insertErr } = await supabase
        .from("user_teams")
        .insert([{ user_id: currentUser.id, team_name: username }])
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      currentUserTeamId = newTeam.id;
    }

    // показать имя в хедере (если есть элемент)
    const userNameEl = document.getElementById("header-username");
    if (userNameEl) {
      const username = currentUser.user_metadata?.username || currentUser.email || "Игрок";
      userNameEl.textContent = username;
    }

    logDebug("currentUserTeamId:", currentUserTeamId);
  } catch (err) {
    console.error("Ошибка получения текущего пользователя / команды:", err);
  }
}
async function loadCurrentTour() {
  const { data: tours, error } = await supabase
    .from("tours")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Ошибка загрузки туров:", error);
    return;
  }

  // выбираем тур по текущему времени
  const now = new Date();
  const currentTour = tours.find(t => new Date(t.start_time) <= now && now <= new Date(t.end_time));
  currentTourId = currentTour ? currentTour.id : null;

  console.log("currentTourId:", currentTourId);
}

/* ========== Загрузка игроков и player_stats, расчёт AVG ========== */
async function loadPlayersFromSupabase() {
  if (!ensureSupabase()) return;
  try {
    // 1) игроки
    const { data: playersData, error: pErr } = await supabase
      .from("players")
      .select("id,first_name,last_name,position,country,price,photo_url,stats");
    if (pErr) throw pErr;

    // 2) статистика player_stats (включая tour)
    const { data: statsData, error: sErr } = await supabase
      .from("player_stats")
      .select("player_id,tour,points,threes,assists,rebounds,blocks,steals,turnover");
    if (sErr) throw sErr;

    // Сгруппируем stats по player_id, при этом объединим tour 2 и 3 → 2
    const statsByPlayer = {};
    (statsData || []).forEach(s => {
      const pid = s.player_id;
      const tour = (s.tour === 2 || s.tour === 3) ? 2 : s.tour;
      const record = { ...s, tour };
      if (!statsByPlayer[pid]) statsByPlayer[pid] = [];
      statsByPlayer[pid].push(record);
    });

    // Формула AVG (без 3PTM): (PTS + AST*1.5 + REB*1.3 + ST*3 + BLK*3 + TO*(-3)) / count
    players = (playersData || []).map(p => {
      const list = statsByPlayer[p.id] || [];
      const count = list.length || 1; // если нет записей — делим на 1 чтобы не было NaN

      const sumPts = list.reduce((s, r) => s + (r.points || 0), 0);
      const sumAst = list.reduce((s, r) => s + (r.assists || 0), 0);
      const sumReb = list.reduce((s, r) => s + (r.rebounds || 0), 0);
      const sumBlk = list.reduce((s, r) => s + (r.blocks || 0), 0);
      const sumStl = list.reduce((s, r) => s + (r.steals || 0), 0);
      const sumTo  = list.reduce((s, r) => s + (r.turnover || 0), 0);

      const avgFormula = (
        (sumPts)
        + (sumAst * 1.5)
        + (sumReb * 1.3)
        + (sumStl * 3)
        + (sumBlk * 3)
        + (sumTo * -3)
      ) / count;

      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        name: [p.first_name, p.last_name].filter(Boolean).join(" "),
        position: p.position,
        country: p.country,
        price: Number(p.price ?? 0),
        photo: p.photo_url || "",
        stats: p.stats || {},
        // отдельные усреднённые колонки (чтобы таблица показывала компоненты)
        avg: Number(avgFormula.toFixed(1)),
        pts: Number((sumPts / count).toFixed(1)),
        ast: Number((sumAst / count).toFixed(1)),
        reb: Number((sumReb / count).toFixed(1)),
        blk: Number((sumBlk / count).toFixed(1)),
        stl: Number((sumStl / count).toFixed(1)),
        to:  Number((sumTo  / count).toFixed(1))
      };
    });

    logDebug("players loaded:", players.length);
  } catch (err) {
    console.error("Ошибка при загрузке игроков:", err);
  }
}

/* ========== Загрузка team_players (состав текущей команды) ========== */
async function loadTeamPlayers() {
  if (!ensureSupabase()) return;
  if (!currentUserTeamId) return;
  if (!currentTourId) return; // убедимся, что тур задан

  try {
    const { data, error } = await supabase
      .from("team_players")
      .select("id,team_id,player_id,role_id,tour_id")
      .eq("team_id", currentUserTeamId)
      .eq("tour_id", currentTourId); // фильтр по текущему туру

    if (error) throw error;
    teamPlayers = data || [];

    // сопоставим selectedRoles по role key (нужен мап role_id -> key)
    const roleIdToKey = {};
    ROLE_OPTIONS.forEach(opt => { if (opt.dbId) roleIdToKey[opt.dbId] = opt.key; });

    // очистим и наполним
    Object.keys(selectedRoles).forEach(k => selectedRoles[k] = null);
    (teamPlayers || []).forEach(tp => {
      const key = roleIdToKey[tp.role_id];
      if (key) selectedRoles[key] = tp.player_id;
    });

    logDebug("teamPlayers loaded for current tour:", currentTourId, selectedRoles);
  } catch (err) {
    console.error("Ошибка загрузки team_players:", err);
  }
}
/* ========== Рисуем roster (слоты) ========== */
function renderRoster() {
  ROLE_OPTIONS.forEach(opt => {
    const slot = document.getElementById(`slot-${opt.key}`);
    if (!slot) return;
    // пометим roleId в data
    if (opt.dbId) slot.dataset.roleId = opt.dbId;
    slot.dataset.roleKey = opt.key;

    // очистим содержимое слота и отрисуем
    slot.innerHTML = "";
    const playerId = selectedRoles[opt.key];

    if (!playerId) {
      const empty = document.createElement("div");
      empty.className = "empty-slot";
      empty.textContent = "—";
      const name = document.createElement("div");
      name.className = "role-name";
      name.textContent = opt.label;
      slot.appendChild(empty);
      slot.appendChild(name);
      return;
    }

    // если игрок назначен — найдём данные игрока
    const pl = players.find(x => String(x.id) === String(playerId));
    const img = document.createElement("img");
    img.src = pl?.photo || DEFAULT_AVATAR;
    img.alt = pl?.name || "Player";
    const name = document.createElement("div");
    name.className = "role-name";
    name.textContent = opt.label;

    slot.appendChild(img);
    slot.appendChild(name);
  });
}

/* ========== Бюджет ========== */
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

/* ========== Пагинация и таблица игроков ========== */
function getFilteredAndSortedPlayers() {
  const country = (document.getElementById("filter-country")?.value || "").trim();
  const pos = (document.getElementById("filter-pos")?.value || "").trim();
  const sort = (document.getElementById("filter-sort")?.value || "").trim();

  let list = Array.isArray(players) ? [...players] : [];

  if (country) list = list.filter(p => (p.country || "").toLowerCase() === country.toLowerCase());
  if (pos) list = list.filter(p => (p.position || p.pos || "").toUpperCase() === pos.toUpperCase());

  if (sort) {
    switch (sort) {
      case "price-asc": list.sort((a,b) => (a.price||0) - (b.price||0)); break;
      case "price-desc": list.sort((a,b) => (b.price||0) - (a.price||0)); break;
      case "avg-asc": list.sort((a,b) => (a.avg||0) - (b.avg||0)); break;
      case "avg-desc": list.sort((a,b) => (b.avg||0) - (a.avg||0)); break;
      default: break;
    }
  }

  return list;
}

function populateCountryFilter() {
  const sel = document.getElementById("filter-country");
  if (!sel) return;
  const countries = Array.from(new Set(players.map(p => (p.country || "").trim()).filter(Boolean))).sort();
  sel.innerHTML = `<option value="">All</option>` + countries.map(c => `<option value="${c}">${c}</option>`).join("");
}

function renderPlayersTable() {
  const tbody = document.getElementById("players-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = getFilteredAndSortedPlayers();
  const totalPages = Math.max(1, Math.ceil(filtered.length / playersPerPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * playersPerPage;
  const pagePlayers = filtered.slice(start, start + playersPerPage);

  pagePlayers.forEach(p => {
    const tr = document.createElement("tr");
    tr.dataset.playerId = p.id;
    // строки более узкие — уменьшим padding через CSS (см style.css)
    tr.innerHTML = `
      <td><button class="add-btn" data-id="${p.id}" aria-label="Add ${p.name}">+</button></td>
      <td>${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">` : ''}</td>
      <td>${p.name}</td>
      <td>${p.price}$</td>
      <td>${p.avg}</td>
      <td>${p.pts}</td>
      <td><!-- 3PTM скрываем в UI по твоему требованию; если нужно — вставь сюда --> — </td>
      <td>${p.ast}</td>
      <td>${p.reb}</td>
      <td>${p.stl}</td>
      <td>${p.blk}</td>
      <td>${p.to}</td>
    `;
    tbody.appendChild(tr);
  });

  // делегирование кликов на "+" — ссылка на initAddButtonDelegation, но чтобы работало сразу:
  initAddButtonDelegation();

  // обновляем страницу и кнопки
  const pageInfo = document.getElementById("page-info");
  if (pageInfo) pageInfo.textContent = `${currentPage} / ${totalPages}`;
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

/* пагинация кнопки */
function initPaginationButtons() {
  const prev = document.getElementById("prev-page");
  const next = document.getElementById("next-page");
  prev?.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderPlayersTable(); }
  });
  next?.addEventListener("click", () => {
    const filtered = getFilteredAndSortedPlayers();
    const totalPages = Math.max(1, Math.ceil(filtered.length / playersPerPage));
    if (currentPage < totalPages) { currentPage++; renderPlayersTable(); }
  });
}

/* ========== Делегирование кнопок "+" (создаёт селектор ролей) ========== */
function initAddButtonDelegation() {
  const tbody = document.getElementById("players-tbody");
  if (!tbody) return;
  // удалить предыдущий обработчик чтобы не дублировать
  tbody.replaceWith(tbody.cloneNode(true));
  const newTbody = document.getElementById("players-tbody");
  newTbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const player = players.find(p => String(p.id) === String(id));
    if (!player) return;
    openRoleSelector(btn, player);
  });
}

/* ========== Назначение игрока в team_players (вставка/обновление) ========== */
/* roleDbId - целое число (roles.id) */
async function assignPlayerToRoleDb(teamId, playerId, roleDbId) {
  if (!ensureSupabase()) return false;
  if (!teamId || !playerId || !roleDbId || !currentTourId) {
    console.warn("assignPlayerToRoleDb: отсутствуют аргументы", { teamId, playerId, roleDbId, currentTourId });
    return false;
  }

  try {
    // ищем существующую строку для этой team + role + tour
    const { data: existing, error: fetchErr } = await supabase
      .from("team_players")
      .select("id,player_id")
      .eq("team_id", teamId)
      .eq("role_id", roleDbId)
      .eq("tour_id", currentTourId) // фильтр по туру
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing && existing.id) {
      // обновляем player_id
      const { error: updErr } = await supabase
        .from("team_players")
        .update({ player_id: playerId })
        .eq("id", existing.id);

      if (updErr) throw updErr;
    } else {
      // вставляем новую запись
      const { error: insErr } = await supabase
        .from("team_players")
        .insert([{ team_id: teamId, player_id: playerId, role_id: roleDbId, tour_id: currentTourId }]); // указываем тур

      if (insErr) throw insErr;
    }

    // обновим локально selectedRoles и перерисуем roster
    const roleOpt = ROLE_OPTIONS.find(o => o.dbId === roleDbId);
    if (roleOpt) selectedRoles[roleOpt.key] = playerId;
    await loadTeamPlayers(); // подгрузим актуальные данные с сервера
    renderRoster();
    updateBudgetDisplay();
    return true;
  } catch (err) {
    console.error("Ошибка при назначении игрока:", err);
    return false;
  }
}


/* ========== Круговой селектор ролей (UI) ========== */
let selectorOverlay = null;
let selectorEl = null;

function openRoleSelector(triggerBtn, player) {
  closeRoleSelector();

  selectorOverlay = document.createElement("div");
  selectorOverlay.className = "role-overlay";
  selectorOverlay.addEventListener("click", closeRoleSelector);

  selectorEl = document.createElement("div");
  selectorEl.className = "role-selector";
  selectorEl.setAttribute("role", "dialog");
  selectorEl.setAttribute("aria-label", "Выбор роли");
  selectorEl.style.position = "fixed";

  // позиционирование рядом с кнопкой
  const rect = triggerBtn.getBoundingClientRect();
  const size = 220;
  let left = rect.left + rect.width / 2 - size / 2;
  let top  = rect.top  + rect.height / 2 - size / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - size - 8));
  top  = Math.max(8, Math.min(top, window.innerHeight - size - 8));

  selectorEl.style.left = `${left}px`;
  selectorEl.style.top  = `${top}px`;
  selectorEl.style.width = `${size}px`;
  selectorEl.style.height = `${size}px`;

  // показываем только роли, которые допустимы по цене
  const rolesToShow = ROLE_OPTIONS.filter(r => !(r.key === "Young" && player.price > (r.maxPrice || 7)));

  const R = 80;
  rolesToShow.forEach((opt, i) => {
    const angle = (i / rolesToShow.length) * (Math.PI * 2) - Math.PI / 2;
    const bw = 90, bh = 40;
    const x = size / 2 + R * Math.cos(angle) - bw / 2;
    const y = size / 2 + R * Math.sin(angle) - bh / 2;

    const b = document.createElement("button");
    b.textContent = opt.label;
    b.style.position = "absolute";
    b.style.left = `${x}px`;
    b.style.top  = `${y}px`;
    b.addEventListener("click", async (ev) => {
      ev.stopPropagation();

      // проверяем, есть ли dbId для роли
      if (!opt.dbId) {
        alert("Эта роль ещё не сконфигурирована в базе (roles). Обновите роли в админке.");
        return;
      }

      // Проверка бюджета локально: допустимая замена?
      const next = { ...selectedRoles, [opt.key]: player.id };
      const nextSpent = getSpentCoins(next);
      if (nextSpent > BUDGET_CAP) {
        alert(`Превышен бюджет (${nextSpent}$). Лимит ${BUDGET_CAP}$.`);
        return;
      }

      // назначаем в БД (вставка/обновление)
      const ok = await assignPlayerToRoleDb(currentUserTeamId, player.id, opt.dbId);
      if (ok) {
        closeRoleSelector();
      } else {
        alert("Не удалось назначить игрока. Смотрите консоль для ошибок.");
      }
    });

    selectorEl.appendChild(b);
  });

  document.body.appendChild(selectorOverlay);
  document.body.appendChild(selectorEl);
  requestAnimationFrame(() => {
    selectorOverlay.classList.add("show");
    selectorEl.classList.add("show");
  });

  // закрытие по Esc / resize / scroll
  document.addEventListener("keydown", escCloseOnce);
  window.addEventListener("resize", closeRoleSelector, { once: true });
  window.addEventListener("scroll", closeRoleSelector, { once: true });
}

function escCloseOnce(e) { if (e.key === "Escape") closeRoleSelector(); }

function closeRoleSelector() {
  if (selectorOverlay) { selectorOverlay.classList.remove("show"); setTimeout(()=>selectorOverlay?.remove(),180); selectorOverlay = null; }
  if (selectorEl) { selectorEl.classList.remove("show"); setTimeout(()=>selectorEl?.remove(),180); selectorEl = null; }
  document.removeEventListener("keydown", escCloseOnce);
}
// Сохраняет очки команды в текущем туре
async function saveTeamScore(teamId, totalPoints) {
  if (!ensureSupabase()) return;

  const { data, error } = await supabase
    .from("scores")
    .upsert({
      team_id: teamId,
      tour_id: currentTourId,
      total_points: totalPoints
    }, { onConflict: ['team_id', 'tour_id'] });

  if (error) {
    console.error("Ошибка при сохранении очков команды:", error);
  }
}

// Получает очки всех команд для текущего тура
async function loadScoresForCurrentTour() {
  if (!ensureSupabase()) return [];

  const { data: scores, error } = await supabase
    .from("scores")
    .select("team_id,total_points")
    .eq("tour_id", currentTourId);

  if (error) {
    console.error("Ошибка загрузки очков:", error);
    return [];
  }

  return scores;
}

/* ========== Init фильтров / кнопок панели и обработчики ========== */
function initTableFilters() {
  ["filter-country","filter-pos","filter-sort"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      currentPage = 1;
      renderPlayersTable();
    });
  });
}

function initParButtons() {
  // toggle panels (rules/scoring/roster) — поведение как раньше
  document.querySelectorAll(".panel").forEach(p => { p.setAttribute("role","region"); p.setAttribute("aria-hidden","true"); });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".par-btn");
    if (!btn) return;
    e.preventDefault();
    const targetId = btn.dataset.target;
    const panel = document.getElementById(targetId);
    if (!panel) return;

    // открываем/закрываем
    const isOpen = panel.classList.toggle("show");
    const wrap = btn.closest(".strip-wrapper");
    const strip = wrap?.querySelector(".strip");
    if (isOpen) {
      strip?.classList.add("expanded");
      btn.classList.add("active");
      btn.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");

      // специальное поведение: если rules — показываем картинку внутри panel (rules-img)
      if (targetId === "rules-panel") {
        const imgEl = panel.querySelector("#rules-img");
        if (imgEl) {
          imgEl.src = "./image/rules.jpg";
          imgEl.style.maxWidth = "60%";
          imgEl.style.height = "auto";
          imgEl.style.display = "block";
        }
      }

      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      strip?.classList.remove("expanded");
      btn.classList.remove("active");
      btn.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
    }
  });

  // открытие по хэшу
  const hashId = location.hash?.slice(1);
  if (hashId) {
    const btn = document.querySelector(`.par-btn[data-target="${hashId}"]`);
    if (btn) btn.click();
  }
}

/* ========== Сохранение состава (кнопка "Сохранить состав") ========== */
/* Эта кнопка в UI : собирает текущие selectedRoles и записывает их в team_players:
   для каждой роли — создаёт/обновляет запись team_players (team_id, player_id, role_id).
   После успешного сохранения делает reload teamPlayers/renderRoster.
*/
async function saveRosterToDb() {
  if (!currentUserTeamId) { alert("Невозможно сохранить — команда не найдена."); return; }

  // для каждой роли, если назначен игрок — вызываем assignPlayerToRoleDb
  for (const opt of ROLE_OPTIONS) {
    const roleId = opt.dbId;
    if (!roleId) continue;
    const playerId = selectedRoles[opt.key];
    if (!playerId) continue;
    await assignPlayerToRoleDb(currentUserTeamId, playerId, roleId);
  }
  alert("Состав сохранён в базе.");
}

/* ========== Инициализация страницы ========== */
document.addEventListener("DOMContentLoaded", async () => {
	// Проверка авторизации
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  window.location.href = "index.html";
  return;
}


try {
  // Получаем ник пользователя из таблицы profiles
  const { data: profile, error: profileError } = await supabase
    .from("user_teams")
    .select("team_name")
    .eq("user_id", user.id)
    .single();

  if (profileError) throw profileError;

  // Получаем название команды пользователя из таблицы user_teams
  const { data: team, error: teamError } = await supabase
    .from("user_teams")
    .select("team_name")
    .eq("user_id", user.id)
    .single();

  if (teamError) throw teamError;

  // Обновляем элементы на странице
  const welcomeEl = document.getElementById("welcome-message");
  const teamEl = document.getElementById("team-name");

  if (welcomeEl && profile?.username) {
    welcomeEl.textContent = `Привет, ${profile.username}!`;
  }

  if (teamEl && team?.team_name) {
    teamEl.textContent = `Название команды: ${team.team_name}`;
  }
} catch (err) {
  console.error("Ошибка при получении данных пользователя:", err);
}

  if (!ensureSupabase()) return;

  // 1) загрузим роли из БД чтобы получить dbId ролей (нужно для assign)
  await loadRolesFromDb();

  // 2) загрузим текущего пользователя и его команду
  await loadCurrentUserAndTeam();

  // 3) загрузим игроков + статистику -> players
  await loadPlayersFromSupabase();
// 4) загрузим состав команды (team_players) и синхронизируем selectedRoles
  await loadCurrentTour();   // <--- добавляем здесь


  // 4) загрузим состав команды (team_players) и синхронизируем selectedRoles
  await loadTeamPlayers();

  // 5) отрисуем UI
  populateCountryFilter();
  initTableFilters();
  initPaginationButtons();
  renderPlayersTable();
  renderRoster();
  updateBudgetDisplay();
  initParButtons();

  // 6) привяжем кнопку "Сохранить состав" (если есть)
  const saveBtn = document.getElementById("save-roster");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      await saveRosterToDb();
      saveBtn.disabled = false;
    });
  }

  // подсказка: привязка клика по role-slot для интерактивного замещения через UI
  document.querySelectorAll(".role-slot").forEach(slot => {
    slot.addEventListener("click", async () => {
      // если кликнули по слоту — можно открыть выбор игрока (в будущем)
      // Сейчас просто подсвечиваем
      slot.classList.add("active");
      setTimeout(()=>slot.classList.remove("active"), 250);
    });
  });
});







