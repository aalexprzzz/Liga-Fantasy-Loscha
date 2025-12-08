import React, { useState, useMemo } from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import {
    Trophy,
    ThumbsDown,
    Activity,
    TrendingUp,
    User,
    Zap,
    Flame,
    Watch,
    Clock,
    Sigma,
    Skull
} from 'lucide-react';
import { identifyInactiveTeams } from '../utils/calculations';


const StatisticsTab = ({ teams, scores }) => {
    const [selectedTeamId, setSelectedTeamId] = useState(teams.length > 0 ? teams[0].id : null);

    // --- Logic for Top Cards ---
    const stats = useMemo(() => {
        const inactiveTeams = identifyInactiveTeams(teams, scores);

        let mvp = { name: '-', points: -Infinity, matchday: '-' };
        let farolillo = { name: '-', points: Infinity, matchday: '-' };
        let totalPoints = 0;
        let totalEntries = 0;

        // For recent average (last 3 matchdays)
        // scores is expected to be sorted by matchday index already from App.jsx
        const last3Scores = scores.slice(-3);
        let recentTotalPoints = 0;
        let recentTotalEntries = 0;

        // Data structures for new metrics
        const teamPointsHistory = {}; // { teamId: [p1, p2, ...] }
        teams.forEach(t => {
            if (!inactiveTeams.has(t.id)) {
                teamPointsHistory[t.id] = [];
            }
        });

        scores.forEach(week => {
            Object.entries(week.scores).forEach(([teamId, points]) => {
                const tId = parseInt(teamId);

                // SKIP INACTIVE TEAMS
                if (inactiveTeams.has(tId)) return;

                const team = teams.find(t => t.id === tId);
                const teamName = team ? team.name : 'Unknown';

                // MVP
                if (points > mvp.points) {
                    mvp = { name: teamName, points, matchday: week.id };
                }

                // Farolillo (Ignore 0s)
                if (points > 0 && points < farolillo.points) {
                    farolillo = { name: teamName, points, matchday: week.id };
                }

                // Historical Average
                totalPoints += points;
                totalEntries++;

                // Collect points for Std Dev
                if (teamPointsHistory[tId]) {
                    teamPointsHistory[tId].push(points);
                }
            });
        });

        last3Scores.forEach(week => {
            Object.entries(week.scores).forEach(([teamId, points]) => {
                const tId = parseInt(teamId);
                if (inactiveTeams.has(tId)) return; // SKIP INACTIVE
                recentTotalPoints += points;
                recentTotalEntries++;
            });
        });

        // --- Standard Deviation Calculation ---
        let swissWatch = { name: '-', stdDev: Infinity };
        let rollerCoaster = { name: '-', stdDev: -Infinity };

        Object.entries(teamPointsHistory).forEach(([teamId, pointsArr]) => {
            if (pointsArr.length < 2) return; // Need at least 2 data points

            const mean = pointsArr.reduce((a, b) => a + b, 0) / pointsArr.length;
            const variance = pointsArr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pointsArr.length;
            const stdDev = Math.sqrt(variance);

            const team = teams.find(t => t.id === parseInt(teamId));
            const name = team ? team.name : 'Unknown';

            if (stdDev < swissWatch.stdDev) {
                swissWatch = { name, stdDev };
            }
            if (stdDev > rollerCoaster.stdDev) {
                rollerCoaster = { name, stdDev };
            }
        });

        // --- Historical Streaks Calculation ---
        // Iterate from J3 (index 2) to end
        const streakCounts = {}; // { teamId: { hot: 0, cold: 0 } }
        teams.forEach(t => {
            if (!inactiveTeams.has(t.id)) {
                streakCounts[t.id] = { hot: 0, cold: 0 }
            }
        });

        // Ensure scores are sorted by matchday (they should be from App.jsx)
        // We need at least 3 matchdays to start checking streaks
        if (scores.length >= 3) {
            for (let i = 2; i < scores.length; i++) {
                const window = scores.slice(i - 2, i + 1); // [J(i-2), J(i-1), J(i)]

                // Calculate League Threshold for this window
                let windowTotalPoints = 0;
                let windowTotalEntries = 0;
                window.forEach(w => {
                    Object.entries(w.scores).forEach(([tId, p]) => {
                        // SKIP INACTIVE in threshold calculation too? 
                        // "excluye del array de datos a cualquier jugador que cumpla la condición de inactividad"
                        // Yes, exclude them from average.
                        if (!inactiveTeams.has(parseInt(tId))) {
                            windowTotalPoints += p;
                            windowTotalEntries++;
                        }
                    });
                });
                const leagueThreshold = windowTotalEntries > 0 ? windowTotalPoints / windowTotalEntries : 0;

                // Check each team
                teams.forEach(team => {
                    if (inactiveTeams.has(team.id)) return; // Skip inactive

                    const teamScores = window.map(w => w.scores[team.id]);
                    // Only count if played all 3
                    if (teamScores.every(s => s !== undefined)) {
                        const isHot = teamScores.every(s => s > leagueThreshold);
                        const isCold = teamScores.every(s => s < leagueThreshold);

                        if (isHot) streakCounts[team.id].hot++;
                        if (isCold) streakCounts[team.id].cold++;
                    }
                });
            }
        }

        let humanTorch = { name: '-', count: -1 };
        let stableKing = { name: '-', count: -1 };

        Object.entries(streakCounts).forEach(([teamId, counts]) => {
            const team = teams.find(t => t.id === parseInt(teamId));
            const name = team ? team.name : 'Unknown';

            if (counts.hot > humanTorch.count) {
                humanTorch = { name, count: counts.hot };
            }
            if (counts.cold > stableKing.count) {
                stableKing = { name, count: counts.cold };
            }
        });


        return {
            mvp: mvp.points === -Infinity ? { name: '-', points: 0, matchday: '-' } : mvp,
            farolillo: farolillo.points === Infinity ? { name: '-', points: 0, matchday: '-' } : farolillo,
            historicalAvg: totalEntries > 0 ? (totalPoints / totalEntries).toFixed(1) : 0,
            recentAvg: recentTotalEntries > 0 ? (recentTotalPoints / recentTotalEntries).toFixed(1) : 0,
            swissWatch: swissWatch.stdDev === Infinity ? { name: '-', stdDev: 0 } : { ...swissWatch, stdDev: swissWatch.stdDev.toFixed(2) },
            rollerCoaster: rollerCoaster.stdDev === -Infinity ? { name: '-', stdDev: 0 } : { ...rollerCoaster, stdDev: rollerCoaster.stdDev.toFixed(2) },
            humanTorch: humanTorch.count === -1 ? { name: '-', count: 0 } : humanTorch,
            stableKing: stableKing.count === -1 ? { name: '-', count: 0 } : stableKing
        };
    }, [teams, scores]);

    // --- Logic for Individual Stats ---
    const individualStats = useMemo(() => {
        if (!selectedTeamId) return null;

        const teamScores = [];
        scores.forEach(week => {
            if (week.scores[selectedTeamId] !== undefined) {
                teamScores.push({
                    matchday: week.id,
                    points: week.scores[selectedTeamId]
                });
            }
        });

        if (teamScores.length === 0) return null;

        // 1. Personal Best
        let best = { points: -Infinity, matchday: '-' };
        // 2. Worst (excluding 0)
        let worst = { points: Infinity, matchday: '-' };

        // For Std Dev
        const pointsArr = teamScores.map(s => s.points);

        teamScores.forEach(s => {
            if (s.points > best.points) best = s;
            if (s.points > 0 && s.points < worst.points) worst = s;
        });

        if (worst.points === Infinity) worst = { points: 0, matchday: '-' };

        // 3. Stability (Std Dev)
        let stdDev = 0;
        if (pointsArr.length >= 2) {
            const mean = pointsArr.reduce((a, b) => a + b, 0) / pointsArr.length;
            const variance = pointsArr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pointsArr.length;
            stdDev = Math.sqrt(variance);
        }

        // 4. Historical Streaks
        let fireCount = 0;
        let ponyCount = 0;

        if (scores.length >= 3) {
            for (let i = 2; i < scores.length; i++) {
                const window = scores.slice(i - 2, i + 1); // [J(i-2), J(i-1), J(i)]

                // Calculate League Threshold
                let windowTotalPoints = 0;
                let windowTotalEntries = 0;
                window.forEach(w => {
                    Object.values(w.scores).forEach(p => {
                        windowTotalPoints += p;
                        windowTotalEntries++;
                    });
                });
                const leagueThreshold = windowTotalEntries > 0 ? windowTotalPoints / windowTotalEntries : 0;

                // Check Selected Team
                const teamWindowScores = window.map(w => w.scores[selectedTeamId]);
                if (teamWindowScores.every(s => s !== undefined)) {
                    const isHot = teamWindowScores.every(s => s > leagueThreshold);
                    const isCold = teamWindowScores.every(s => s < leagueThreshold);

                    if (isHot) fireCount++;
                    if (isCold) ponyCount++;
                }
            }
        }

        return {
            best,
            worst,
            stdDev: stdDev.toFixed(1),
            fireCount,
            ponyCount
        };

    }, [scores, selectedTeamId]);

    // --- Logic for Chart ---
    const chartData = useMemo(() => {
        if (!selectedTeamId) return [];

        return scores.map(week => {
            // Calculate rank for this specific matchday
            const matchdayScores = Object.entries(week.scores).map(([tId, pts]) => ({
                id: parseInt(tId),
                pts
            }));

            // Sort descending by points
            matchdayScores.sort((a, b) => b.pts - a.pts);

            // Find rank (1-based index)
            const rankIndex = matchdayScores.findIndex(item => item.id === selectedTeamId);
            const rank = rankIndex !== -1 ? rankIndex + 1 : null;

            const points = week.scores[selectedTeamId] !== undefined ? week.scores[selectedTeamId] : 0;

            return {
                jornada: week.id,
                puntos: points,
                posicion: rank
            };
        });
    }, [teams, scores, selectedTeamId]);

    if (!teams.length) return <div>No hay datos disponibles.</div>;

    return (
        <div className="space-y-8">
            {/* Top Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* MVP Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">MVP Histórico</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.mvp.points} pts</h3>
                        </div>
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">{stats.mvp.name}</span>
                        <span className="mx-2">•</span>
                        <span className="text-gray-500">{stats.mvp.matchday}</span>
                    </div>
                </div>

                {/* Farolillo Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Farolillo Histórico</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.farolillo.points} pts</h3>
                        </div>
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <ThumbsDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">{stats.farolillo.name}</span>
                        <span className="mx-2">•</span>
                        <span className="text-gray-500">{stats.farolillo.matchday}</span>
                    </div>
                </div>

                {/* Historical Average Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Media Histórica</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.historicalAvg}</h3>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Promedio global de la liga
                    </div>
                </div>

                {/* Recent Average Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Media Reciente</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.recentAvg}</h3>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Últimas 3 jornadas
                    </div>
                </div>

                {/* --- New Cards --- */}

                {/* El Reloj Suizo (Min Std Dev) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">El Reloj Suizo 🇨🇭</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">±{stats.swissWatch.stdDev}</h3>
                        </div>
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <Clock className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">{stats.swissWatch.name}</span>
                        <div className="text-xs text-gray-500 mt-1">El más fiable</div>
                    </div>
                </div>

                {/* La Montaña Rusa (Max Std Dev) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">La Montaña Rusa 🎢</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">±{stats.rollerCoaster.stdDev}</h3>
                        </div>
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">{stats.rollerCoaster.name}</span>
                        <div className="text-xs text-gray-500 mt-1">Pura adrenalina</div>
                    </div>
                </div>

                {/* La Antorcha Humana (Max Hot Streaks) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">La Antorcha Humana 🔥</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.humanTorch.count}</h3>
                        </div>
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">{stats.humanTorch.name}</span>
                        <div className="text-xs text-gray-500 mt-1">Rachas de fuego</div>
                    </div>
                </div>

                {/* El Rey del Establo (Max Cold Streaks) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">El Rey del Establo 🐴</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.stableKing.count}</h3>
                        </div>
                        <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded-lg">
                            <ThumbsDown className="w-6 h-6 text-stone-600 dark:text-stone-400" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">{stats.stableKing.name}</span>
                        <div className="text-xs text-gray-500 mt-1">Rachas negativas</div>
                    </div>
                </div>
            </div>

            {/* Individual Performance Cards - Only visible when team selected */}
            {selectedTeamId && individualStats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Personal Best */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Mejor Jornada</p>
                            <Trophy className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{individualStats.best.points} pts</span>
                            <span className="text-xs text-gray-500 ml-1">({individualStats.best.matchday})</span>
                        </div>
                    </div>

                    {/* Worst Matchday */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Peor Jornada</p>
                            <Skull className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{individualStats.worst.points} pts</span>
                            <span className="text-xs text-gray-500 ml-1">({individualStats.worst.matchday})</span>
                        </div>
                    </div>

                    {/* Historical Fire */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Histórico 🔥</p>
                            <Flame className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{individualStats.fireCount}</span>
                            <span className="text-xs text-gray-500 ml-1">veces</span>
                        </div>
                    </div>

                    {/* Historical Pony */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Histórico 🐴</p>
                            <ThumbsDown className="w-4 h-4 text-stone-500" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{individualStats.ponyCount}</span>
                            <span className="text-xs text-gray-500 ml-1">veces</span>
                        </div>
                    </div>

                    {/* Stability */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Estabilidad</p>
                            <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">±{individualStats.stdDev}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        Rendimiento Individual
                    </h2>
                    <select
                        value={selectedTeamId || ''}
                        onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                        className="w-full sm:w-64 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                    >
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>
                                {team.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                            <XAxis
                                dataKey="jornada"
                                stroke="#9CA3AF"
                                tick={{ fill: '#9CA3AF' }}
                            />
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                stroke="#f97316"
                                label={{ value: 'Puntos', angle: -90, position: 'insideLeft', fill: '#f97316' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                reversed={true}
                                domain={[1, teams.length]}
                                allowDecimals={false}
                                stroke="#06b6d4"
                                label={{ value: 'Posición Jornada', angle: 90, position: 'insideRight', fill: '#06b6d4' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1F2937',
                                    borderColor: '#374151',
                                    color: '#F3F4F6'
                                }}
                                itemStyle={{ color: '#F3F4F6' }}
                            />
                            <Legend />
                            <Bar
                                yAxisId="left"
                                dataKey="puntos"
                                name="Puntos"
                                fill="#f97316"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="posicion"
                                name="Posición Jornada"
                                stroke="#06b6d4"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default StatisticsTab;
