// Calculations now accept data as arguments instead of importing static LEAGUE_DATA

export const calculateStandings = (teams, scores) => {
    const teamStats = teams.map((team) => {
        let totalPoints = 0;
        let weeksPlayed = 0;

        scores.forEach((week) => {
            // Check if this team has a score in this week
            // Structure of 'scores' from DB might be different, we need to adapt.
            // Assuming 'scores' passed here is already processed into { id: 'J1', scores: { teamId: points } } format
            // OR we adapt the function to handle flat list of scores from DB.
            // Let's assume we transform DB data to the old structure for compatibility first, 
            // or better, rewrite this to handle the flat list if that's what we pass.

            // Actually, let's keep the component logic simple and pass the data in the format it expects.
            // So 'scores' here is expected to be [ { id: 'J1', scores: { 1: 50, 2: 60 } } ]

            if (week.scores[team.id] !== undefined) {
                totalPoints += week.scores[team.id];
                weeksPlayed++;
            }
        });

        return {
            ...team,
            totalPoints,
            average: weeksPlayed > 0 ? (totalPoints / weeksPlayed).toFixed(2) : 0,
        };
    });

    return teamStats.sort((a, b) => b.totalPoints - a.totalPoints);
};

export const calculateCumulative = (teams, scores) => {
    // Initialize cumulative scores for each team
    const teamCumulative = {};
    teams.forEach(team => {
        teamCumulative[team.id] = 0;
    });

    return scores.map((week) => {
        const weekData = { name: week.id };
        teams.forEach((team) => {
            if (week.scores[team.id] !== undefined) {
                teamCumulative[team.id] += week.scores[team.id];
            }
            weekData[team.id] = teamCumulative[team.id];
        });
        return weekData;
    });
};

export const calculateRankHistory = (teams, scores) => {
    let currentTotals = {};
    teams.forEach(t => currentTotals[t.id] = 0);

    return scores.map(week => {
        // Update totals
        teams.forEach(t => {
            if (week.scores[t.id] !== undefined) {
                currentTotals[t.id] += week.scores[t.id];
            }
        });

        // Sort to find ranks
        const sortedTeams = [...teams].sort((a, b) => currentTotals[b.id] - currentTotals[a.id]);

        const weekRanks = { name: week.id };
        sortedTeams.forEach((team, index) => {
            weekRanks[team.id] = index + 1;
        });

        return weekRanks;
    });
};

export const calculateProjections = (teams, scores, futureWeeks = 5) => {
    if (scores.length === 0) return [];

    const cumulativeData = calculateCumulative(teams, scores);
    const lastWeekData = cumulativeData[cumulativeData.length - 1];

    // Calculate last 3 weeks average for each team
    const teamAverages = {};
    teams.forEach(team => {
        const last3Weeks = scores.slice(-3);
        let sum = 0;
        let count = 0;
        last3Weeks.forEach(week => {
            if (week.scores[team.id] !== undefined) {
                sum += week.scores[team.id];
                count++;
            }
        });
        teamAverages[team.id] = count > 0 ? sum / count : 0;
    });

    const projections = [...cumulativeData];
    let currentTotals = { ...lastWeekData };
    delete currentTotals.name;

    for (let i = 1; i <= futureWeeks; i++) {
        const weekName = `P${i}`;
        const weekData = { name: weekName, isProjection: true };

        teams.forEach(team => {
            currentTotals[team.id] += teamAverages[team.id];
            weekData[team.id] = Number(currentTotals[team.id].toFixed(2));
        });

        projections.push(weekData);
    }

    return projections;
};

export const calculatePositionalPoints = (teams, scores) => {
    // Logic: For each matchday, sort teams by points. 1st gets (N-1), last gets 0.
    // Sum these points.

    const teamPositionalPoints = {};
    teams.forEach(t => teamPositionalPoints[t.id] = 0);

    const N = teams.length;

    scores.forEach(week => {
        // Get teams that played this week and their scores
        const weekScores = [];
        teams.forEach(team => {
            if (week.scores[team.id] !== undefined) {
                weekScores.push({ id: team.id, points: week.scores[team.id] });
            }
        });

        // Sort by points descending
        weekScores.sort((a, b) => b.points - a.points);

        // Assign positional points
        // 1st: N-1, 2nd: N-2, ...
        // Note: If ties, they should probably share points or standard rank? 
        // User didn't specify tie-breaker. Let's use simple rank for now.

        weekScores.forEach((item, index) => {
            // Rank 0 (1st place) -> gets N - 1 - 0 = N - 1
            // Rank k -> gets N - 1 - k
            const pointsAwarded = Math.max(0, N - 1 - index);
            teamPositionalPoints[item.id] += pointsAwarded;
        });
    });

    // Return format suitable for a table
    return teams.map(team => ({
        ...team,
        positionalPoints: teamPositionalPoints[team.id]
    })).sort((a, b) => b.positionalPoints - a.positionalPoints);
};
