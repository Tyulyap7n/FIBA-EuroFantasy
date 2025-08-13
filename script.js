/* script.js
 - Фильтры, пагинация (7 на страницу)
 - PROFILE превью с анимацией
 - Круговой селектор ролей
 - Назначение игрока в слоты (6 слотов)
 - NEW: загрузка игроков из Supabase (fallback — демо)
 - NEW: сохранение стартовой VI в Supabase
*/

// ====== DEMO fallback ======
let players = [
  { id:1, name:"Luka Dončić", price:12, avg:32, pts:160, reb:50, stl:8, blk:5, to:12, threes:20, country:"Slovenia", pos:"G", flag:"https://upload.wikimedia.org/wikipedia/commons/f/f0/Flag_of_Slovenia.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/1/1d/Luka_Doncic_2022.jpg" },
  { id:2, name:"Giannis Antetokounmpo", price:13, avg:28, pts:140, reb:70, stl:6, blk:9, to:15, threes:5, country:"Greece", pos:"F", flag:"https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/7/7b/Giannis_Antetokounmpo.jpg" },
  { id:3, name:"Nikola Jokić", price:14, avg:35, pts:175, reb:80, stl:7, blk:10, to:11, threes:12, country:"Serbia", pos:"C", flag:"https://upload.wikimedia.org/wikipedia/commons/f/ff/Flag_of_Serbia.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/f/f5/Nikola_Jokic_Serbia.jpg" },
  { id:4, name:"Rudy Gobert", price:10, avg:15, pts:75, reb:90, stl:2, blk:30, to:5, threes:0, country:"France", pos:"C", flag:"https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/9/9e/Rudy_Gobert_France.jpg" },
  { id:5, name:"Dennis Schröder", price:11, avg:18, pts:90, reb:20, stl:10, blk:1, to:8, threes:18, country:"Germany", pos:"G", flag:"https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/e/ef/Dennis_Schr%C3%B6der_FIBA.jpg" },
  { id:6, name:"Willy Hernangómez", price:9, avg:12, pts:60, reb:40, stl:1, blk:6, to:4, threes:1, country:"Spain", pos:"C", flag:"https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/1/10/Willy_Hernangomez_2022.jpg" },
  { id:7, name:"Evan Fournier", price:8, avg:14, pts:70, reb:15, stl:6, blk:1, to:6, threes:14, country:"France", pos:"G", flag:"https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/9/99/Evan_Fournier_France.jpg" }
];

// ====== Supabase load (если доступно) ======
async function tryLoadPlayersFromSupabase(){
  try{
    if(!window.supabase) return;
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("last_name", { ascending:true });
    if(error){ console.warn("Supabase players error:", error.message); return; }
    if(!Array.isArray(data) || data.length===0) return;

    // маппинг в формат UI (без ломки дизайна)
    players = data.map(p => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.display_name || `Player #${p.id}`,
      price: Number(p.price ?? 0),
      avg: Number(p.avg ?? p.average ?? 0),
      pts: Number(p.pts ?? p.points ?? 0),
      threes: Number(p.threes ?? p.three_pointers_made ?? 0),
      reb: Number(p.reb ?? p.rebounds ?? 0),
      stl: Number(p.stl ?? p.steals ?? 0),
      blk: Number(p.blk ?? p.blocks ?? 0),
      to: Number(p.to ?? p.turnovers ?? 0),
      country: p.country || p.nationality || "",
      pos: p.position || p.pos || "",
      flag: p.flag_url || "",
      photo: p.photo_url || p.avatar_url || "default-photo.png"
    }));
    resetAndRender();
  }catch(e){ console.error(e); }
}

// ====== Фильтры/пагинация/состояние ======
let filtered = [...players];
let currentPage = 1;
const perPage = 7;

let roleSlots = {
  "slot-Scorer": null,
  "slot-Assistant": null,
  "slot-Rebounder": null,
  "slot-Stopper": null,
  "slot-Shooter": null,
  "slot-Young": null
};
let activeRoleTarget = null;

