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
    User
} from 'lucide-react';


const StatisticsTab = ({ teams, scores }) => {
    const [selectedTeamId, setSelectedTeamId] = useState(teams.length > 0 ? teams[0].id : null);

    // --- Logic for Top Cards ---
    const stats = useMemo(() => {
        let mvp = { name: '-', points: -Infinity, matchday: '-' };
        let farolillo = { name: '-', points: Infinity, matchday: '-' };
        let totalPoints = 0;
        let totalEntries = 0;

        // For recent average (last 3 matchdays)
        // scores is expected to be sorted by matchday index already from App.jsx
        const last3Scores = scores.slice(-3);
        let recentTotalPoints = 0;
        let recentTotalEntries = 0;

        scores.forEach(week => {
            Object.entries(week.scores).forEach(([teamId, points]) => {
                const team = teams.find(t => t.id === parseInt(teamId));
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
            });
        });

        last3Scores.forEach(week => {
            Object.values(week.scores).forEach(points => {
                recentTotalPoints += points;
                recentTotalEntries++;
            });
        });

        return {
            mvp: mvp.points === -Infinity ? { name: '-', points: 0, matchday: '-' } : mvp,
            farolillo: farolillo.points === Infinity ? { name: '-', points: 0, matchday: '-' } : farolillo,
            historicalAvg: totalEntries > 0 ? (totalPoints / totalEntries).toFixed(1) : 0,
            recentAvg: recentTotalEntries > 0 ? (recentTotalPoints / recentTotalEntries).toFixed(1) : 0
        };
    }, [teams, scores]);

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
            </div>

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
