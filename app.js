const players = [
  { id: 1, name: "Luka Dončić", country: "Slovenia", position: "G", points: 32, price: 12, photo: "https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/3945274.png&w=350&h=254https://upload.wikimedia.org/wikipedia/commons/1/1d/Luka_Doncic_2022.jpg", performance: [28, 34, 30, 35, 33] },
  { id: 2, name: "Rudy Gobert", country: "France", position: "C", points: 22, price: 10, photo: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Rudy_Gobert_France.jpg", performance: [20, 21, 19, 24, 26] },
  { id: 3, name: "Dennis Schröder", country: "Germany", position: "G", points: 28, price: 11, photo: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Dennis_Schr%C3%B6der_FIBA.jpg", performance: [27, 30, 29, 28, 26] },
  { id: 4, name: "Willy Hernangómez", country: "Spain", position: "C", points: 24, price: 9, photo: "https://upload.wikimedia.org/wikipedia/commons/1/10/Willy_Hernangomez_2022.jpg", performance: [22, 25, 26, 23, 24] },
  { id: 5, name: "Nikola Jokić", country: "Serbia", position: "C", points: 40, price: 14, photo: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Nikola_Jokic_Serbia.jpg", performance: [38, 42, 39, 41, 40] },
  { id: 6, name: "Giannis Antetokounmpo", country: "Greece", position: "F", points: 35, price: 13, photo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Giannis_Antetokounmpo.jpg", performance: [33, 36, 34, 37, 35] },
  { id: 7, name: "Evan Fournier", country: "France", position: "G", points: 21, price: 8, photo: "https://upload.wikimedia.org/wikipedia/commons/9/99/Evan_Fournier_France.jpg", performance: [20, 22, 21, 23, 19] },
  { id: 8, name: "Domantas Sabonis", country: "Lithuania", position: "F", points: 27, price: 11, photo: "https://upload.wikimedia.org/wikipedia/commons/f/f7/Domantas_Sabonis_Lithuania.jpg", performance: [26, 28, 29, 27, 25] },
  { id: 9, name: "Patty Mills", country: "Australia", position: "G", points: 19, price: 7, photo: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Patty_Mills_Australia.jpg", performance: [18, 20, 19, 21, 18] },
  { id: 10, name: "Bogdan Bogdanović", country: "Serbia", position: "G", points: 26, price: 10, photo: "https://upload.wikimedia.org/wikipedia/commons/7/72/Bogdan_Bogdanovic_Serbia.jpg", performance: [25, 27, 26, 24, 28] }
];

let playerPool = [];
let selectedRoles = {};
let totalCoins = 0;

const playersGrid = document.getElementById('players-grid');
const previewBox = document.getElementById('player-preview');
const totalPointsSpan = document.getElementById('total-points');
const coinsUsedSpan = document.getElementById('coins-used');
const playerPoolDiv = document.getElementById('player-pool');

let currentPage = 1;
const perPage = 10;

function renderPlayers() {
  playersGrid.innerHTML = '';
  const start = (currentPage - 1) * perPage;
  const paginated = players.slice(start, start + perPage);

  paginated.forEach(player => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${player.photo}" width="40"/></td>
      <td class="player-name" data-id="${player.id}">${player.name}</td>
      <td>${player.country}</td>
      <td>${player.position}</td>
      <td>${player.points}</td>
      <td>${player.price}M</td>
      <td><button class="${playerPool.some(p => p.id === player.id) ? 'remove-button' : 'select-button'}" data-id="${player.id}">${playerPool.some(p => p.id === player.id) ? 'Убрать' : 'Выбрать'}</button></td>
    `;
    playersGrid.appendChild(row);
  });

  document.querySelectorAll('.player-name').forEach(el => {
    el.addEventListener('click', () => showPreview(players.find(p => p.id == el.dataset.id)));
  });

  document.querySelectorAll('.select-button, .remove-button').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = parseInt(e.target.dataset.id);
      const player = players.find(p => p.id === id);
      if (playerPool.some(p => p.id === id)) {
        playerPool = playerPool.filter(p => p.id !== id);
        for (let role in selectedRoles) {
          if (selectedRoles[role]?.id === id) delete selectedRoles[role];
        }
      } else {
        if (playerPool.length < 6 && totalCoins + player.price <= 69) {
          playerPool.push(player);
        } else {
          alert("Превышен лимит: максимум 6 игроков или 69 монет");
        }
      }
      updatePool();
      renderPlayers();
    });
  });

  document.getElementById('page-info').textContent = `${currentPage} / ${Math.ceil(players.length / perPage)}`;
}
// --- Новые переменные ---
let sortOption = '';
let filterCountry = '';
let filterPosition = '';

// --- Заполняем фильтр стран ---
const countryFilter = document.getElementById('country-filter');
const countries = [...new Set(players.map(p => p.country))];
countries.forEach(c => {
  const opt = document.createElement('option');
  opt.value = c;
  opt.textContent = c;
  countryFilter.appendChild(opt);
});

// --- Обработчики фильтров и сортировки ---
document.getElementById('sort-select').addEventListener('change', e => {
  sortOption = e.target.value;
  currentPage = 1;
  renderPlayers();
});

countryFilter.addEventListener('change', e => {
  filterCountry = e.target.value;
  currentPage = 1;
  renderPlayers();
});

document.getElementById('position-filter').addEventListener('change', e => {
  filterPosition = e.target.value;
  currentPage = 1;
  renderPlayers();
});
// ===== Функция обновления ролей (вставить в самый верх app.js, до renderPlayers и updatePool) =====
function updateRolesUI() {
  document.querySelectorAll('.role-slot').forEach(slot => {
    const roleId = slot.dataset.roleId;
    const player = selectedRoles[roleId];
    const front = slot.querySelector('.role-front');
    const roleName = slot.dataset.roleName;

    if (player) {
      front.innerHTML = `<img src="${player.photo}" width="40"/><div>${player.name}</div>`;
    } else {
      front.innerHTML = `<strong>${roleName}</strong>`;
    }
  });
}


// --- Модификация renderPlayers ---
function renderPlayers() {
  playersGrid.innerHTML = '';

  // 1. Фильтрация
  let filtered = players.filter(p => {
    let countryOk = filterCountry ? p.country === filterCountry : true;
    let positionOk = filterPosition ? p.position === filterPosition : true;
    return countryOk && positionOk;
  });

  // 2. Сортировка
  if (sortOption === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (sortOption === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (sortOption === 'points-asc') filtered.sort((a, b) => a.points - b.points);
  if (sortOption === 'points-desc') filtered.sort((a, b) => b.points - a.points);

  // 3. Пагинация
  const start = (currentPage - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  // 4. Отрисовка
  paginated.forEach(player => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${player.photo}" width="40"/></td>
      <td class="player-name" data-id="${player.id}">${player.name}</td>
      <td>${player.country}</td>
      <td>${player.position}</td>
      <td>${player.points}</td>
      <td>${player.price}M</td>
      <td><button class="${playerPool.some(p => p.id === player.id) ? 'remove-button' : 'select-button'}" data-id="${player.id}">${playerPool.some(p => p.id === player.id) ? 'Убрать' : 'Выбрать'}</button></td>
    `;
    playersGrid.appendChild(row);
  });

  // 5. Остальное как было...
  document.querySelectorAll('.player-name').forEach(el => {
    el.addEventListener('click', () => showPreview(players.find(p => p.id == el.dataset.id)));
  });



  document.querySelectorAll('.select-button, .remove-button').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = parseInt(e.target.dataset.id);
      const player = players.find(p => p.id === id);
      if (playerPool.some(p => p.id === id)) {
        playerPool = playerPool.filter(p => p.id !== id);
        for (let role in selectedRoles) {
          if (selectedRoles[role]?.id === id) delete selectedRoles[role];
        }
      } else {
        if (playerPool.length < 6 && totalCoins + player.price <= 69) {
          playerPool.push(player);
        } else {
          alert("Превышен лимит: максимум 6 игроков или 69 монет");
        }
      }
      updatePool();
      renderPlayers();
    });
  });

  document.getElementById('page-info').textContent = `${currentPage} / ${Math.ceil(filtered.length / perPage)}`;
}
// Открытие модалки
document.getElementById('rules-btn').addEventListener('click', () => {
  document.getElementById('rules-modal').classList.remove('hidden');
});

