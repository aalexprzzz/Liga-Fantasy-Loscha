
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateStandings, calculateRankHistory, calculateStreak, getSortedMatchdays, identifyInactiveTeams, calculatePositionalPoints } from '../utils/calculations';
import { Filter, Calculator } from 'lucide-react';
import { IconFireOrange, IconFirePurple, IconFireBlue, IconFireGreen } from './Icons';
import { Skull } from 'lucide-react';

const ClassificationTab = ({ teams, scores, matchups = [] }) => {
    const [selectedMatchday, setSelectedMatchday] = useState('general');
    const [viewMode, setViewMode] = useState('standard'); // 'standard' or 'positional'

    // Get all available matchdays sorted
    const matchdays = useMemo(() => getSortedMatchdays(scores), [scores]);

    // Calculate "Babies" (Losers of their last duel)
    const babies = useMemo(() => {
        if (!matchups || matchups.length === 0) return new Map();

        const loserMap = new Map(); // teamId -> { rival: string, gameweek: string }

        teams.forEach(team => {
            // Find all duels for this team
            const teamDuels = matchups.filter(m => m.player1_id === team.id || m.player2_id === team.id);
            if (teamDuels.length === 0) return;

            // Sort by gameweek descending to find the LAST one
            teamDuels.sort((a, b) => b.gameweek - a.gameweek);
            const lastDuel = teamDuels[0];

            // Check if we have scores for this gameweek to determine winner
            // If the duel is from "future" (no scores yet), we can't determine loser.
            const duelGameweekId = `J${lastDuel.gameweek}`;
            const weekScores = scores.find(s => s.id === duelGameweekId);

            if (!weekScores) return; // No scores yet, can't determine loser

            const p1Score = weekScores.scores[lastDuel.player1_id] || 0;
            const p2Score = weekScores.scores[lastDuel.player2_id] || 0;

            const isP1 = lastDuel.player1_id === team.id;
            const myScore = isP1 ? p1Score : p2Score;
            const rivalScore = isP1 ? p2Score : p1Score;
            const rivalId = isP1 ? lastDuel.player2_id : lastDuel.player1_id;

            if (rivalId === null) return; // Bye week, no loser

            if (myScore < rivalScore) {
                const rivalTeam = teams.find(t => t.id === rivalId);
                loserMap.set(team.id, {
                    rival: rivalTeam ? rivalTeam.name : 'Unknown',
                    gameweek: duelGameweekId
                });
            }
        });

        return loserMap;
    }, [teams, scores, matchups]);

    // Calculate data based on selection
    const displayData = useMemo(() => {
        if (selectedMatchday === 'general') {
            if (viewMode === 'positional') {
                return calculatePositionalPoints(teams, scores);
            }
            return calculateStandings(teams, scores);
        } else {
            // Filter scores for the selected matchday
            const matchdayScores = scores.find(s => s.id === selectedMatchday);
            if (!matchdayScores) return [];

            // Map teams to their score for this matchday
            const matchdayStandings = teams.map(team => {
                const points = matchdayScores.scores[team.id] || 0;
                return {
                    ...team,
                    totalPoints: points, // In matchday view, totalPoints is just this week's points
                    average: '-', // Not relevant for single matchday
                    isInactive: false // We'll calculate specific inactivity for the average card, but for the table list we show everyone
                };
            });

            // Sort by points descending
            return matchdayStandings.sort((a, b) => b.totalPoints - a.totalPoints);
        }
    }, [teams, scores, selectedMatchday, viewMode]);

    const rankHistory = useMemo(() => calculateRankHistory(teams, scores), [teams, scores]);
    const streakTeams = useMemo(() => calculateStreak(teams, scores), [teams, scores]);

    // Calculate Matchday Average (Context Card)
    const matchdayAverage = useMemo(() => {
        if (selectedMatchday === 'general') return null;

        const matchdayScores = scores.find(s => s.id === selectedMatchday);
        if (!matchdayScores) return 0;

        // Determine inactive teams UP TO this matchday
        // We need to pass a subset of scores to identifyInactiveTeams
        const matchdayIndex = matchdays.indexOf(selectedMatchday);
        const scoresUpToMatchday = scores.filter(s => matchdays.indexOf(s.id) <= matchdayIndex);

        // We need at least 3 matchdays to determine inactivity properly according to the rule (0 pts in last 3).
        // If we are in J1 or J2, nobody is "inactive" by this definition yet, or we just look at available data.
        // The identifyInactiveTeams function handles "last 3 weeks" from the scores passed.
        const inactiveTeamsSet = identifyInactiveTeams(teams, scoresUpToMatchday);

        let totalPoints = 0;
        let activeCount = 0;

        Object.entries(matchdayScores.scores).forEach(([teamId, points]) => {
            // Check if team is inactive
            // teamId is string from keys, inactiveTeamsSet has team.id (might be int/string)
            // Ensure type matching
            const isInactive = [...inactiveTeamsSet].some(id => String(id) === String(teamId));

            if (!isInactive) {
                totalPoints += points;
                activeCount++;
            }
        });

        return activeCount > 0 ? (totalPoints / activeCount).toFixed(1) : 0;
    }, [selectedMatchday, scores, teams, matchdays]);

    const renderStreakIcon = (teamId) => {
        const streak = streakTeams.get(teamId);
        // Always return something structurally if we want aligment, but for now just conditional
        // Also check Baby
        const baby = babies.get(teamId);

        return (
            <div className="flex items-center gap-1">
                {baby && (
                    <div className="group relative cursor-help flex items-center">
                        <span className="text-2xl animate-pulse">👶</span>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max px-2 py-1 bg-red-900 text-white text-xs rounded shadow-lg z-10 whitespace-normal max-w-[200px] text-center">
                            Perdió el duelo de la {baby.gameweek} contra {baby.rival}
                        </div>
                    </div>
                )}

                {streak && streak.type === 'inactive' && (
                    <div className="group relative cursor-help flex items-center">
                        <span className="text-2xl">🌈</span>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10 whitespace-normal max-w-[200px] text-center">
                            {streak.tooltip}
                        </div>
                    </div>
                )}

                {streak && streak.type === 'cold' && (
                    <div className="group relative flex items-center">
                        <span className="text-2xl">🐴</span>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10 whitespace-nowrap">
                            {streak.tooltip}
                        </div>
                    </div>
                )}

                {streak && streak.type === 'hot' && (
                    <div className="group relative flex items-center">
                        {(() => {
                            let FireIcon = IconFireOrange;
                            if (streak.count >= 12) FireIcon = IconFireGreen;
                            else if (streak.count >= 9) FireIcon = IconFireBlue;
                            else if (streak.count >= 6) FireIcon = IconFirePurple;
                            return <FireIcon />;
                        })()}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                            {streak.tooltip}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Controls & Context */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">

                {/* Matchday Selector */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 w-full md:w-auto">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <Filter className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Filtrar por Jornada
                        </label>
                        <select
                            value={selectedMatchday}
                            onChange={(e) => setSelectedMatchday(e.target.value)}
                            className="w-full md:w-48 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        >
                            <option value="general">Clasificación General</option>
                            {matchdays.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* View Toggle (Standard vs Positional) - Only in General View */}
                {selectedMatchday === 'general' && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center cursor-pointer" onClick={() => setViewMode(prev => prev === 'standard' ? 'positional' : 'standard')}>
                            <div className={`w-12 h-6 flex items-center bg-gray-300 dark:bg-gray-700 rounded-full p-1 duration-300 ease-in-out ${viewMode === 'positional' ? 'bg-indigo-500 dark:bg-indigo-600' : ''}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${viewMode === 'positional' ? 'translate-x-6' : ''}`}></div>
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                {viewMode === 'standard' ? 'Ver Puntos Clasificación' : 'Ver Puntos Reales'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Matchday Average Card */}
                {selectedMatchday !== 'general' && (
                    <div className="flex-1 w-full md:w-auto animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Calculator className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-indigo-100 text-sm font-medium">Media de la Liga en {selectedMatchday}</p>
                                    <p className="text-2xl font-bold">{matchdayAverage} Puntos</p>
                                </div>
                            </div>
                            <div className="hidden sm:block text-right">
                                <p className="text-xs text-indigo-200 max-w-[150px]">
                                    Excluyendo equipos inactivos (🌈)
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Standings Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedMatchday === 'general'
                            ? (viewMode === 'positional' ? 'Clasificación por Puntos de Posición' : 'Clasificación General')
                            : `Clasificación - ${selectedMatchday}`}
                    </h2>
                    {selectedMatchday !== 'general' && (
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                            Vista Jornada
                        </span>
                    )}
                    {selectedMatchday === 'general' && viewMode === 'positional' && (
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
                            Puntos Alternativos
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Pos</th>
                                <th className="px-6 py-4 font-semibold">Equipo</th>
                                {selectedMatchday === 'general' && viewMode === 'standard' && (
                                    <th className="px-6 py-4 font-semibold text-right">Media</th>
                                )}
                                <th className="px-6 py-4 font-semibold text-right">
                                    {viewMode === 'positional' && selectedMatchday === 'general' ? 'Pts. Posición' : 'Puntos'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {displayData.map((team, index) => (
                                <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium">#{index + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: team.color }}
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`font-bold ${team.isInactive ? 'text-gray-400 dark:text-gray-500 opacity-60' : 'text-gray-900 dark:text-white'}`}>
                                                        {team.name}
                                                    </div>

                                                    {/* Streak Icons - Only show in standard general view, or maybe in both? User didn't specify, but safer to show in both or just standard. Let's show in both for consistency, or just standard if positional is 'purely' alternative. Let's keep it in both. */}
                                                    {selectedMatchday === 'general' && renderStreakIcon(team.id)}

                                                </div>
                                                <div className={`text-xs ${team.isInactive ? 'text-gray-400 dark:text-gray-600 opacity-60' : 'text-gray-500 dark:text-gray-400'}`}>{team.owner}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {selectedMatchday === 'general' && viewMode === 'standard' && (
                                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300 font-mono">{team.average}</td>
                                    )}
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white font-mono text-lg">
                                        {viewMode === 'positional' && selectedMatchday === 'general' ? team.positionalPoints : team.totalPoints}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rank History Chart (Bump Chart) - Only show in General View */}
            {selectedMatchday === 'general' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Evolución de Posiciones</h2>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={rankHistory} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF' }}
                                    dy={10}
                                />
                                <YAxis
                                    reversed
                                    domain={[1, 'dataMax']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF' }}
                                    width={40}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: '#F3F4F6'
                                    }}
                                    itemStyle={{ color: '#F3F4F6' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                {teams.map((team) => (
                                    <Line
                                        key={team.id}
                                        type="monotone"
                                        dataKey={team.id}
                                        name={team.name}
                                        stroke={team.color}
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassificationTab;
