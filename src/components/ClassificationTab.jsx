
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateStandings, calculateRankHistory, calculateStreak } from '../utils/calculations';
const ClassificationTab = ({ teams, scores }) => {
    const standings = calculateStandings(teams, scores);
    const rankHistory = calculateRankHistory(teams, scores);
    const streakTeams = calculateStreak(teams, scores);

    return (
        <div className="space-y-8">
            {/* Standings Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clasificación General</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Pos</th>
                                <th className="px-6 py-4 font-semibold">Equipo</th>
                                <th className="px-6 py-4 font-semibold text-right">Media</th>
                                <th className="px-6 py-4 font-semibold text-right">Puntos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {standings.map((team, index) => (
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
                                                    {team.isInactive && (
                                                        <div className="group relative cursor-help flex items-center">
                                                            <span className="text-lg leading-none">🌈</span>
                                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10 whitespace-normal max-w-[200px] text-center">
                                                                Este jugador parece inactivo (0 pts en las últimas 3 jornadas)
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!team.isInactive && streakTeams.hot.has(team.id) && (
                                                        <div className="group relative flex items-center">
                                                            <span className="text-lg leading-none">🔥</span>
                                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                                                                ¡En racha! Supera la media de las últimas 3 jornadas
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!team.isInactive && streakTeams.cold.has(team.id) && (
                                                        <div className="group relative flex items-center">
                                                            <span className="text-lg leading-none">🐴</span>
                                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                                                                Por debajo de la media de la liga en las últimas 3 jornadas
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`text-xs ${team.isInactive ? 'text-gray-400 dark:text-gray-600 opacity-60' : 'text-gray-500 dark:text-gray-400'}`}>{team.owner}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300 font-mono">{team.average}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white font-mono text-lg">{team.totalPoints}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rank History Chart (Bump Chart) */}
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
        </div>
    );
};

export default ClassificationTab;
