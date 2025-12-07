// Calculations now accept data as arguments instead of importing static LEAGUE_DATA

export const getSortedMatchdays = (scores) => {
    const uniqueMatchdays = [...new Set(scores.map(s => s.id))];
    return uniqueMatchdays.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });
};

export const identifyInactiveTeams = (teams, scores) => {
    const sortedMatchdays = getSortedMatchdays(scores);
    const last2Weeks = sortedMatchdays.slice(-2);
    const inactiveTeams = new Set();

    if (last2Weeks.length < 2) return inactiveTeams;

    teams.forEach(team => {
        // Get scores for the last 2 weeks
        const recentScores = last2Weeks.map(weekId => {
            const week = scores.find(s => s.id === weekId);
            return week && week.scores[team.id] !== undefined ? week.scores[team.id] : null;
        });

        // Check if all 2 scores exist and are 0
        // "Si un equipo tiene 0 puntos en sus últimas 2 jornadas consecutivas"
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
    const sortedMatchdays = getSortedMatchdays(scores);
    // We need to look back as far as possible, so we don't slice just the last 3.
    // However, for efficiency, maybe we don't need ALL history if the streak breaks, 
    // but to find the *length* of the streak we need to go back until it breaks.

    if (sortedMatchdays.length < 3) return new Map(); // Need at least 3 weeks to start counting streaks

    const inactiveTeams = identifyInactiveTeams(teams, scores);

    // 1. Calculate Average for ALL matchdays (or at least recent enough history)
    // We'll calculate for all to be safe and simple.
    const matchdayAverages = {};

    sortedMatchdays.forEach(weekId => {
        const week = scores.find(s => s.id === weekId);
        if (!week) return;

        let totalPoints = 0;
        let activeCount = 0;

        Object.values(week.scores).forEach(points => {
            if (points > 0) { // Strict: Exclude 0s
                totalPoints += points;
                activeCount++;
            }
        });

        matchdayAverages[weekId] = activeCount > 0 ? totalPoints / activeCount : 0;
    });

    // 2. Evaluate each team
    const teamStreaks = new Map();

    teams.forEach(team => {
        if (inactiveTeams.has(team.id)) {
            teamStreaks.set(team.id, { type: 'inactive', count: 0, tooltip: 'Inactivo: 0 puntos en las últimas 2 jornadas' });
            return;
        }

        // We iterate backwards from the most recent matchday
        let hotStreak = 0;
        let coldStreak = 0;
        let currentStreakType = null; // 'hot' or 'cold' or null
        let streakBroken = false;
        let debugHistory = [];

        // We check from the last matchday backwards
        for (let i = sortedMatchdays.length - 1; i >= 0; i--) {
            const weekId = sortedMatchdays[i];
            const week = scores.find(s => s.id === weekId);
            const points = week && week.scores[team.id] !== undefined ? week.scores[team.id] : 0; // Treat undefined as 0 for streak calculation if needed, or skip? 
            // If points is 0 and they played, it breaks hot streak. If they didn't play... 
            // Let's assume points are reliable.

            const avg = matchdayAverages[weekId] || 0;

            if (streakBroken) break;

            if (currentStreakType === null) {
                // Determine the type of streak based on the LATEST matchday
                if (points > avg) {
                    currentStreakType = 'hot';
                    hotStreak++;
                } else if (points < avg) {
                    currentStreakType = 'cold';
                    coldStreak++;
                    debugHistory.push(`${weekId}(${points}<${avg.toFixed(1)})`);
                } else {
                    // Exactly average? Breaks everything?
                    streakBroken = true;
                }
            } else if (currentStreakType === 'hot') {
                if (points > avg) {
                    hotStreak++;
                } else {
                    streakBroken = true;
                }
            } else if (currentStreakType === 'cold') {
                if (points < avg) {
                    coldStreak++;
                    debugHistory.push(`${weekId}(${points}<${avg.toFixed(1)})`);
                } else {
                    streakBroken = true;
                }
            }
        }

        // Determine final status
        if (currentStreakType === 'hot' && hotStreak >= 3) {
            teamStreaks.set(team.id, {
                type: 'hot',
                count: hotStreak,
                tooltip: `¡En racha! ${hotStreak} jornadas consecutivas por encima de la media`
            });
        } else if (currentStreakType === 'cold' && coldStreak >= 3) {
            teamStreaks.set(team.id, {
                type: 'cold',
                count: coldStreak,
                tooltip: `Racha mala: ${debugHistory.slice(0, 3).join(' | ')}...`
            });
        } else {
            teamStreaks.set(team.id, { type: null, count: 0, tooltip: '' });
        }
    });

    return teamStreaks;
};
