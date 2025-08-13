// dashboard.js — локальная демо-логика (без БД).
// Кнопки: раскрывают / сворачивают панели (независимо).
// Roster: тестовые игроки, превью, добавление в пул и назначение ролей.
import { supabase } from './supabaseClient.js';

const players = [
  { id:1, name:"Luka Dončić", team:"Slovenia", position:"G", price:15, points:32, photo:"https://upload.wikimedia.org/wikipedia/commons/1/1d/Luka_Doncic_2022.jpg" },
  { id:2, name:"Rudy Gobert", team:"France", position:"C", price:10, points:22, photo:"https://upload.wikimedia.org/wikipedia/commons/9/9e/Rudy_Gobert_France.jpg" },
  { id:3, name:"Nikola Jokić", team:"Serbia", position:"C", price:14, points:40, photo:"https://upload.wikimedia.org/wikipedia/commons/f/f5/Nikola_Jokic_Serbia.jpg" },
  { id:4, name:"Giannis Antetokounmpo", team:"Greece", position:"F", price:13, points:35, photo:"https://upload.wikimedia.org/wikipedia/commons/7/7b/Giannis_Antetokounmpo.jpg" }
];

// Логика открытия/закрытия панелей с анимацией
document.querySelectorAll('.par-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const targetId = btn.dataset.target;
    const panel = document.getElementById(targetId);

    // сворачиваем, если уже открыта
    if(panel.classList.contains('show')){
      panel.classList.remove('show');
    } else {
      panel.classList.add('show');
    }
  });
});


/* ===== ROSTER: render players list, preview and pool logic ===== */
const playersGrid = document.getElementById('players-grid');
const previewBox = document.getElementById('player-preview');
const playerPoolDiv = document.getElementById('player-pool');
const teamFilter = document.getElementById('team-filter');
const posFilter = document.getElementById('pos-filter');

let playerPool = [];
let selectedRoles = {}; // { roleName: playerId } — optional depending on UI
import { supabase } from './supabaseClient.js';

async function loadPlayers() {
    console.log('Загрузка игроков...');
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('last_name', { ascending: true });

    if (error) {
        console.error('Ошибка загрузки игроков:', error);
        return;
    }

    console.log('Игроки из БД:', data);
    renderPlayers(data);
}

