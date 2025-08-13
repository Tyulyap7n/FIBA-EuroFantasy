/* script.js
 - Тестовые данные (15 игроков)
 - Фильтры, пагинация (7 на страницу)
 - PROFILE превью с анимацией
 - Кнопка + открывает круговой селектор ролей (анимация)
 - Назначение игрока в слот роли (6 слотов)
*/

const players = [
  { id:1, name:"Luka Dončić", price:12, avg:32, pts:160, reb:50, stl:8, blk:5, to:12, threes:20, country:"Slovenia", pos:"G", flag:"https://upload.wikimedia.org/wikipedia/commons/f/f0/Flag_of_Slovenia.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/1/1d/Luka_Doncic_2022.jpg" },
  { id:2, name:"Giannis Antetokounmpo", price:13, avg:28, pts:140, reb:70, stl:6, blk:9, to:15, threes:5, country:"Greece", pos:"F", flag:"https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/7/7b/Giannis_Antetokounmpo.jpg" },
  { id:3, name:"Nikola Jokić", price:14, avg:35, pts:175, reb:80, stl:7, blk:10, to:11, threes:12, country:"Serbia", pos:"C", flag:"https://upload.wikimedia.org/wikipedia/commons/f/ff/Flag_of_Serbia.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/f/f5/Nikola_Jokic_Serbia.jpg" },
  { id:4, name:"Rudy Gobert", price:10, avg:15, pts:75, reb:90, stl:2, blk:30, to:5, threes:0, country:"France", pos:"C", flag:"https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/9/9e/Rudy_Gobert_France.jpg" },
  { id:5, name:"Dennis Schröder", price:11, avg:18, pts:90, reb:20, stl:10, blk:1, to:8, threes:18, country:"Germany", pos:"G", flag:"https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/e/ef/Dennis_Schr%C3%B6der_FIBA.jpg" },
  { id:6, name:"Willy Hernangómez", price:9, avg:12, pts:60, reb:40, stl:1, blk:6, to:4, threes:1, country:"Spain", pos:"C", flag:"https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/1/10/Willy_Hernangomez_2022.jpg" },
  { id:7, name:"Evan Fournier", price:8, avg:14, pts:70, reb:15, stl:6, blk:1, to:6, threes:14, country:"France", pos:"G", flag:"https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg", photo:"https://upload.wikimedia.org/wikipedia/commons/9/99/Evan_Fournier_France.jpg" }
  // ... остальные игроки аналогично с полем threes
];

let filtered = [...players];
let currentPage = 1;
const perPage = 7;
let roleSlots = {
  "slot-Scorer": null,
  "slot-Assistant": null,
  "slot-Rebounder": null,
  "slot-Stopper": null,
  "slot-Shooter": null, // заменили Всё включено на Шутер
  "slot-Young": null
};
let activeRoleTarget = null;
// Создаём селектор один раз
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

const tbody = document.getElementById('players-tbody');
const filterCountry = document.getElementById('filter-country');
const filterPos = document.getElementById('filter-pos');
const filterSort = document.getElementById('filter-sort');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const preview = document.getElementById('player-preview');

function uniqueCountries() {
  return [...new Set(players.map(p => p.country))].sort();
}
function paginate(arr, page, per) {
  const total = Math.max(1, Math.ceil(arr.length / per));
  const start = (page - 1) * per;
  return { pageData: arr.slice(start, start + per), totalPages: total };
}

function initFilters() {
  uniqueCountries().forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    filterCountry.appendChild(o);
  });
}
initFilters();

document.querySelectorAll('.par-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const panel = document.getElementById(targetId);
    const strip = btn.previousElementSibling;
    const isOpen = panel.classList.contains('show');

    // Закрываем все панели и сбрасываем отступы
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.remove('show');
      p.style.removeProperty('--btn-offset');
    });
    document.querySelectorAll('.strip').forEach(s => s.classList.remove('expanded'));

    if (!isOpen) {
      strip.classList.add('expanded');
      panel.classList.add('show');

      // Считаем высоту кнопки и передаём в CSS
      const btnHeight = btn.offsetHeight;
      panel.style.setProperty('--btn-offset', `${btnHeight / 2}px`);
    }
  });
});



