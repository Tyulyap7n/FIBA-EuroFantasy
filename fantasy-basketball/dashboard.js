// dashboard.js
import { supabase } from './supabaseClient.js';

async function loadTeam() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    let { data: team, error } = await supabase
        .from('user_teams') // ✅ таблица с составами пользователей
        .select(`
            player_id, 
            role, 
            players(first_name, last_name), 
            player_stats(points, assists, rebounds, blocks, steals, turnovers)
        `)
        .eq('user_id', user.id);

    if (error) {
        console.error(error);
        return;
    }

    const table = document.getElementById('team-table');
    table.innerHTML = '';

    let totalPoints = 0;

    team.forEach(item => {
        const stats = item.player_stats[0] || { points: 0, assists: 0, rebounds: 0, blocks: 0, steals: 0, turnovers: 0 };
        const playerPoints = calculateRolePoints(stats, item.role);
        totalPoints += playerPoints;

        table.innerHTML += `
            <tr>
                <td>${item.players.first_name} ${item.players.last_name}</td>
                <td>${item.role}</td>
                <td>${playerPoints}</td>
            </tr>
        `;
    });

    document.getElementById('team-total').innerText = `Очки команды: ${totalPoints}`;
}

function calculateRolePoints(stats, role) {
    const { points, assists, rebounds, blocks, steals, turnovers } = stats;

    switch (role) {
        case 'Скорер':
            return points*1.5 + assists*1.5 + rebounds*1.3 + blocks*3 + steals*3 + turnovers*(-2);
        case 'Ассистент':
            return points + assists*3 + rebounds*1.3 + blocks*3 + steals*3 + turnovers*(-2);
        case 'Ребаундер':
            return points + assists*1.5 + rebounds*2.6 + blocks*3 + steals*3 + turnovers*(-2);
        case 'Чернорабочий':
            return points + assists*1.5 + rebounds*1.3 + blocks*6 + steals*6 + turnovers*(-2);
        case 'Всё включено':
            let base = points + assists*1.5 + rebounds*1.3 + blocks*3 + steals*3 + turnovers*(-2);
            return (points>0 && assists>0 && rebounds>0 && blocks>0 && steals>0) ? base+7 : base;
        case 'Сюрприз':
            let calc = points + assists*1.5 + rebounds*1.3 + blocks*3 + steals*3 + turnovers*(-2);
            return calc >= 20 ? calc+10 : calc;
        default:
            return 0;
    }
}

document.addEventListener('DOMContentLoaded', loadTeam);
