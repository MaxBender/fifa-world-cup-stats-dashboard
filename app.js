const TOURNAMENT_URL =
  'https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json';

const FALLBACK_DATA = {
  name: 'World Cup 2026',
  matches: [
    {
      team1: 'United States',
      team2: 'Mexico',
      score: { ft: [2, 1] },
      goals1: [{ name: 'Christian Pulisic', minute: 45 }],
      goals2: [{ name: 'Hirving Lozano', minute: 70 }],
    },
  ],
};

const statusText = document.getElementById('status-text');
const tournamentName = document.getElementById('tournament-name');
const matchCount = document.getElementById('match-count');
const goalCount = document.getElementById('goal-count');
const topScorer = document.getElementById('top-scorer');
const standingsBody = document.getElementById('standings-body');

function updateStatus(message, isError = false) {
  statusText.textContent = message;
  const dot = document.querySelector('.status-dot');
  if (dot) {
    dot.style.background = isError ? '#ff5d73' : '#39d98a';
  }
}

function buildTeamStats(matches) {
  const stats = new Map();

  const ensureTeam = (teamName) => {
    if (!stats.has(teamName)) {
      stats.set(teamName, {
        team: teamName,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      });
    }
    return stats.get(teamName);
  };

  matches.forEach((match) => {
    const home = ensureTeam(match.team1);
    const away = ensureTeam(match.team2);
    const [homeScore, awayScore] = match.score?.ft ?? [0, 0];

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else if (homeScore < awayScore) {
      home.losses += 1;
      away.wins += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
    }
  });

  return Array.from(stats.values()).sort((a, b) => {
    const pointsA = a.wins * 3 + a.draws;
    const pointsB = b.wins * 3 + b.draws;
    if (pointsA !== pointsB) return pointsB - pointsA;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdA !== gdB) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

function buildTopScorers(matches) {
  const scorerMap = new Map();

  matches.forEach((match) => {
    const goals = [...(match.goals1 || []), ...(match.goals2 || [])];
    goals.forEach((goal) => {
      const existing = scorerMap.get(goal.name) || { name: goal.name, goals: 0 };
      existing.goals += 1;
      scorerMap.set(goal.name, existing);
    });
  });

  return Array.from(scorerMap.values()).sort((a, b) => b.goals - a.goals);
}

function renderStandings(teamStats) {
  standingsBody.innerHTML = '';
  teamStats.forEach((team) => {
    const row = document.createElement('tr');
    const points = team.wins * 3 + team.draws;
    const gd = team.goalsFor - team.goalsAgainst;
    row.innerHTML = `
      <td>${team.team}</td>
      <td>${team.played}</td>
      <td>${team.wins}</td>
      <td>${team.draws}</td>
      <td>${team.losses}</td>
      <td>${team.goalsFor}</td>
      <td>${team.goalsAgainst}</td>
      <td>${gd >= 0 ? '+' : ''}${gd}</td>
      <td>${points}</td>
    `;
    standingsBody.appendChild(row);
  });
}

async function loadTournamentData() {
  try {
    const response = await fetch(TOURNAMENT_URL);
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const data = await response.json();
    if (!data?.matches?.length) {
      throw new Error('Tournament response did not include matches.');
    }

    updateStatus('Loaded tournament data');
    tournamentName.textContent = data.name;
    matchCount.textContent = data.matches.length;

    const teamStats = buildTeamStats(data.matches);
    renderStandings(teamStats);

    const topScorers = buildTopScorers(data.matches);
    const topScorerName = topScorers[0] ? `${topScorers[0].name} (${topScorers[0].goals})` : '—';
    topScorer.textContent = topScorerName;

    const totalGoals = data.matches.reduce((sum, match) => {
      const [homeScore, awayScore] = match.score?.ft ?? [0, 0];
      return sum + homeScore + awayScore;
    }, 0);
    goalCount.textContent = totalGoals;
  } catch (error) {
    console.error(error);
    updateStatus('Using fallback sample data', true);
    tournamentName.textContent = FALLBACK_DATA.name;
    matchCount.textContent = FALLBACK_DATA.matches.length;
    goalCount.textContent = '3';
    topScorer.textContent = 'Christian Pulisic (1)';
    renderStandings(buildTeamStats(FALLBACK_DATA.matches));
  }
}

document.addEventListener('DOMContentLoaded', loadTournamentData);