function applyFiltersAndRender() {
  filtered = players.filter(p => {
    if (filterCountry.value && p.country !== filterCountry.value) return false;
    if (filterPos.value && p.pos !== filterPos.value) return false;
    return true;
  });
  const sort = filterSort.value;
  if (sort === 'price-asc') filtered.sort((a,b)=>a.price-b.price);
  if (sort === 'price-desc') filtered.sort((a,b)=>b.price-a.price);
  if (sort === 'avg-desc') filtered.sort((a,b)=>b.avg-a.avg);
  if (sort === 'avg-asc') filtered.sort((a,b)=>a.avg-b.avg);

  const { pageData, totalPages } = paginate(filtered, currentPage, perPage);
  if (currentPage > totalPages) currentPage = totalPages;

  tbody.innerHTML = '';
  pageData.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><button class="add-btn" data-id="${p.id}">+</button></td>
      <td><img src="${p.photo}" alt=""></td>
      <td class="name-td" data-id="${p.id}">${p.name}</td>
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

  document.querySelectorAll('.name-td').forEach(td => td.addEventListener('click', () => {
    const id = +td.dataset.id; showProfile(id);
  }));
  document.querySelectorAll('.add-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const id = +btn.dataset.id;
    openRoleSelectorAt(id, btn);
  });
});


  pageInfo.textContent = `${currentPage} / ${Math.max(1, Math.ceil(filtered.length / perPage))}`;
}

function showProfile(id) {
  const p = players.find(x => x.id === id);
  if (!p) return;
  document.getElementById('profile-photo').src = p.photo;
  document.getElementById('profile-name').textContent = p.name;
  document.getElementById('profile-country-pos').textContent = `${p.country} • ${p.pos}`;
  document.getElementById('profile-avg').textContent = p.avg;
  document.getElementById('profile-total').textContent = p.pts;
  document.getElementById('profile-picked').textContent = Math.floor(Math.random()*100) + '%';
  document.getElementById('profile-price').textContent = p.price + '$';
  document.getElementById('profile-flag').style.backgroundImage = `url(${p.flag})`;
  preview.classList.remove('hidden');
  preview.scrollIntoView({behavior:'smooth', block:'center'});
}

// Открытие селектора возле кнопки +
function openRoleSelectorAt(playerId, btnElement) {
  activeRoleTarget = playerId;

  // Создаём контейнер
  const selector = document.createElement('div');
  selector.className = 'role-selector-circle';
  selector.innerHTML = `
    <button class="center-btn"></button>
    <button class="role-btn" data-role="Скорер" style="--angle:0deg;">SCORER</button>
    <button class="role-btn" data-role="Ассистент" style="--angle:40deg;">ASSISTANT</button>
    <button class="role-btn" data-role="Ребаундер" style="--angle:140deg;">REBOUNDER</button>
    <button class="role-btn" data-role="Чернорабочий" style="--angle:180deg;">STOPPER</button>
    <button class="role-btn" data-role="Шутер" style="--angle:220deg;">SHOOTER</button>
    <button class="role-btn" data-role="Сюрприз" style="--angle:320deg;">SURPRISE</button>
  `;

  // Позиционируем поверх кнопки
  const rect = btnElement.getBoundingClientRect();
  selector.style.position = 'absolute';
  selector.style.left = `${rect.left + window.scrollX - 82}px`;
  selector.style.top = `${rect.top + window.scrollY - 82}px`;
  selector.style.zIndex = '1000';

  // Вставляем в документ
  document.body.appendChild(selector);

  // Обработчик выбора роли
  selector.querySelectorAll('.role-btn').forEach(roleBtn => {
    roleBtn.addEventListener('click', () => {
      const role = roleBtn.dataset.role;
      const slotId = roleMap[role];
      assignPlayerToRole(activeRoleTarget, slotId);
      selector.remove();
    });
  });

  // Закрыть по центру
  selector.querySelector('.center-btn').addEventListener('click', () => {
    selector.remove();
  });
}


document.addEventListener('click', (e) => {
  if (!roleSelector.contains(e.target) && !e.target.classList.contains('add-btn')) {
    roleSelector.classList.remove('show');
  }
});

