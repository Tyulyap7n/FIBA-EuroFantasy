/* script.js — таблица, круговой селектор ролей, пагинация, назначение в БД (team_players) */

// Константы и состояния
const BUDGET_CAP = 70;
const DEFAULT_AVATAR = "";
const playersPerPage = 8;
const ROLE_KEYS = ["Scorer", "Assistant", "Rebounder", "Stopper", "Shooter", "Young"];

let ROLE_OPTIONS = [
  { key: "Scorer", label: "SCORER" },
  { key: "Assistant", label: "ASSISTANT" },
  { key: "Rebounder", label: "REBOUNDER" },
  { key: "Stopper", label: "STOPPER" },
  { key: "Shooter", label: "SHOOTER" },
  { key: "Young", label: "SURPRISE", maxPrice: 7 }
];

let selectedRoles = {
  Scorer: null,
  Assistant: null,
  Rebounder: null,
  Stopper: null,
  Shooter: null,
  Young: null
};

let players = [];
let rolesFromDb = [];
let teamPlayers = [];
let currentUser = null;
let currentUserTeamId = null;
let currentPage = 1;
let currentTourId = null;

// Помощники
function logDebug(...args) {
  console.debug("[script.js]", ...args);
}

function ensureSupabase() {
  if (!window.supabase) {
    console.error("Supabase клиент не найден. Подключите supabaseClient.js перед script.js");
    return false;
  }
  return true;
}

// Загрузка ролей из базы данных
async function loadRolesFromDb() {
  if (!ensureSupabase()) return;
  try {
    const { data, error } = await supabase.from("roles").select("id,name,formula");
    if (error) throw error;
    rolesFromDb = data || [];
    ROLE_OPTIONS.forEach(opt => {
      const match = rolesFromDb.find(r => String(r.name).toLowerCase() === String(opt.key).toLowerCase() || String(r.name).toLowerCase() === String(opt.label).toLowerCase());
      if (match) opt.dbId = match.id;
    });
    logDebug("ROLE_OPTIONS mapped:", ROLE_OPTIONS);
  } catch (err) {
    console.error("Ошибка загрузки roles:", err);
  }
}

// Загрузка текущего пользователя и команды
async function loadCurrentUserAndTeam() {
  if (!ensureSupabase()) return;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    currentUser = session?.user ?? null;

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
      const username = currentUser.user_metadata?.username || `user_${currentUser.id.slice(0, 6)}`;
      const { data: newTeam, error: insertErr } = await supabase
        .from("user_teams")
        .insert([{ user_id: currentUser.id, team_name: username }])
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      currentUserTeamId = newTeam.id;
    }

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

// Загрузка текущего тура
async function loadCurrentTour() {
  const { data: tours, error } = await supabase
    .from("tours")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Ошибка загрузки туров:", error);
    return;
  }

  const now = new Date();
  const currentTour = tours.find(t => new Date(t.start_time) <= now && now <= new Date(t.end_time));
  currentTourId = currentTour ? currentTour.id : null;
  console.log("currentTourId:", currentTourId);
}

// Загрузка игроков и расчет AVG
async function loadPlayersFromSupabase() {
  if (!ensureSupabase()) return;
  try {
    const { data: playersData, error: pErr } = await supabase
      .from("players")
      .select("id,first_name,last_name,position,country,price,photo_url,stats");

    if (pErr) throw pErr;

    const { data: statsData, error: sErr } = await supabase
      .from("player_stats")
      .select("player_id,tour,points,threes,assists,rebounds,blocks,steals,turnover");

    if (sErr) throw sErr;

    const statsByPlayer = {};
    (statsData || []).forEach(s => {
      const pid = s.player_id;
      const tour = (s.tour === 2 || s.tour === 3) ? 2 : s.tour;
      const record = { ...s, tour };
      if (!statsByPlayer[pid]) statsByPlayer[pid] = [];
      statsByPlayer[pid].push(record);
    });

    players = (playersData || []).map(p => {
      const list = statsByPlayer[p.id] || [];
      const count = list.length || 1;
      const sumPts = list.reduce((s, r) => s + (r.points || 0), 0);
      const sumAst = list.reduce((s, r) => s + (r.assists || 0), 0);
      const sumReb = list.reduce((s, r) => s + (r.rebounds || 0), 0);
      const sumBlk = list.reduce((s, r) => s + (r.blocks || 0), 0);
      const sumStl = list.reduce((s, r) => s + (r.steals || 0), 0);
      const sumTo  = list.reduce((s, r) => s + (r.turnover || 0), 0);

      const avgFormula = (
        (sumPts) +
        (sumAst * 1.5) +
        (sumReb * 1.3) +
        (sumStl * 3) +
        (sumBlk * 3) +
        (sumTo * -3)
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
        avg: Number(avgFormula.toFixed(1)),
        pts: Number((sumPts / count).toFixed(1)),
        ast: Number((sumAst / count).toFixed(1)),
        reb: Number((sumReb / count).toFixed(1)),
        blk: Number((sumBlk / count).toFixed(1)),
        stl: Number((sumStl / count).toFixed(1)),
        to: Number((sumTo / count).toFixed(1))
      };
    });
    logDebug("players loaded:", players.length);
  } catch (err) {
    console.error("Ошибка при загрузке игроков:", err);
  }
}