const tbody = document.getElementById('players-tbody');            // <tbody id="players-tbody">
const filterCountry = document.getElementById('filter-country');
const filterPos = document.getElementById('filter-pos');
const filterSort = document.getElementById('filter-sort');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const preview = document.getElementById('player-preview');

// Круговой селектор — создаём один раз
const roleSelector = document.createElement('div');
roleSelector.id = 'role-selector';
roleSelector.className = 'role-selector';
roleSelector.innerHTML = `
  <button data-role="Скорер">SCORER</button>
  <button data-role="Ассистент">ASSISTANT</button>
  <button data-role="Ребаундер">REBOUNDER</button>
  <button data-role="Чернорабочий">STOPPER</button>
  <button data-role="Шутер">SHOOTER</button>
  <button data-role="Сюрприз">YOUNG</button>
`;
document.body.appendChild(roleSelector);

function uniqueCountries(){ return [...new Set(players.map(p => p.country).filter(Boolean))].sort(); }
function paginate(arr, page, per){ const total=Math.max(1, Math.ceil(arr.length/per)); const start=(page-1)*per; return { pageData: arr.slice(start,start+per), totalPages: total }; }

function initFilters(){
  // очистить страны, оставить "All"
  while (filterCountry.options.length > 1) filterCountry.remove(1);
  uniqueCountries().forEach(c => {
    const o=document.createElement('option'); o.value=c; o.textContent=c; filterCountry.appendChild(o);
  });
}

document.querySelectorAll('.par-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const targetId=btn.dataset.target;
    const panel=document.getElementById(targetId);
    const strip=btn.previousElementSibling;
    const isOpen=panel.classList.contains('show');
    document.querySelectorAll('.panel').forEach(p=>{ p.classList.remove('show'); p.style.removeProperty('--btn-offset'); });
    document.querySelectorAll('.strip').forEach(s=>s.classList.remove('expanded'));
    if(!isOpen){
      strip.classList.add('expanded');
      panel.classList.add('show');
      panel.style.setProperty('--btn-offset', `${btn.offsetHeight/2}px`);
    }
  });
});

function applyFiltersAndRender(){
  filtered = players.filter(p=>{
    if(filterCountry.value && p.country !== filterCountry.value) return false;
    if(filterPos.value && p.pos !== filterPos.value) return false;
    return true;
  });
  const sort = filterSort.value;
  if (sort==='price-asc')  filtered.sort((a,b)=>a.price-b.price);
  if (sort==='price-desc') filtered.sort((a,b)=>b.price-a.price);
  if (sort==='avg-desc')   filtered.sort((a,b)=>b.avg-a.avg);
  if (sort==='avg-asc')    filtered.sort((a,b)=>a.avg-b.avg);

  const { pageData, totalPages } = paginate(filtered, currentPage, perPage);
  if(currentPage>totalPages) currentPage=totalPages;

  tbody.innerHTML='';
  pageData.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><button class="add-btn" data-id="${p.id}">+</button></td>
      <td><img src="${p.photo}" alt=""></td>
      <td class="name-td" data-id="${p.id}">${p.name}</td>
      <td>${p.price}$</td>
      <td>${p.avg}</td>
      <td>${p.pts}</td>
      <td>${p.threes || 0}</td>
      <td>${p.reb}</td>
      <td>${p.stl}</td>
      <td>${p.blk}</td>
      <td>${p.to}</td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.name-td').forEach(td=>td.addEventListener('click', ()=>{
    const id=+td.dataset.id; showProfile(id);
  }));
  document.querySelectorAll('.add-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id=+btn.dataset.id; openRoleSelectorAt(id, btn);
    });
  });

  pageInfo.textContent = `${currentPage} / ${Math.max(1, Math.ceil(filtered.length/perPage))}`;
}