// Маппинг названий ролей на ID слотов
const roleMap = {
  "Скорер": "slot-Scorer",
  "Ассистент": "slot-Assistant",
  "Ребаундер": "slot-Rebounder",
  "Чернорабочий": "slot-Stopper",
  "Шутер": "slot-Shooter", // новая роль
  "Сюрприз": "slot-Young"
};
function canAssignRole(player, slotId) {
  if (slotId === "slot-Young" && player.price > 7) {
    alert("В роль 'Сюрприз' можно добавить игрока не дороже 7$!");
    return false;
  }
  return true;
}

// Обработка кликов по ролям
roleSelector.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;

  const role = b.dataset.role;
  const slotId = roleMap[role];
  if (!slotId) return;

  assignPlayerToRole(activeRoleTarget, slotId);
  roleSelector.classList.remove('show');
});
function assignPlayerToRole(playerId, slotId) {
  const p = players.find(x => x.id === playerId);
  if (!p) return;
  if (!canAssignRole(p, slotId)) return;

  for (const s in roleSlots) {
    if (roleSlots[s] && roleSlots[s].id === playerId) {
      roleSlots[s] = null;
    }
  }
  const totalBudget = 60;
  const currentSpent = Object.values(roleSlots).filter(x => x).reduce((sum, pl) => sum + (pl.price || 0), 0);
  const newTotal = currentSpent + (p.price || 0) - ((roleSlots[slotId]?.price) || 0);
  if (newTotal > totalBudget) {
    alert(`Нельзя превысить ${totalBudget}M!`);
    return;
  }
  roleSlots[slotId] = p;
  renderSlots();
}

/* ====== Рендер слотов с кнопкой удаления ====== */
function renderSlots() {
  const roleNames = {
    "slot-Scorer": "SCORER",
    "slot-Assistant": "ASSISTANT",
    "slot-Rebounder": "REBOUNDER",
    "slot-Stopper": "STOPPER",
    "slot-Shooter": "SHOOTER",
    "slot-Young": "SURPRISE"
  };
  for (const slotId in roleSlots) {
    const el = document.getElementById(slotId);
    if (!el) continue;
    const p = roleSlots[slotId];
    if (!p) {
      el.innerHTML = `<div class="empty-slot">O</div><div class="role-name">${roleNames[slotId]}</div>`;
    } else {
      el.innerHTML = `
        <img src="${p.photo}" alt="${p.name}">
        <div class="slot-name">${p.name}</div>
        <div class="slot-price">${p.price}$</div>
        <div class="role-name">${roleNames[slotId]}</div>
        <button class="remove-btn" data-slot="${slotId}">✕</button>
      `;
    }
  }
  // обработка удаления
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slotId = btn.dataset.slot;
      roleSlots[slotId] = null;
      renderSlots();
    });
  });
  updateCoinsSummary();
}
/* ====== Формулы подсчёта ====== */
function calculateRolePoints(p, slotId) {
  const base = p.pts + p.reb * 1.3 + p.stl * 3 + p.blk * 3 + p.to * (-2); // упрощённая базовая
  if (slotId === "slot-Shooter") {
    return base + (p.threes || 0) * 3; // шутер: базовая + трёхи*3
  }
  return base; // остальные роли можешь расписать как надо
}

function updateCoinsSummary(){
  const total = 60;
  const used = Object.values(roleSlots).filter(x => x).reduce((s, p) => s + (p.price || 0), 0);
  const usedEl = document.getElementById('coins-used');
  const totalEl = document.getElementById('coins-total');
  if (usedEl) usedEl.textContent = used;
  if (totalEl) totalEl.textContent = total;
  const summary = document.getElementById('coins-summary');
  if (summary) {
    if (used > total) {
      summary.style.borderColor = 'rgba(255,0,0,0.6)';
      summary.style.color = 'salmon';
    } else {
      summary.style.borderColor = 'rgba(255,255,255,0.06)';
      summary.style.color = 'var(--yellow)';
    }
  }
}

prevBtn.addEventListener('click', () => { if (currentPage>1) { currentPage--; applyFiltersAndRender(); }});
nextBtn.addEventListener('click', () => {
  const maxP = Math.max(1, Math.ceil(filtered.length / perPage));
  if (currentPage < maxP) { currentPage++; applyFiltersAndRender(); }
});
filterCountry.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });
filterPos.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });
filterSort.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });

applyFiltersAndRender();
renderSlots();
updateCoinsSummary();