function renderPlayers(players) {
    const tableBody = document.querySelector('#players-table tbody');
    tableBody.innerHTML = '';

    players.forEach(player => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><button class="add-player-btn" data-id="${player.id}">+</button></td>
            <td><img src="${player.photo_url || 'default-photo.png'}" alt="photo" class="player-photo"></td>
            <td>${player.first_name} ${player.last_name}</td>
            <td>$${player.price || 0}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
			<td>-</td>
            <td>-</td>
            <td>-</td>
        `;
        tableBody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', loadPlayers);

// init filters
(function initFilters(){
  const teams = [...new Set(players.map(p=>p.team))].sort();
  teams.forEach(t=>{
    const opt = document.createElement('option'); opt.value = t; opt.textContent = t;
    teamFilter.appendChild(opt);
  });
})();

function showPreview(p){
  previewBox.classList.remove('hidden');
  previewBox.innerHTML = `
    <img src="${p.photo}" alt="${p.name}">
    <h3>${p.name}</h3>
    <p>${p.team} — ${p.position}</p>
    <p>Цена: <strong>${p.price}M</strong></p>
  `;
}

function addToPool(player){
  if(playerPool.some(x=>x.id===player.id)){
    alert('Игрок уже в пуле');
    return;
  }
  // budget check
  const coins = playerPool.reduce((s,p)=>s+p.price,0) + player.price;
  if(playerPool.length >= 6 || coins > 60){ alert('Превышен лимит (6 игроков или 60 монет)'); return; }

  playerPool.push({...player});
  renderPool();
}

function renderPool(){
  playerPoolDiv.innerHTML = '';
  playerPool.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `
      <img src="${p.photo}" alt="">
      <div class="meta">
        <div class="name">${p.name}</div>
        <div class="sub">${p.team} • ${p.position}</div>
      </div>
      <select data-id="${p.id}">
        <option value="">Роль</option>
        <option>Скорер</option>
        <option>Ассистент</option>
        <option>Ребаундер</option>
        <option>Чернорабочий</option>
        <option>Всё включено</option>
        <option>Сюрприз</option>
      </select>
      <button class="small remove" data-id="${p.id}">✕</button>
    `;
    playerPoolDiv.appendChild(div);

    // role select
    div.querySelector('select').addEventListener('change', (e)=>{
      const role = e.target.value;
      // remove previous mapping of this player
      for(const r in selectedRoles) if(selectedRoles[r] === p.id) delete selectedRoles[r];
      if(role) selectedRoles[role] = p.id;
      updateTeamPoints();
    });

    // remove button
    div.querySelector('.remove').addEventListener('click', ()=>{
      playerPool = playerPool.filter(x=>x.id!==p.id);
      // remove roles mapped to this player
      for(const r in selectedRoles) if(selectedRoles[r] === p.id) delete selectedRoles[r];
      renderPool();
    });
  });

  // update summary
  const coins = playerPool.reduce((s,p)=>s+p.price,0);
  document.getElementById('coins-used').textContent = coins;
  updateTeamPoints();
}document.getElementById("save-team-btn").addEventListener("click", async () => {
  const user = (await supabase.auth.getUser()).data.user;
  const { data: teamPlayers } = await supabase
    .from("team_players")
    .select("player_id, role")
    .eq("team_id", currentTeamId);

  await supabase.from("user_rosters").upsert({
    user_id: user.id,
    players: teamPlayers,
    total_price: calculateTotalPrice(teamPlayers)
  });

  alert("Состав сохранён!");
});
 
async function loadPlayers() {
  const { data: players, error } = await supabase
    .from("players")
    .select("*")
    .order("last_name");

  if (error) {
    console.error(error);
    return;
  }

  renderPlayersTable(players);
}
async function addPlayerToTeam(playerId, role) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data: team } = await supabase
    .from("user_teams")
    .select("id")
    .eq("user_id", user.id)
    .single();

  await supabase.from("team_players").insert([
    { team_id: team.id, player_id: playerId, role: role }
  ]);

  loadTeamPlayers();
}

function calculateRolePoints(p, role){
  // demo uses p.points only (no detailed stats). Replace with real stats when available.
  const pts = p.points || 0;
  const ast = p.assists || 0;
  const reb = p.rebounds || 0;
  const blk = p.blocks || 0;
  const stl = p.steals || 0;
  const tov = p.turnovers || 0;

  const base = () => pts + ast*1.5 + reb*1.3 + blk*3 + stl*3 + tov*(-2);

  switch(role){
    case 'Скорер': return Math.round(pts*1.5 + ast*1.5 + reb*1.3 + blk*3 + stl*3 + tov*(-2));
    case 'Ассистент': return Math.round(pts + ast*3 + reb*1.3 + blk*3 + stl*3 + tov*(-2));
    case 'Ребаундер': return Math.round(pts + ast*1.5 + reb*2.6 + blk*3 + stl*3 + tov*(-2));
    case 'Чернорабочий': return Math.round(pts + ast*1.5 + reb*1.3 + blk*6 + stl*6 + tov*(-2));
    case 'Всё включено': {
      const b = base();
      return Math.round((pts>0 && ast>0 && reb>0 && blk>0 && stl>0) ? b+7 : b);
    }
    case 'Сюрприз': {
      const c = base();
      return Math.round(c >= 20 ? c+10 : c);
    }
    default: return Math.round(pts);
  }
}

function updateTeamPoints(){
  let total = 0;
  playerPool.forEach(p=>{
    // find role mapped
    let playerRole = '';
    for(const r in selectedRoles) if(selectedRoles[r] === p.id) { playerRole = r; break; }
    total += calculateRolePoints(p, playerRole);
  });
  document.getElementById('team-total').textContent = total;
}
document.addEventListener('DOMContentLoaded', () => {
    loadPlayers();
});

// filters
teamFilter.addEventListener('change', renderPlayersTable);
posFilter.addEventListener('change', renderPlayersTable);

// init
renderPlayersTable();
renderPool();