// Загрузка team_players (состав текущей команды)
async function loadTeamPlayers() {
  if (!ensureSupabase()) return;
  if (!currentUserTeamId) return;
  if (!currentTourId) return;

  try {
    const { data, error } = await supabase
      .from("team_players")
      .select("id,team_id,player_id,role_id,tour_id")
      .eq("team_id", currentUserTeamId)
      .eq("tour_id", currentTourId);

    if (error) throw error;
    teamPlayers = data || [];

    const roleIdToKey = {};
    ROLE_OPTIONS.forEach(opt => { if (opt.dbId) roleIdToKey[opt.dbId] = opt.key; });

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

// Отрисовка ростера
function renderRoster() {
  ROLE_OPTIONS.forEach(opt => {
    const slot = document.getElementById(`slot-${opt.key}`);
    if (!slot) return;

    if (opt.dbId) slot.dataset.roleId = opt.dbId;
    slot.dataset.roleKey = opt.key;

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

    const pl = players.find(x => String(x.id) === String(playerId));
    if (pl) {
      const img = document.createElement("img");
      img.src = pl.photo || DEFAULT_AVATAR;
      img.alt = pl.name || "Player";
      img.style.width = "50px";
      img.style.height = "50px";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";

      const name = document.createElement("div");
      name.className = "role-name";
      name.textContent = opt.label;

      const playerName = document.createElement("div");
      playerName.className = "player-name";
      playerName.textContent = pl.name;

      slot.appendChild(img);
      slot.appendChild(name);
      slot.appendChild(playerName);
    }
  });
}

// Удаление игрока из состава
function removePlayer(role) {
  if (!selectedRoles[role]) {
    showNotification(`Нет игрока для удаления в позиции ${role}`, false);
    return;
  }

  selectedRoles[role] = null;
  renderRoster();
  updateBudgetDisplay();
  saveRosterToDb();
}

// Функция для отображения уведомлений
function showNotification(message, isSuccess = true) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Обновление бюджета
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

// Назначение игрока в team_players
async function assignPlayerToRoleDb(teamId, playerId, roleDbId) {
  if (!ensureSupabase()) return false;
  if (!teamId || !playerId || !roleDbId || !currentTourId) {
    console.warn("assignPlayerToRoleDb: отсутствуют аргументы", { teamId, playerId, roleDbId, currentTourId });
    return false;
  }

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("team_players")
      .select("id,player_id")
      .eq("team_id", teamId)
      .eq("role_id", roleDbId)
      .eq("tour_id", currentTourId)
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing && existing.id) {
      const { error: updErr } = await supabase
        .from("team_players")
        .update({ player_id: playerId })
        .eq("id", existing.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from("team_players")
        .insert([{ team_id: teamId, player_id: playerId, role_id: roleDbId, tour_id: currentTourId }]);
      if (insErr) throw insErr;
    }

    const roleOpt = ROLE_OPTIONS.find(o => o.dbId === roleDbId);
    if (roleOpt) selectedRoles[roleOpt.key] = playerId;

    await loadTeamPlayers();
    renderRoster();
    updateBudgetDisplay();
    return true;
  } catch (err) {
    console.error("Ошибка при назначении игрока:", err);
    return false;
  }
}

// Сохранение состава
async function saveRosterToDb() {
  if (!currentUserTeamId) {
    showNotification("Невозможно сохранить — команда не найдена.", false);
    return;
  }

  for (const opt of ROLE_OPTIONS) {
    const roleId = opt.dbId;
    if (!roleId) continue;
    const playerId = selectedRoles[opt.key];
    if (!playerId) continue;
    await assignPlayerToRoleDb(currentUserTeamId, playerId, roleId);
  }

  showNotification("Состав успешно сохранен!");
}

// Инициализация страницы
document.addEventListener("DOMContentLoaded", async () => {
  if (!ensureSupabase()) return;

  await loadRolesFromDb();
  await loadCurrentUserAndTeam();
  await loadCurrentTour();
  await loadPlayersFromSupabase();
  await loadTeamPlayers();

  renderRoster();
  updateBudgetDisplay();

  const saveBtn = document.getElementById("save-roster");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      await saveRosterToDb();
      saveBtn.disabled = false;
    });
  }
});
