
import React from 'react';
import { Swords, Skull } from 'lucide-react';

const VersusCard = ({ matchup, teams, scores, currentGameweek }) => {
    // matchup object: { player1_id, player2_id, gameweek, ... }

    // 1. Resolve Players
    const p1Id = matchup.player1_id;
    const p2Id = matchup.player2_id;

    // Handle Bye Week
    if (!p2Id) {
        const p1 = teams.find(t => t.id === p1Id);
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center h-full">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-gray-700 shadow-md mb-3" style={{ backgroundColor: p1?.color }}></div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{p1?.name}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                    Descanso (Bye)
                </span>
            </div>
        );
    }

    const p1 = teams.find(t => t.id === p1Id);
    const p2 = teams.find(t => t.id === p2Id);

    // 2. Get Scores
    // currentGameweek is string "J10" probably, but let's ensure we match the matchup's gameweek
    const duelGameweekId = `J${matchup.gameweek}`;
    const weekData = scores.find(s => s.id === duelGameweekId);

    const p1Points = weekData?.scores[p1Id] || 0;
    const p2Points = weekData?.scores[p2Id] || 0;

    // 3. Determine Winner
    // If weekData doesn't exist, scores are 0-0.
    const diff = p1Points - p2Points;

    // Visuals
    // If p1 winning -> p1 green, p2 red? Or just border?
    // User asked: "Green for winner, Red for loser" (implied relative to view, but global "Resalta en verde el nombre/puntos del que va ganando")

    const p1Winning = diff > 0;
    const p2Winning = diff < 0;
    const draw = diff === 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gray-50 dark:bg-gray-700/50 py-1 text-center border-b border-gray-100 dark:border-gray-700 mb-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                    Duelo J{matchup.gameweek}
                </p>
            </div>

            <div className="flex items-center justify-between px-4 pb-4 pt-2">
                {/* Player 1 */}
                <div className={`flex-1 flex flex-col items-center text-center p-2 rounded-lg transition-colors ${p1Winning ? 'bg-green-50 dark:bg-green-900/10' : ''}`}>
                    <div className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-600 shadow-sm mb-2" style={{ backgroundColor: p1?.color }}></div>
                    <h3 className={`font-bold text-sm leading-tight mb-1 ${p1Winning ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                        {p1?.name}
                    </h3>
                    <div className={`text-2xl font-black font-mono ${p1Winning ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-300'}`}>
                        {p1Points}
                    </div>
                </div>

                {/* VS */}
                <div className="flex flex-col items-center justify-center px-2">
                    <Swords className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                    {weekData && !draw && (
                        <span className={`text-xs font-bold mt-1 ${p1Winning ? 'text-green-500' : 'text-green-500' /* Winner always green relative? No, diff is abs */}`}>
                            +{Math.abs(diff)}
                        </span>
                    )}
                </div>

                {/* Player 2 */}
                <div className={`flex-1 flex flex-col items-center text-center p-2 rounded-lg transition-colors ${p2Winning ? 'bg-green-50 dark:bg-green-900/10' : ''}`}>
                    <div className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-600 shadow-sm mb-2" style={{ backgroundColor: p2?.color }}></div>
                    <h3 className={`font-bold text-sm leading-tight mb-1 ${p2Winning ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                        {p2?.name}
                    </h3>
                    <div className={`text-2xl font-black font-mono ${p2Winning ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-300'}`}>
                        {p2Points}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VersusCard;
