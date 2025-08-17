// leaderboard.js
import { supabase } from './supabaseClient.js';

const leaderboardBody = document.getElementById('leaderboard-body');
const rosterPanel = document.getElementById('roster-panel');
const rosterList = document.getElementById('roster-list');

// Загрузка лидерборда
export async function loadLeaderboard() {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;

    const { data, error } = await supabase
      .from('user_teams')
      .select('id, team_name, total_points');

    if (error) {
      console.error('Ошибка загрузки лидерборда:', error);
      leaderboardBody.innerHTML = `<tr><td colspan="4">Ошибка загрузки</td></tr>`;
      return;
    }

    leaderboardBody.innerHTML = '';
    data
      .sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0))
      .forEach((team, index) => {
        const tr = document.createElement('tr');
        if (team.id === userId) tr.classList.add('me');
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${team.team_name}</td>
          <td>${team.total_points ?? 0}</td>
          <td><button data-id="${team.id}">Показать</button></td>
        `;
        leaderboardBody.appendChild(tr);
      });

    // Навешиваем обработчики на кнопки "Показать состав"
    document.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => showRoster(btn.dataset.id));
    });
  } catch (err) {
    console.error('Ошибка loadLeaderboard:', err);
  }
}

// Показ состава команды
export async function showRoster(teamId) {
  try {
    const { data, error } = await supabase
      .from('team_players')
      .select('players(name, club, photo)')
      .eq('team_id', teamId);

    if (error) {
      console.error('Ошибка загрузки состава:', error);
      return;
    }

    rosterList.innerHTML = '';

    if (!data || data.length === 0) {
      rosterList.innerHTML = '<div>Состав не найден</div>';
      rosterPanel.classList.add('hidden');
      return;
    }

    data.forEach(p => {
      const player = p.players;
      const card = document.createElement('div');
      card.className = 'roster-card';
      card.innerHTML = `
        <img src="${player.photo || 'image/ball.svg'}" alt="">
        <div class="name">${player.name}</div>
        <div class="club">${player.club}</div>
      `;
      rosterList.appendChild(card);
    });

    rosterPanel.classList.remove('hidden');
  } catch (err) {
    console.error('Ошибка showRoster:', err);
  }
}

// Автоматическая загрузка при подключении модуля
loadLeaderboard();