function showProfile(id){
  const p=players.find(x=>x.id===id); if(!p) return;
  document.getElementById('profile-photo').src=p.photo;
  document.getElementById('profile-name').textContent=p.name;
  document.getElementById('profile-country-pos').textContent=`${p.country || '—'} • ${p.pos || '—'}`;
  document.getElementById('profile-avg').textContent=p.avg;
  document.getElementById('profile-total').textContent=p.pts;
  document.getElementById('profile-picked').textContent=(Math.floor(Math.random()*100)) + '%';
  document.getElementById('profile-price').textContent=p.price + '$';
  document.getElementById('profile-flag').style.backgroundImage=`url(${p.flag || ''})`;
  preview.classList.remove('hidden');
  preview.scrollIntoView({behavior:'smooth', block:'center'});
}

function openRoleSelectorAt(playerId, btnElement){
  activeRoleTarget=playerId;
  // компактная круговая версия
  const selector=document.createElement('div');
  selector.className='role-selector-circle';
  selector.innerHTML=`
    <button class="center-btn"></button>
    <button class="role-btn" data-role="Скорер" style="--angle:0deg;">SCORER</button>
    <button class="role-btn" data-role="Ассистент" style="--angle:40deg;">ASSISTANT</button>
    <button class="role-btn" data-role="Ребаундер" style="--angle:140deg;">REBOUNDER</button>
    <button class="role-btn" data-role="Чернорабочий" style="--angle:180deg;">STOPPER</button>
    <button class="role-btn" data-role="Шутер" style="--angle:220deg;">SHOOTER</button>
    <button class="role-btn" data-role="Сюрприз" style="--angle:320deg;">SURPRISE</button>
  `;
  const rect=btnElement.getBoundingClientRect();
  selector.style.position='absolute';
  selector.style.left=`${rect.left + window.scrollX - 82}px`;
  selector.style.top =`${rect.top  + window.scrollY - 82}px`;
  selector.style.zIndex='1000';
  document.body.appendChild(selector);

  selector.querySelectorAll('.role-btn').forEach(roleBtn=>{
    roleBtn.addEventListener('click', ()=>{
      const role=roleBtn.dataset.role;
      const slotId=roleMap[role];
      assignPlayerToRole(activeRoleTarget, slotId);
      selector.remove();
    });
  });
  selector.querySelector('.center-btn').addEventListener('click', ()=> selector.remove());
}

document.addEventListener('click', (e)=>{
  if(!roleSelector.contains(e.target) && !e.target.classList.contains('add-btn')){
    roleSelector.classList.remove('show');
  }
});

const roleMap = {
  "Скорер":"slot-Scorer",
  "Ассистент":"slot-Assistant",
  "Ребаундер":"slot-Rebounder",
  "Чернорабочий":"slot-Stopper",
  "Шутер":"slot-Shooter",
  "Сюрприз":"slot-Young"
};
function canAssignRole(player, slotId){
  if(slotId==="slot-Young" && (player.price||0) > 7){
    alert("В роль 'Сюрприз' можно добавить игрока не дороже 7$!");
    return false;
  }
  return true;
}

function assignPlayerToRole(playerId, slotId){
  const p=players.find(x=>x.id===playerId); if(!p) return;
  if(!canAssignRole(p, slotId)) return;

  for(const s in roleSlots){ if(roleSlots[s] && roleSlots[s].id===playerId){ roleSlots[s]=null; } }
  const totalBudget=60;
  const currentSpent=Object.values(roleSlots).filter(x=>x).reduce((sum,pl)=>sum+(pl.price||0),0);
  const newTotal=currentSpent + (p.price||0) - ((roleSlots[slotId]?.price)||0);
  if(newTotal>totalBudget){ alert(`Нельзя превысить ${totalBudget}M!`); return; }
  roleSlots[slotId]=p;
  renderSlots();
}

