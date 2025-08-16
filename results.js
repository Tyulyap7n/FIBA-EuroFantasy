const SUPABASE_URL = 'https://xovxokupvsnnjtskdgvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdnhva3VwdnNubmp0c2tkZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDk4NjMsImV4cCI6MjA3MDQyNTg2M30.Vl5Z9DABFmHQWGtfbyuAZGGgfX4hDYGAPD8C7fr540E';
import { createClient } from '@supabase/supabase-js'
let query = supabase
  .from('team_players')
  .select(`
    role:roles(name),
    player:players(first_name,last_name,stats)
  `)
  .eq('team_id', userTeamId);

if (selectedTour) {
  query = query.eq('player_stats.tour', selectedTour);
}

let { data, error } = await query;

// Подставь свои данные Supabase
const supabase = createClient('https://xovxokupvsnnjtskdgvr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdnhva3VwdnNubmp0c2tkZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDk4NjMsImV4cCI6MjA3MDQyNTg2M30.Vl5Z9DABFmHQWGtfbyuAZGGgfX4hDYGAPD8C7fr540E')

const tourSelect = document.getElementById('tourSelect')
const tbody = document.getElementById('resultsTable').querySelector('tbody')
const teamId = 1 // сюда подставь ID команды пользователя (например из авторизации)
// results.js
// results.js
document.addEventListener('DOMContentLoaded', async () => {
  const tourSelect = document.getElementById('tourSelect');
  const resultsTableBody = document.querySelector('#resultsTable tbody');

  async function loadResults() {
    const selectedTour = tourSelect.value ? parseInt(tourSelect.value) : null;
    const user = supabase.auth.user(); // текущий пользователь

    const { data, error } = await supabase
      .rpc('get_team_results', { p_user_id: user.id, p_tour: selectedTour });

    if (error) {
      console.error(error);
      resultsTableBody.innerHTML = `<tr><td colspan="3">Ошибка загрузки данных</td></tr>`;
      return;
    }

    resultsTableBody.innerHTML = '';
    if (!data || data.length === 0) {
      resultsTableBody.innerHTML = `<tr><td colspan="3">Нет данных</td></tr>`;
      return;
    }

    data.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.role_name}</td>
        <td>${item.first_name} ${item.last_name}</td>
        <td>${item.points}</td>
      `;
      resultsTableBody.appendChild(tr);
    });
  }

  tourSelect.addEventListener('change', loadResults);

  // Загрузка при старте
  loadResults();
});


// Функция получения результатов
async function getTeamResults(teamId, tour = null) {
  let { data: teamPlayers, error } = await supabase
    .from('team_players')
    .select(`
      role:roles(name),
      player:players(first_name, last_name),
      stats:player_stats(points, tour)
    `)
    .eq('team_id', teamId)

  if (error) {
    console.error(error)
    return []
  }

  const resultsMap = {}

  teamPlayers.forEach(tp => {
    const playerName = `${tp.player.first_name} ${tp.player.last_name}`
    const roleName = tp.role.name

    // Фильтруем статистику по туру, если указан
    const filteredStats = tour
      ? tp.stats.filter(s => s.tour === tour)
      : tp.stats

    const totalPoints = filteredStats.reduce((sum, s) => sum + (s.points || 0), 0)

    resultsMap[playerName] = {
      role: roleName,
      points: totalPoints
    }
  })

  return Object.entries(resultsMap).map(([playerName, { role, points }]) => ({
    playerName,
    role,
    points
  })).sort((a, b) => b.points - a.points)
}

// Функция рендера таблицы
async function renderResults() {
  const tour = tourSelect.value ? parseInt(tourSelect.value) : null
  const results = await getTeamResults(teamId, tour)

  tbody.innerHTML = ''
  results.forEach(r => {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${r.role}</td><td>${r.playerName}</td><td>${r.points}</td>`
    tbody.appendChild(tr)
  })
}

// Событие изменения тура
tourSelect.addEventListener('change', renderResults)

// Начальная загрузка
renderResults()
