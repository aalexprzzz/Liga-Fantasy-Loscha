import React from 'react';
import { calculatePositionalPoints } from '../utils/calculations';

const PositionalTab = ({ teams, scores }) => {
    const positionalStandings = calculatePositionalPoints(teams, scores);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clasificación por Posición</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Puntos otorgados según la posición en cada jornada (1º = N-1 puntos, Último = 0 puntos).
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Pos</th>
                            <th className="px-6 py-4 font-semibold">Equipo</th>
                            <th className="px-6 py-4 font-semibold text-right">Puntos Posicionales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {positionalStandings.map((team, index) => (
                            <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium">#{index + 1}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: team.color }}
                                        />
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">{team.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{team.owner}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white font-mono text-lg">
                                    {team.positionalPoints}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PositionalTab;