function renderSlots(){
  const roleNames={
    "slot-Scorer":"SCORER","slot-Assistant":"ASSISTANT","slot-Rebounder":"REBOUNDER",
    "slot-Stopper":"STOPPER","slot-Shooter":"SHOOTER","slot-Young":"SURPRISE"
  };
  for(const slotId in roleSlots){
    const el=document.getElementById(slotId); if(!el) continue;
    const p=roleSlots[slotId];
    if(!p){
      el.innerHTML=`<div class="empty-slot">O</div><div class="role-name">${roleNames[slotId]}</div>`;
    }else{
      el.innerHTML=`
        <img src="${p.photo}" alt="${p.name}">
        <div class="slot-name">${p.name}</div>
        <div class="slot-price">${p.price}$</div>
        <div class="role-name">${roleNames[slotId]}</div>
        <button class="remove-btn" data-slot="${slotId}">✕</button>
      `;
    }
  }
  document.querySelectorAll('.remove-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const slotId=btn.dataset.slot; roleSlots[slotId]=null; renderSlots();
    });
  });
  updateCoinsSummary();
}

function calculateRolePoints(p, slotId){
  const base = (p.pts||0) + (p.reb||0)*1.3 + (p.stl||0)*3 + (p.blk||0)*3 + (p.to||0)*(-2);
  if(slotId==="slot-Shooter") return base + (p.threes||0)*3;
  return base;
}

function updateCoinsSummary(){
  const total=60;
  const used=Object.values(roleSlots).filter(x=>x).reduce((s,p)=>s+(p.price||0),0);
  const usedEl=document.getElementById('coins-used');
  const spentEl=document.getElementById('spent-money');
  if(usedEl) usedEl.textContent=used;
  if(spentEl) spentEl.textContent=used;
}

prevBtn.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; applyFiltersAndRender(); }});
nextBtn.addEventListener('click', ()=>{ const maxP=Math.max(1, Math.ceil(filtered.length/perPage)); if(currentPage<maxP){ currentPage++; applyFiltersAndRender(); }});
filterCountry.addEventListener('change', ()=>{ currentPage=1; applyFiltersAndRender(); });
filterPos.addEventListener('change', ()=>{ currentPage=1; applyFiltersAndRender(); });
filterSort.addEventListener('change', ()=>{ currentPage=1; applyFiltersAndRender(); });

// ====== Сохранение стартовой VI в Supabase ======
async function saveRosterToSupabase(){
  try{
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user){ alert("Нужно войти в аккаунт."); return; }

    // 1) команда пользователя (создадим, если нет)
    const { data: existingTeam, error: teamErr } = await supabase
      .from("user_teams")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if(teamErr){ throw teamErr; }

    let teamId = existingTeam?.id;
    if(!teamId){
      const { data: ins, error: insErr } = await supabase
        .from("user_teams")
        .insert([{ user_id: user.id, name: "Default" }])
        .select("id").single();
      if(insErr) throw insErr;
      teamId = ins.id;
    }

    // 2) перезаписываем связи team_players
    const selected = Object.entries(roleSlots)
      .filter(([,p]) => !!p)
      .map(([slotId, p]) => ({ team_id: teamId, player_id: p.id, role: slotId.replace('slot-','') }));

    // очистка прежних записей
    await supabase.from("team_players").delete().eq("team_id", teamId);
    if(selected.length){
      const { error: insTP } = await supabase.from("team_players").insert(selected);
      if(insTP) throw insTP;
    }

    // 3) сводная запись user_rosters (опционально)
    const totalPrice = selected.reduce((s, item)=>{
      const pl = players.find(pp=>pp.id===item.player_id); return s + (pl?.price||0);
    }, 0);
    await supabase.from("user_rosters").upsert({
      user_id: user.id,
      players: selected.map(x=>({ player_id:x.player_id, role:x.role })),
      total_price: totalPrice
    });

    alert("Состав сохранён!");
  }catch(e){
    console.error(e);
    alert("Не удалось сохранить состав: " + (e?.message || e));
  }
}
document.getElementById('save-roster')?.addEventListener('click', saveRosterToSupabase);

// ====== Начальная инициализация ======
function resetAndRender(){
  initFilters();
  currentPage=1;
  applyFiltersAndRender();
  renderSlots();
  updateCoinsSummary();
}

resetAndRender();
tryLoadPlayersFromSupabase(); // загружаем из БД, если доступно
