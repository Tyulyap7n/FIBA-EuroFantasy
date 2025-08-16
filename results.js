const SUPABASE_URL = 'https://xovxokupvsnnjtskdgvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdnhva3VwdnNubmp0c2tkZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDk4NjMsImV4cCI6MjA3MDQyNTg2M30.Vl5Z9DABFmHQWGtfbyuAZGGgfX4hDYGAPD8C7fr540E';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.supabase) return console.error("Supabase не найден");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    alert("Не авторизован");
    window.location.href = "index.html";
    return;
  }

  const userId = session.user.id;

  // Получаем команду пользователя
  const { data: teamData, error: teamError } = await supabase
    .from("user_teams")
    .select("id, team_name")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (teamError || !teamData) return console.error(teamError);

  const teamId = teamData.id;

  // Получаем все туры с результатами команды
  const { data: tours, error: toursError } = await supabase
    .from("scores")
    .select("tour_id")
    .eq("team_id", teamId)
    .order("tour_id", { ascending:true });

  if (toursError) return console.error(toursError);

  const tourSelect = document.getElementById("tourSelect");
  tours.forEach(tour => {
    const option = document.createElement("option");
    option.value = tour.tour_id;
    option.textContent = `Тур ${tour.tour_id}`;
    tourSelect.appendChild(option);
  });

  async function loadTourStats(tourId) {
    const statsBody = document.getElementById("statsBody");
    statsBody.innerHTML = "";

    const { data: teamPlayers } = await supabase
      .from("team_players")
      .select("player_id, role_id, roles(name)")
      .eq("team_id", teamId);

    let totalPoints = 0;

    for (let tp of teamPlayers) {
      const { data: player } = await supabase
        .from("players")
        .select("first_name,last_name")
        .eq("id", tp.player_id)
        .single();

      const { data: statsArr } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", tp.player_id)
        .eq("tour", tourId);

      const stats = statsArr[0] || {};
      totalPoints += stats.points || 0;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${tp.roles?.name || '-'}</td>
        <td>${player.first_name} ${player.last_name}</td>
        <td>${stats.points || 0}</td>
        <td>${stats.threes || 0}</td>
        <td>${stats.assists || 0}</td>
        <td>${stats.rebounds || 0}</td>
        <td>${stats.blocks || 0}</td>
        <td>${stats.steals || 0}</td>
        <td>${stats.turnover || 0}</td>
      `;
      statsBody.appendChild(row);
    }

    document.getElementById("totalPoints").textContent = totalPoints;
  }

  // Первоначально загружаем первый тур
  if (tourSelect.value) loadTourStats(tourSelect.value);

  tourSelect.addEventListener("change", () => {
    loadTourStats(tourSelect.value);
  });
});