// Закрытие модалки
document.getElementById('close-rules').addEventListener('click', () => {
  document.getElementById('rules-modal').classList.add('hidden');
});

// Закрытие при клике вне окна
document.getElementById('rules-modal').addEventListener('click', (e) => {
  if (e.target.id === 'rules-modal') {
    document.getElementById('rules-modal').classList.add('hidden');
  }
});

function showPreview(player) {
  previewBox.classList.remove('hidden');
  previewBox.innerHTML = `
    <img src="${player.photo}"/>
    <h3>${player.name}</h3>
    <p>${player.country} | ${player.position}</p>
    <canvas id="chart" width="200" height="100"></canvas>
  `;
  const ctx = document.getElementById('chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels: ["G1","G2","G3","G4","G5"], datasets: [{ data: player.performance, borderColor: '#00e6e6', tension: 0.3 }] },
    options: { plugins: { legend: { display: false } } }
  });
}

function updatePool() {
  playerPoolDiv.innerHTML = '';
  totalCoins = playerPool.reduce((sum, p) => sum + p.price, 0);
  totalPointsSpan.textContent = playerPool.reduce((sum, p) => sum + p.points, 0);
  coinsUsedSpan.textContent = totalCoins;

  playerPool.forEach(player => {
    const card = document.createElement('div');
    card.className = 'player-pool-card';

    // Найти роль этого игрока (если назначена)
    let currentRole = '';
    for (let role in selectedRoles) {
      if (selectedRoles[role]?.id === player.id) {
        currentRole = role;
        break;
      }
    }

    card.innerHTML = `
      <img src="${player.photo}" width="30"/>
      <span>${player.name}</span>
      <select data-id="${player.id}">
        <option value="">Роль</option>
        <option value="scorer" ${currentRole === 'scorer' ? 'selected' : ''}>Скорер</option>
        <option value="assistant" ${currentRole === 'assistant' ? 'selected' : ''}>Ассистент</option>
        <option value="rebounder" ${currentRole === 'rebounder' ? 'selected' : ''}>Ребаундер</option>
        <option value="dirty" ${currentRole === 'dirty' ? 'selected' : ''}>Чернорабочий</option>
        <option value="allaround" ${currentRole === 'allaround' ? 'selected' : ''}>Всё включено</option>
        <option value="surprise" ${currentRole === 'surprise' ? 'selected' : ''}>Сюрприз</option>
      </select>
    `;

    card.querySelector('select').addEventListener('change', e => {
      const role = e.target.value;

      // Удаляем старую роль, если этот игрок уже где-то стоял
      for (let r in selectedRoles) {
        if (selectedRoles[r]?.id === player.id) {
          delete selectedRoles[r];
        }
      }

      // Если выбрали новую роль — назначаем
      if (role) {
        selectedRoles[role] = player;
      }

      updateRolesUI();
    });

    playerPoolDiv.appendChild(card);
  });

  updateRolesUI();
}
// Пересчёт очков команды
function updateTeamPoints() {
  const totalPoints = playerPool.reduce((sum, player) => sum + player.points, 0);
  document.getElementById('total-points').textContent = totalPoints;
}

// Пример обновления очков конкретного игрока во время матча
function updatePlayerPoints(playerId, newPoints) {
  const player = playerPool.find(p => p.id === playerId);
  if (player) {
    player.points = newPoints;
    updateTeamPoints(); // пересчёт после изменения
  }
}

// Пример: симуляция обновления очков во время матча
setInterval(() => {
  if (playerPool.length > 0) {
    const randomPlayer = playerPool[Math.floor(Math.random() * playerPool.length)];
    randomPlayer.points += Math.floor(Math.random() * 3); // добавляем 0-2 очка
    updateTeamPoints();
  }
}, 5000); // каждые 5 секунд



function assignRole(role, player) {
  for (let r in selectedRoles) {
    if (selectedRoles[r]?.id === player.id) {
      delete selectedRoles[r];
    }
  }
  selectedRoles[role] = player;
}




document.getElementById('prev-page').addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; renderPlayers(); }
});
document.getElementById('next-page').addEventListener('click', () => {
  if (currentPage < Math.ceil(players.length / perPage)) { currentPage++; renderPlayers(); }
});

renderPlayers();
