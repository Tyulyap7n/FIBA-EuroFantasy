// ===== dashboard.js =====
import { supabase } from './supabaseClient.js';

// --- Проверка авторизации ---
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = 'index.html';
  } else {
    document.getElementById('logged-user').textContent = user.email;
  }
}
checkAuth();

// --- Выход ---
document.getElementById('signout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
});

// --- Загрузка игроков (пример) ---
async function loadPlayers() {
  // !!! Поменяй 'players' на реальное название своей таблицы в Supabase
  const { data, error } = await supabase
    .from('players')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.getElementById('players-grid');
  tbody.innerHTML = '';

  data.forEach(player => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${player.name}</td>
      <td>${player.position}</td>
      <td>${player.points}</td>
      <td>${player.assists}</td>
      <td>${player.rebounds}</td>
      <td>${player.role || ''}</td>
      <td><button class="btn small" onclick="addToTeam('${player.id}')">Добавить</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Добавление игрока в команду ---
window.addToTeam = async function(playerId) {
  // !!! Поменяй 'user_team' на название таблицы, где хранятся команды пользователей
  const { error } = await supabase
    .from('user_team')
    .insert([{ player_id: playerId }]);

  if (error) {
    console.error(error);
  } else {
    loadTeam();
  }
};

// --- Загрузка команды ---
async function loadTeam() {
  const { data, error } = await supabase
    .from('user_team')
    .select(`
      id,
      players ( name, points )
    `);

  if (error) {
    console.error(error);
    return;
  }

  const pool = document.getElementById('player-pool');
  const scoreEl = document.getElementById('team-total');
  pool.innerHTML = '';

  let total = 0;
  data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'player-card';
    div.textContent = `${item.players.name} (${item.players.points} очков)`;
    pool.appendChild(div);
    total += item.players.points;
  });

  scoreEl.textContent = total;
}

// Загружаем всё при входе
loadPlayers();
loadTeam();
