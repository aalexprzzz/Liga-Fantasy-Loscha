// Calculations now accept data as arguments instead of importing static LEAGUE_DATA

const getSortedMatchdays = (scores) => {
    const uniqueMatchdays = [...new Set(scores.map(s => s.id))];
    return uniqueMatchdays.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });
};

const identifyInactiveTeams = (teams, scores) => {
    const sortedMatchdays = getSortedMatchdays(scores);
    const last3Weeks = sortedMatchdays.slice(-3);
    const inactiveTeams = new Set();

    if (last3Weeks.length < 3) return inactiveTeams;

    teams.forEach(team => {
        // Get scores for the last 3 weeks
        const recentScores = last3Weeks.map(weekId => {
            const week = scores.find(s => s.id === weekId);
            return week && week.scores[team.id] !== undefined ? week.scores[team.id] : null;
        });

        // Check if all 3 scores exist and are 0
        // "Si un equipo tiene 0 puntos en sus últimas 3 jornadas consecutivas"
        // We assume "disputadas" means the matchdays exist in the system.
        // If a player didn't play (undefined), is that 0? Usually in fantasy 0 points is explicit.
        // But if they are missing from the scores, it might be 0 too.
        // Let's assume explicit 0 or missing (if missing counts as 0).
        // However, usually "0 points" means they played and got 0 or didn't play and got 0.
        // Let's treat undefined as 0 for inactivity check to be safe, or strictly 0.
        // The prompt says "0 puntos".

        const isInactive = recentScores.every(score => score === 0);
        if (isInactive) {
            inactiveTeams.add(team.id);
        }
    });

    return inactiveTeams;
};

export const calculateStandings = (teams, scores) => {
    const inactiveTeams = identifyInactiveTeams(teams, scores);

    const teamStats = teams.map((team) => {
        let totalPoints = 0;
        let weeksPlayed = 0;

        scores.forEach((week) => {
            if (week.scores[team.id] !== undefined) {
                totalPoints += week.scores[team.id];
                weeksPlayed++;
            }
        });

        return {
            ...team,
            totalPoints,
            average: weeksPlayed > 0 ? (totalPoints / weeksPlayed).toFixed(2) : 0,
            isInactive: inactiveTeams.has(team.id)
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

export const calculateStreak = (teams, scores) => {
    // 1. Identify last 3 matchdays
    const sortedMatchdays = getSortedMatchdays(scores);
    const last3Weeks = sortedMatchdays.slice(-3);

    if (last3Weeks.length < 3) return { hot: new Set(), cold: new Set() }; // Need at least 3 weeks

    // Identify inactive teams to exclude from league threshold
    const inactiveTeams = identifyInactiveTeams(teams, scores);

    // 2. Calculate League Threshold (Average of ALL ACTIVE players in last 3 matchdays)
    let totalLeaguePoints = 0;
    let totalLeagueEntries = 0;

    const relevantScores = scores.filter(s => last3Weeks.includes(s.id));

    relevantScores.forEach(week => {
        Object.entries(week.scores).forEach(([teamId, points]) => {
            // Only include if team is NOT inactive
            // Note: teamId from Object.entries is a string, but team.id might be number or string.
            // We should ensure type consistency. usually keys are strings.
            // Let's assume loose comparison or string conversion.
            // inactiveTeams stores team.id.

            // Check if this teamId corresponds to an inactive team
            // We need to match the ID type.
            const isInactive = [...inactiveTeams].some(id => String(id) === String(teamId));

            if (!isInactive) {
                totalLeaguePoints += points;
                totalLeagueEntries++;
            }
        });
    });

    const leagueThreshold = totalLeagueEntries > 0 ? totalLeaguePoints / totalLeagueEntries : 0;

    // 3. Evaluate each team individually
    const streakTeams = {
        hot: new Set(),
        cold: new Set()
    };

    teams.forEach(team => {
        // Skip streak calculation for inactive teams? 
        // The prompt doesn't explicitly say to disable streaks for inactive players, 
        // but it makes sense since they have 0 points, they would be "cold" otherwise.
        // However, if they are inactive, they get the Rainbow, so maybe we shouldn't show Pony/Fire.
        // Let's exclude them from streaks to avoid clutter.
        if (inactiveTeams.has(team.id)) return;

        // Get team's scores for the last 3 weeks
        const teamScores = last3Weeks.map(weekId => {
            const week = relevantScores.find(s => s.id === weekId);
            return week && week.scores[team.id] !== undefined ? week.scores[team.id] : null;
        });

        // Check if team played all 3 weeks
        if (teamScores.every(score => score !== null)) {
            const isHot = teamScores.every(score => score > leagueThreshold);
            const isCold = teamScores.every(score => score < leagueThreshold);

            if (isHot) {
                streakTeams.hot.add(team.id);
            } else if (isCold) {
                streakTeams.cold.add(team.id);
            }
        }
    });

    return streakTeams;
};
