/* script.js — таблица, круговой селектор ролей, бюджет, ограничения */

// ====== Константы ======
const BUDGET_CAP = 60;
const DEFAULT_AVATAR = ""; // например "img/default.png"
// В script.js
const currentUser = { name: "Дмитрий Тюляпин" };
document.getElementById("user-name").textContent = currentUser.name;
const userNameElem = document.getElementById("user-name");
// допустим, currentUser = { name: "Дмитрий Тюляпин" }
if (userNameElem && currentUser) {
  userNameElem.textContent = currentUser.name;
}

const ROLE_OPTIONS = [
  { key: "Scorer",    label: "SCORER" },
  { key: "Assistant", label: "ASSISTANT" },
  { key: "Rebounder", label: "REBOUNDER" },
  { key: "Stopper",   label: "STOPPER" },
  { key: "Shooter",   label: "SHOOTER" },
  { key: "Young",     label: "SURPRISE", maxPrice: 7 } // price ≤ 7$
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

// ====== Демо-фолбек ======
let players = [
  { id: 1, name: "Demo Player", price: 10, avg: 20, pts: 100, reb: 50, stl: 5, blk: 5, to: 5, threes: 10, country: "DemoLand", pos: "G", flag: "", photo: "" }
];

// ====== Загрузка игроков из Supabase ======
async function loadPlayersFromSupabase() {
  try {
    if (!window.supabase) return;

    // Получаем игроков
    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, first_name, last_name, position, country, price, stats, photo_url");

    if (playersError) { console.error(playersError); return; }

    // Получаем статистику
    const { data: statsData, error: statsError } = await supabase
      .from("player_stats")
      .select("player_id, tour, points, threes, assists, rebounds, blocks, steals, turnover");

    if (statsError) { console.error(statsError); return; }

    // Группируем по игроку
    const statsByPlayer = {};
    statsData.forEach(s => {
      // объединяем туры 2 и 3
      const tour = (s.tour === 2 || s.tour === 3) ? 2 : s.tour;
      if (!statsByPlayer[s.player_id]) statsByPlayer[s.player_id] = [];
      statsByPlayer[s.player_id].push({ ...s, tour });
    });

    players = playersData.map(p => {
      const statsList = statsByPlayer[p.id] || [];
      const count = statsList.length || 1;
	const avgAvg = statsList.reduce((sum, s) => 
    sum + (
      (s.points || 0)
      + (s.assists || 0) * 1.5
      + (s.rebounds || 0) * 1.3
      + (s.steals || 0) * 3
      + (s.blocks || 0) * 3
      + (s.turnover || 0) * -3
      ), 0 ) / count;
	  const avgPoints = statsList.reduce((sum, s) => sum + (s.points || 0), 0) / count;
      const avgThrees = statsList.reduce((sum, s) => sum + (s.threes || 0), 0) / count;
      const avgAssists = statsList.reduce((sum, s) => sum + (s.assists || 0), 0) / count;
      const avgRebounds = statsList.reduce((sum, s) => sum + (s.rebounds || 0), 0) / count;
      const avgBlocks = statsList.reduce((sum, s) => sum + (s.blocks || 0), 0) / count;
      const avgSteals = statsList.reduce((sum, s) => sum + (s.steals || 0), 0) / count;
      const avgTurnover = statsList.reduce((sum, s) => sum + (s.turnover || 0), 0) / count;

      return {
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" "),
        price: Number(p.price ?? 0),
	    avg: Number(avgAvg.toFixed(1)),
        pts: avgPoints,
        threes: avgThrees,
        ast: avgAssists,
        reb: avgRebounds,
        blk: avgBlocks,
        stl: avgSteals,
        to: avgTurnover,
        country: p.country || "",
        pos: p.position || "",
        photo: p.photo_url || ""
      };
    });

  } catch(e) {
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
function getFilteredAndSortedPlayers() {
  const country = (document.getElementById("filter-country")?.value || "").trim();
  const pos     = (document.getElementById("filter-pos")?.value || "").trim();
  const sort    = (document.getElementById("filter-sort")?.value || "").trim();

  let list = Array.isArray(players) ? [...players] : [];

  if (country) list = list.filter(p => (p.country || "").toLowerCase() === country.toLowerCase());
  if (pos)     list = list.filter(p => (p.pos || "").toUpperCase() === pos.toUpperCase());

  if (sort) {
    switch(sort) {
      case "price-asc":  list.sort((a,b) => (a.price||0) - (b.price||0)); break;
      case "price-desc": list.sort((a,b) => (b.price||0) - (a.price||0)); break;
      case "avg-asc":    list.sort((a,b) => (a.avg||0) - (b.avg||0)); break;
      case "avg-desc":   list.sort((a,b) => (b.avg||0) - (a.avg||0)); break;
    }
  }

  return list;
}

function populateCountryFilter() {
  const sel = document.getElementById("filter-country");
  if (!sel) return;
  const countries = Array.from(new Set(players.map(p => (p.country||"").trim()).filter(Boolean))).sort();
  sel.innerHTML = `<option value="">All</option>` + countries.map(c => `<option value="${c}">${c}</option>`).join("");
}
function getPlayerStatsAvg(playerId) {
  const stats = player_stats.filter(ps => ps.player_id === playerId)
    .map(ps => {
      // объединяем туры 2 и 3
      const tour = (ps.tour === 2 || ps.tour === 3) ? 2 : ps.tour;
      return { ...ps, tour };
    });

  const count = stats.length;
  if (count === 0) return { pts: 0, threes: 0, ast: 0, reb: 0, blk: 0, stl: 0, to: 0 };

  return stats.reduce((acc, s) => {
    acc.pts += s.points ?? 0;
    acc.threes += s.threes ?? 0;
    acc.ast += s.assists ?? 0;
    acc.reb += s.rebounds ?? 0;
    acc.blk += s.blocks ?? 0;
    acc.stl += s.steals ?? 0;
    acc.to  += s.turnover ?? 0;
    return acc;
  }, { pts: 0, threes: 0, ast: 0, reb: 0, blk: 0, stl: 0, to: 0 });

  // делим на count
}
let currentPage = 1;
const playersPerPage = 8;

function renderPlayersTable() {
  const tbody = document.getElementById("players-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // получаем фильтрованных и отсортированных игроков
  const filteredPlayers = getFilteredAndSortedPlayers();
  
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
  const start = (currentPage - 1) * playersPerPage;
  const end = start + playersPerPage;
  const pagePlayers = filteredPlayers.slice(start, end);

  pagePlayers.forEach(p => {
    const tr = document.createElement("tr");
    tr.dataset.playerId = p.id;
    tr.innerHTML = `
      <td><button class="add-btn" data-id="${p.id}" aria-label="Add ${p.name}">+</button></td>
      <td>${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">` : ''}</td>
      <td>${p.name}</td><td>${p.price}$</td><td>${p.avg}</td>
      <td>${p.pts}</td><td>${p.threes}</td><td>${p.ast}</td><td>${p.reb}</td>
      <td>${p.stl}</td><td>${p.blk}</td><td>${p.to}</td>
    `;
    tbody.appendChild(tr);
  });

  // обработчики клика на строки
  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", e => {
      if (e.target.closest(".add-btn")) return;
      const playerId = tr.dataset.playerId;
      const player = players.find(p => String(p.id) === String(playerId));
      if (player) showPlayerPreview(player);
    });
  });

  // обновляем инфо о странице
  const pageInfo = document.getElementById("page-info");
  if (pageInfo) pageInfo.textContent = `${currentPage} / ${totalPages}`;

  // активируем/деактивируем кнопки
  document.getElementById("prev-page").disabled = currentPage <= 1;
  document.getElementById("next-page").disabled = currentPage >= totalPages;
}
// кнопки пагинации
document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPlayersTable();
  }
});
document.getElementById("next-page").addEventListener("click", () => {
  const filteredPlayers = getFilteredAndSortedPlayers();
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderPlayersTable();
  }
});



// ====== Фильтры ======
function initTableFilters() {
  ["filter-country","filter-pos","filter-sort"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", renderPlayersTable);
  });
}

// ====== Добавление на роль ======
function roleOfPlayer(playerId) {
  return Object.entries(selectedRoles).find(([,id]) => String(id)===String(playerId))?.[0] || null;
}

function getSpentCoins(nextMap=null) {
  const map = nextMap || selectedRoles;
  const ids = new Set(Object.values(map).filter(Boolean));
  return Array.from(ids).reduce((sum,id) => {
    const p = players.find(pl => String(pl.id)===String(id));
    return sum + (p?.price||0);
  },0);
}

function updateBudgetDisplay() {
  const spentEl = document.getElementById("spent-money");
  if (spentEl) spentEl.textContent = String(getSpentCoins());
}

function updateRoleSlotsUI() {
  ROLE_OPTIONS.forEach(opt => {
    const slot = document.getElementById(`slot-${opt.key}`);
    if (!slot) return;

    const playerId = selectedRoles[opt.key];
    const avatar = slot.querySelector("img");
    const empty = slot.querySelector(".empty-slot");
    const nameDiv = slot.querySelector(".role-name");

    if (!playerId) {
      if (avatar) avatar.remove();
      if (!empty) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "empty-slot"; emptyDiv.textContent = "—";
        slot.insertBefore(emptyDiv,nameDiv||null);
      }
      if (nameDiv) nameDiv.textContent = opt.label;
      return;
    }

    const player = players.find(p => String(p.id)===String(playerId));
    if (!player) return;

    if (!avatar) {
      const img = document.createElement("img");
      img.src = player.photo || DEFAULT_AVATAR; img.alt = player.name||"Player";
      slot.insertBefore(img,nameDiv||null);
    } else avatar.src = player.photo || DEFAULT_AVATAR;

    if (nameDiv) nameDiv.textContent = opt.label;
    if (empty) empty.remove();
  });
}

// ====== Назначение игрока на роль (с проверками) ======
function assignPlayerToRole(player, roleKey) {
  const existingRole = roleOfPlayer(player.id);
  if (existingRole && existingRole !== roleKey) {
    alert("Этот игрок уже выбран для другой роли.");
    return false;
  }

  const roleDef = ROLE_OPTIONS.find(r => r.key === roleKey);
  if (roleDef?.key === "Young" && player.price > (roleDef.maxPrice || 7)) {
    alert(`Для роли SURPRISE допускаются игроки ценой не дороже $${roleDef.maxPrice || 7}.`);
    return false;
  }

  const next = { ...selectedRoles, [roleKey]: player.id };
  const nextSpent = getSpentCoins(next);
  if (nextSpent > BUDGET_CAP) {
    alert(`Превышен бюджет. Лимит: ${BUDGET_CAP}$, получилось: ${nextSpent}$.`);
    return false;
  }

  // Применяем назначение
  selectedRoles[roleKey] = player.id;
  updateBudgetDisplay();
  updateRoleSlotsUI();

  // Скрываем карточку игрока, если она открыта
  const preview = document.getElementById("player-preview");
  if (preview && preview.classList.contains("show")) {
    hidePlayerPreview();
  }

  return true;
}

// ====== Круговой селектор ролей ======
let selectorOverlay=null, selectorEl=null;

function openRoleSelector(triggerBtn, player) {
  closeRoleSelector();

  selectorOverlay = document.createElement("div"); selectorOverlay.className="role-overlay";
  selectorOverlay.addEventListener("click", closeRoleSelector);

  selectorEl = document.createElement("div"); selectorEl.className="role-selector";
  selectorEl.setAttribute("role","dialog"); selectorEl.setAttribute("aria-label","Выбор роли");
  selectorEl.style.position="fixed";

  const rect = triggerBtn.getBoundingClientRect(); const size=220;
  let left = Math.max(8, Math.min(rect.left + rect.width/2 - size/2, window.innerWidth-size-8));
  let top  = Math.max(8, Math.min(rect.top  + rect.height/2 - size/2, window.innerHeight-size-8));
  selectorEl.style.left=`${left}px`; selectorEl.style.top=`${top}px`; selectorEl.style.width=`${size}px`; selectorEl.style.height=`${size}px`;

  const rolesToShow = ROLE_OPTIONS.filter(r=>!(r.key==="Young" && player.price>(r.maxPrice||7)));
  const R = 80;
  rolesToShow.forEach((opt,i)=>{
    const angle = (i/rolesToShow.length)*(Math.PI*2)-Math.PI/2;
    const bw=90,bh=40;
    const x=size/2+R*Math.cos(angle)-bw/2;
    const y=size/2+R*Math.sin(angle)-bh/2;

    const b = document.createElement("button");
    b.textContent=opt.label;
    b.style.position="absolute"; b.style.left=`${x}px`; b.style.top=`${y}px`;
    b.addEventListener("click", ev=>{ ev.stopPropagation(); if(assignPlayerToRole(player,opt.key)) closeRoleSelector(); });
    selectorEl.appendChild(b);
  });

  document.body.appendChild(selectorOverlay); document.body.appendChild(selectorEl);
  requestAnimationFrame(()=>{ selectorOverlay.classList.add("show"); selectorEl.classList.add("show"); });

  document.addEventListener("keydown", escCloseOnce);
  window.addEventListener("resize", closeRoleSelector,{once:true});
  window.addEventListener("scroll", closeRoleSelector,{once:true});
}

function escCloseOnce(e){ if(e.key==="Escape") closeRoleSelector(); }

function closeRoleSelector(){
  if(selectorOverlay){ selectorOverlay.classList.remove("show"); setTimeout(()=>selectorOverlay?.remove(),180); selectorOverlay=null; }
  if(selectorEl){ selectorEl.classList.remove("show"); setTimeout(()=>selectorEl?.remove(),180); selectorEl=null; }
  document.removeEventListener("keydown", escCloseOnce);
}

// ====== Делегирование клика "+" ======
function initAddButtonDelegation() {
  const tbody=document.getElementById("players-tbody"); if(!tbody)return;
  tbody.addEventListener("click", e=>{
    const btn=e.target.closest(".add-btn"); if(!btn)return;
    const id=btn.getAttribute("data-id");
    const player=players.find(pl=>String(pl.id)===String(id));
    if(player) openRoleSelector(btn,player);
  });
}

// ====== TOGGLE rules/scoring/roster ======
(function(){
  function togglePanel(btn){
    const targetId=btn?.dataset?.target; if(!targetId)return;
    const panel=document.getElementById(targetId); if(!panel)return;
    const wrap=btn.closest(".strip-wrapper");
    const strip=wrap?.querySelector(".strip");

    document.querySelectorAll(".panel.show").forEach(p=>{ if(p!==panel)p.classList.remove("show"); });
    document.querySelectorAll(".par-btn.active").forEach(b=>{ if(b!==btn){ b.classList.remove("active"); b.setAttribute("aria-expanded","false"); } });
    document.querySelectorAll(".strip.expanded").forEach(s=>{ if(s!==strip)s.classList.remove("expanded"); });

    const isOpen=panel.classList.toggle("show");
    if(isOpen){ strip?.classList.add("expanded"); btn.classList.add("active"); btn.setAttribute("aria-expanded","true"); panel.setAttribute("aria-hidden","false"); panel.scrollIntoView({behavior:"smooth",block:"start"});}
    else{ strip?.classList.remove("expanded"); btn.classList.remove("active"); btn.setAttribute("aria-expanded","false"); panel.setAttribute("aria-hidden","true"); }
  }

  function initParButtons(){
    document.querySelectorAll(".panel").forEach(p=>{ p.setAttribute("role","region"); p.setAttribute("aria-hidden","true"); });
    document.addEventListener("click", e=>{ const btn=e.target.closest(".par-btn"); if(btn){ e.preventDefault(); togglePanel(btn); } });
    const hashId=location.hash?.slice(1);
    if(hashId){ const btn=document.querySelector(`.par-btn[data-target="${hashId}"]`); if(btn) togglePanel(btn);}
  }

  if(document.readyState==="loading"){ document.addEventListener("DOMContentLoaded", initParButtons);}
  else initParButtons();
})();

// ====== INIT ======
document.addEventListener("DOMContentLoaded", async ()=>{
  await checkAuth();
  await loadPlayersFromSupabase();
  populateCountryFilter();
  initTableFilters();
  renderPlayersTable();
  initAddButtonDelegation();
  updateRoleSlotsUI();
  updateBudgetDisplay();
  if(typeof initParButtons==="function") initParButtons();
});
