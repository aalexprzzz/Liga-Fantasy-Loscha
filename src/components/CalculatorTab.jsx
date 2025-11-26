import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Rocket, Mountain, Trophy, ArrowRight } from 'lucide-react';
import { calculateStandings } from '../utils/calculations';

const CalculatorTab = ({ teams, scores }) => {
    // 1. Logic: Calculate current standings
    const standings = useMemo(() => calculateStandings(teams, scores), [teams, scores]);

    // State for controls
    const [myTeamId, setMyTeamId] = useState('');
    const [targetTeamId, setTargetTeamId] = useState('');
    const [matchdays, setMatchdays] = useState(5);

    // Set default values
    useEffect(() => {
        if (standings.length > 0) {
            // Default target is the leader
            if (!targetTeamId) {
                setTargetTeamId(standings[0].id);
            }
            // Default my team (just pick the second one or the last one for demo purposes if not set)
            // Or leave empty to force user selection. Let's pick the last one for dramatic effect if not set.
            if (!myTeamId && standings.length > 1) {
                setMyTeamId(standings[standings.length - 1].id);
            }
        }
    }, [standings, myTeamId, targetTeamId]);

    // Calculate difference and required points
    const calculationResult = useMemo(() => {
        if (!myTeamId || !targetTeamId) return null;

        const myTeam = standings.find(t => t.id === parseInt(myTeamId));
        const targetTeam = standings.find(t => t.id === parseInt(targetTeamId));

        if (!myTeam || !targetTeam) return null;

        const diff = targetTeam.totalPoints - myTeam.totalPoints;
        const pointsPerMatchday = diff > 0 ? (diff / matchdays).toFixed(1) : 0;

        return {
            myTeam,
            targetTeam,
            diff,
            pointsPerMatchday
        };
    }, [myTeamId, targetTeamId, matchdays, standings]);

    if (standings.length === 0) return <div className="text-center p-10">No hay datos suficientes para calcular.</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Controls Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuración de Remontada</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* My Team Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Soy el equipo...
                        </label>
                        <select
                            value={myTeamId}
                            onChange={(e) => setMyTeamId(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5"
                        >
                            {standings.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name} ({team.totalPoints} pts)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Target Team Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quiero alcanzar a...
                        </label>
                        <select
                            value={targetTeamId}
                            onChange={(e) => setTargetTeamId(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5"
                        >
                            {standings.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name} ({team.totalPoints} pts)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Matchdays Slider */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            En cuántas jornadas: <span className="text-blue-600 dark:text-blue-400 font-bold text-lg ml-1">{matchdays}</span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={matchdays}
                            onChange={(e) => setMatchdays(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1 jornada</span>
                            <span>10 jornadas</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Card (Glassmorphism) */}
            {calculationResult && (
                <div className="relative overflow-hidden rounded-2xl p-8 shadow-2xl transition-all duration-500 transform hover:scale-[1.01]">
                    {/* Background with gradient and glass effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 opacity-90"></div>
                    <div className="absolute inset-0 backdrop-blur-xl bg-white/5 border border-white/10"></div>

                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">

                        {calculationResult.diff <= 0 ? (
                            // Winning State
                            <>
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                    <Trophy className="w-10 h-10 text-green-400" />
                                </div>
                                <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
                                    ¡Ya estás por delante!
                                </h3>
                                <p className="text-lg text-blue-100 max-w-2xl">
                                    Actualmente superas a <span className="font-bold text-white">{calculationResult.targetTeam.name}</span> por <span className="font-bold text-green-400">{Math.abs(calculationResult.diff)}</span> puntos.
                                    <br />¡Mantén el ritmo para asegurar la victoria!
                                </p>
                            </>
                        ) : (
                            // Chasing State
                            <>
                                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                    {matchdays <= 3 ? (
                                        <Rocket className="w-10 h-10 text-blue-400" />
                                    ) : (
                                        <Mountain className="w-10 h-10 text-blue-400" />
                                    )}
                                </div>

                                <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm font-medium mb-6">
                                    Misión: Remontada
                                </div>

                                <h3 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200 mb-6 tracking-tight drop-shadow-sm">
                                    Recortar <span className="text-yellow-400">{calculationResult.pointsPerMatchday}</span> pts / jornada
                                </h3>

                                <div className="bg-white/10 rounded-xl p-6 max-w-3xl w-full backdrop-blur-sm border border-white/10">
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-lg text-blue-50">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">Distancia actual:</span>
                                            <span className="font-bold text-white text-xl">{calculationResult.diff} pts</span>
                                        </div>
                                        <ArrowRight className="hidden md:block w-5 h-5 text-gray-500" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">Meta:</span>
                                            <span>Empatar en <span className="font-bold text-white">{matchdays} jornadas</span></span>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-white/10 text-sm text-blue-200/80">
                                        Si <span className="font-bold text-white">{calculationResult.targetTeam.name}</span> hace su media habitual, tú necesitarás hacer <span className="font-bold text-yellow-300">{(parseFloat(calculationResult.targetTeam.average) + parseFloat(calculationResult.pointsPerMatchday)).toFixed(1)}</span> puntos por jornada.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalculatorTab;
