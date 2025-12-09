
import React, { useState, useMemo } from 'react';
import { Swords, Trophy, Milk } from 'lucide-react';
import VersusCard from './VersusCard';
import { supabase } from '../supabaseClient';
import { identifyInactiveTeams } from '../utils/calculations';

const MatchupsTab = ({ teams, scores, matchups, isAdmin, onUpdate }) => {
    // Admin state for generation
    const [genMatchday, setGenMatchday] = useState('');
    const [loading, setLoading] = useState(false);

    // Display state
    // We want to show matchups for a specific gameweek? Or all?
    // "Consulta la tabla weekly_matchups de Supabase para esa jornada."
    // Let's default to the *latest* gameweek found in matchups, OR allow selection.
    // For "The Arena", usually we show the ACTIVE (latest) one by default.

    // Sort matchups by gameweek to find latest
    const latestGameweek = useMemo(() => {
        if (!matchups || matchups.length === 0) return 0;
        return Math.max(...matchups.map(m => m.gameweek));
    }, [matchups]);

    const [selectedGameweek, setSelectedGameweek] = useState(latestGameweek || 1);

    // Filter matchups for display
    const currentMatchups = useMemo(() => {
        if (!matchups) return [];
        return matchups.filter(m => m.gameweek === parseInt(selectedGameweek));
    }, [matchups, selectedGameweek]);

    // Derived: List of available gameweeks in matchups (for dropdown filter if we want)
    const availableGameweeks = useMemo(() => {
        if (!matchups) return [];
        return [...new Set(matchups.map(m => m.gameweek))].sort((a, b) => b - a);
    }, [matchups]);


    const handleGenerateDuels = async () => {
        if (!genMatchday) return alert('Indica el número de jornada');
        const gw = parseInt(genMatchday.replace(/\D/g, ''));
        if (!gw) return alert('Jornada inválida');

        setLoading(true);
        try {
            // 1. Identify active teams
            const inactiveTeams = identifyInactiveTeams(teams, scores);
            let activeTeams = teams.filter(t => !inactiveTeams.has(t.id));
            const pairs = [];

            // 2. Handle Bye Week (Fair Rotation)
            if (activeTeams.length % 2 !== 0) {
                // Calculate past byes for each ACTIVE team
                const byeCounts = new Map();
                activeTeams.forEach(t => byeCounts.set(t.id, 0));

                matchups.forEach(m => {
                    // Start checking "Bye matches" (where player2_id is null)
                    let p1 = m.player1_id;
                    let p2 = m.player2_id;
                    if (!p2 && byeCounts.has(p1)) {
                        byeCounts.set(p1, byeCounts.get(p1) + 1);
                    }
                });

                // Find min byes
                let minByes = Infinity;
                byeCounts.forEach(count => {
                    if (count < minByes) minByes = count;
                });

                // Candidates for bye (those with minByes)
                const byeCandidates = activeTeams.filter(t => byeCounts.get(t.id) === minByes);

                // Randomly pick one among the deserving candidates
                const selectedBye = byeCandidates[Math.floor(Math.random() * byeCandidates.length)];

                // Create the Bye Match
                pairs.push({
                    gameweek: gw,
                    player1_id: selectedBye.id,
                    player2_id: null,
                    winner_id: null
                });

                // Remove from pool
                activeTeams = activeTeams.filter(t => t.id !== selectedBye.id);
            }

            // 3. Build History Matrix
            const history = new Map(); // Key: "id1-id2" (sorted), Value: { count, lastGameweek }

            const getPairKey = (id1, id2) => {
                return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
            };

            matchups.forEach(m => {
                if (m.player2_id) { // Only real duels
                    const key = getPairKey(m.player1_id, m.player2_id);
                    const existing = history.get(key) || { count: 0, lastGameweek: 0 };
                    history.set(key, {
                        count: existing.count + 1,
                        lastGameweek: Math.max(existing.lastGameweek, m.gameweek)
                    });
                }
            });

            // 4. Fair Pairing (Greedy Algorithm)
            // Shuffle first to randomize tie-breaking order
            activeTeams.sort(() => 0.5 - Math.random());

            while (activeTeams.length > 0) {
                // If only 1 left (shouldn't happen due to bye logic, but safety check)
                if (activeTeams.length === 1) {
                    console.warn("Odd number of teams remaining after bye logic!?");
                    break;
                }

                const p1 = activeTeams[0];
                let bestP2 = null;
                let minPenalty = Infinity;
                let bestP2Index = -1;

                // Check p1 against all other available candidates
                for (let i = 1; i < activeTeams.length; i++) {
                    const candidate = activeTeams[i];
                    const key = getPairKey(p1.id, candidate.id);
                    const record = history.get(key) || { count: 0, lastGameweek: 0 };

                    // Penalty Calculation
                    // Priority 1: Count (Primary Factor). Weight: 1,000,000
                    // Priority 2: Recency (Secondary). We want to avoid recent matches.
                    // Penalty = (Count * 1,000,000) + LastGameweek
                    // Example:
                    // Played 0 times: Penalty 0 + 0 = 0 (Best)
                    // Played 1 time at J5: 1,000,005
                    // Played 1 time at J10: 1,000,010 (Worse than J5) -> Correct, we prefer older match

                    const penalty = (record.count * 1000000) + record.lastGameweek;

                    if (penalty < minPenalty) {
                        minPenalty = penalty;
                        bestP2 = candidate;
                        bestP2Index = i;
                    }
                }

                // If no candidate found (weird), take next.
                if (!bestP2) {
                    bestP2 = activeTeams[1];
                    bestP2Index = 1;
                }

                // Add Pair
                pairs.push({
                    gameweek: gw,
                    player1_id: p1.id,
                    player2_id: bestP2.id,
                    winner_id: null
                });

                // Remove p1 and p2 from activeTeams
                // activeTeams current indices: p1 is 0, p2 is bestP2Index
                // Remove higher index first to not shift 0
                activeTeams.splice(bestP2Index, 1);
                activeTeams.shift(); // Remove p1
            }

            // 5. Clean old matches & Insert
            // ... (Same as before)
            await supabase.from('weekly_matchups').delete().eq('gameweek', gw);
            const { error } = await supabase.from('weekly_matchups').insert(pairs);
            if (error) throw error;

            alert(`¡Duelos Balanceados Generados (J${gw})!\n- Byes gestionados: Sí\n- Enfrentamientos: ${pairs.length}`);
            setGenMatchday('');
            onUpdate();

        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header / Admin Zone */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Swords className="w-6 h-6 text-indigo-500" />
                        El Duelo Semanal
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Enfrentamientos directos 1vs1. El perdedor se lleva el 👶.
                    </p>
                </div>

                {/* Gameweek Filter Selector */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Jornada:</label>
                    <select
                        value={selectedGameweek}
                        onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableGameweeks.length > 0 ? (
                            availableGameweeks.map(gw => (
                                <option key={gw} value={gw}>J{gw}</option>
                            ))
                        ) : (
                            <option value={1}>-</option>
                        )}
                    </select>
                </div>
            </div>

            {/* Admin Generation Panel (Visible to Admin Only) */}
            {isAdmin && (
                <div className="mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1">
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">Panel de Admin</h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-400">Generar nuevos emparejamientos.</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Jornada (ej: J12)"
                            value={genMatchday}
                            onChange={(e) => setGenMatchday(e.target.value)}
                            className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm w-full sm:w-32"
                        />
                        <button
                            onClick={handleGenerateDuels}
                            disabled={loading}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-bold disabled:opacity-50 whitespace-nowrap"
                        >
                            <Swords className="w-4 h-4" />
                            {loading ? '...' : 'Generar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Content Layout */}
            <div className="flex flex-col xl:flex-row gap-8 items-start">

                {/* Left: Leaderboard (On Desktop) or Top (On Mobile) */}
                <div className="w-full xl:w-96 flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-500 order-2 xl:order-1">
                    <DuelLeaderboard teams={teams} scores={scores} matchups={matchups} />
                </div>

                {/* Right: Matchups Grid */}
                <div className="flex-1 w-full order-1 xl:order-2">
                    {currentMatchups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {currentMatchups.map(match => (
                                <VersusCard
                                    key={match.id}
                                    matchup={match}
                                    teams={teams}
                                    scores={scores}
                                    currentGameweek={`J${selectedGameweek}`} // Pass string format for score lookup
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                            <Swords className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">No hay duelos generados para la Jornada {selectedGameweek}.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DuelLeaderboard = ({ teams, scores, matchups }) => {

    // Calculate Standings
    const standings = useMemo(() => {
        if (!teams || teams.length === 0) return [];

        // Initialize stats
        const stats = new Map();
        teams.forEach(t => {
            stats.set(t.id, {
                id: t.id,
                team: t,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                points: 0, // 3-1-0
                isPunished: false,
                lastLossInfo: null
            });
        });

        if (!matchups) return Array.from(stats.values());

        // Calculate Punishment (Milk)
        // Check LAST COMPLETED duel for each team
        teams.forEach(team => {
            // Find ALL COMPLETED duels for this team
            const completedDuels = matchups.filter(m =>
                (m.player1_id === team.id || m.player2_id === team.id) &&
                m.winner_id // Only finalized duels
            );

            if (completedDuels.length > 0) {
                // Sort descending by gameweek
                completedDuels.sort((a, b) => b.gameweek - a.gameweek);
                const lastDuel = completedDuels[0];

                // Check if I am the loser
                if (lastDuel.winner_id !== team.id) {
                    // Check if it was a draw? Rules say "winner_id !== player_id (y no es empate)"
                    // If winner_id is present, it's not a draw usually? 
                    // Or maybe winner_id='draw' or null?
                    // Loop above skipped if !winner_id. 
                    // Assuming valid winner_id means someone won.
                    // If it's not me, I lost.

                    const statsEntry = stats.get(team.id);
                    if (statsEntry) {
                        statsEntry.isPunished = true;
                        statsEntry.lastLossInfo = `Perdió el duelo de la J${lastDuel.gameweek}`;
                    }
                }
            }
        });

        matchups.forEach(m => {
            // Skip future matches or byes?
            // "Si winner_id es NULL Y la jornada del duelo ya ha terminado"
            // We rely on scores existence to know if it's "played".

            const duelGameweekId = `J${m.gameweek}`;
            const weekData = scores.find(s => s.id === duelGameweekId);

            if (!weekData) return; // Not played yet

            // Resolve Players
            const p1Id = m.player1_id;
            const p2Id = m.player2_id;

            if (!p2Id) return; // Bye match - usually counts as Win or Ignore? User didn't specify. Assuming ignore or automatic 3 pts? 
            // "Si alguien tiene que descansar... procura que sea el que menos veces ha descansado"
            // Typically Bye gives 3 points or avg. Let's assume IGNORE for now unless specified, OR treat as Win.
            // User rules: "Ganar: 3 puntos, Empatar 1, Perder 0". No mention of Bye. Let's ignore Byes for fairness metrics or treat as unplayed.

            const p1Score = weekData.scores[p1Id] || 0;
            const p2Score = weekData.scores[p2Id] || 0;

            const p1Stats = stats.get(p1Id);
            const p2Stats = stats.get(p2Id);

            if (p1Stats) p1Stats.played += 1;
            if (p2Stats) p2Stats.played += 1;

            if (p1Score > p2Score) {
                if (p1Stats) { p1Stats.wins += 1; p1Stats.points += 3; }
                if (p2Stats) { p2Stats.losses += 1; }
            } else if (p2Score > p1Score) {
                if (p2Stats) { p2Stats.wins += 1; p2Stats.points += 3; }
                if (p1Stats) { p1Stats.losses += 1; }
            } else {
                if (p1Stats) { p1Stats.draws += 1; p1Stats.points += 1; }
                if (p2Stats) { p2Stats.draws += 1; p2Stats.points += 1; }
            }
        });

        // Sort: Points Desc, then Wins Desc
        return Array.from(stats.values()).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.wins - a.wins;
        });

    }, [teams, scores, matchups]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Clasificación VS
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-bold">
                        <tr>
                            <th className="px-3 py-2 text-center">#</th>
                            <th className="px-3 py-2">Equipo</th>
                            <th className="px-2 py-2 text-center" title="Jugados">J</th>
                            <th className="px-2 py-2 text-center text-green-600" title="Ganados">G</th>
                            <th className="px-2 py-2 text-center text-gray-500" title="Empatados">E</th>
                            <th className="px-2 py-2 text-center text-red-500" title="Perdidos">P</th>
                            <th className="px-3 py-2 text-center font-black">Pts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {standings.map((row, index) => (
                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-3 py-3 text-center font-bold text-gray-400">
                                    {index + 1}
                                </td>
                                <td className="px-3 py-3 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0" style={{ backgroundColor: row.team.color }}></div>
                                    <span className="font-bold text-gray-900 dark:text-gray-100 truncate max-w-[100px] sm:max-w-none flex items-center">
                                        {row.team.name}
                                        {row.isPunished && (
                                            <Milk className="w-4 h-4 text-pink-400 inline-block ml-2" />
                                        )}
                                    </span>
                                </td>
                                <td className="px-2 py-3 text-center">{row.played}</td>
                                <td className="px-2 py-3 text-center font-medium text-green-600">{row.wins}</td>
                                <td className="px-2 py-3 text-center text-black dark:text-gray-400">{row.draws}</td>
                                <td className="px-2 py-3 text-center text-red-500">{row.losses}</td>
                                <td className="px-3 py-3 text-center font-black text-indigo-600 dark:text-indigo-400 text-base">
                                    {row.points}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MatchupsTab;
