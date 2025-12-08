import React, { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AdminPanel = ({ teams, scores: existingScores, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('teams'); // 'teams', 'scores', 'duels'

    // Team Form State
    const [newTeam, setNewTeam] = useState({ name: '', owner: '', color: '#000000' });

    // Score Form State
    const [matchday, setMatchday] = useState('');
    const [scores, setScores] = useState({}); // { teamId: score }
    const [loading, setLoading] = useState(false);

    const handleAddTeam = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('teams')
                .insert([newTeam]);

            if (error) throw error;

            setNewTeam({ name: '', owner: '', color: '#000000' });
            onUpdate(); // Refresh data
            alert('Equipo añadido correctamente');
        } catch (error) {
            alert('Error al añadir equipo: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveScores = async (e) => {
        e.preventDefault();
        if (!matchday) return alert('Introduce el nombre de la jornada (ej: J1)');

        setLoading(true);
        try {
            const scoresToInsert = Object.entries(scores).map(([teamId, points]) => ({
                matchday,
                team_id: parseInt(teamId),
                points: parseInt(points)
            }));

            const { error } = await supabase
                .from('scores')
                .insert(scoresToInsert);

            if (error) throw error;

            setMatchday('');
            setScores({});
            onUpdate(); // Refresh data
            alert('Jornada guardada correctamente');
        } catch (error) {
            alert('Error al guardar puntuaciones: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                Panel de Administración
            </h2>

            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors \${
            activeTab === 'teams'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
                >
                    Gestionar Equipos
                </button>
                <button
                    onClick={() => setActiveTab('scores')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'scores'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Añadir Jornada
                </button>
            </div>

            {activeTab === 'teams' && (
                <form onSubmit={handleAddTeam} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Equipo</label>
                            <input
                                type="text"
                                value={newTeam.name}
                                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dueño</label>
                            <input
                                type="text"
                                value={newTeam.owner}
                                onChange={(e) => setNewTeam({ ...newTeam, owner: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={newTeam.color}
                                    onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                                    className="h-10 w-20 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={newTeam.color}
                                    onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        {loading ? 'Guardando...' : 'Añadir Equipo'}
                    </button>
                </form>
            )}

            {activeTab === 'scores' && (
                <form onSubmit={handleSaveScores} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Jornada (ej: J1)</label>
                        <input
                            type="text"
                            value={matchday}
                            onChange={(e) => setMatchday(e.target.value)}
                            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {teams.map((team) => (
                            <div key={team.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                                    <span className="font-medium text-gray-900 dark:text-white">{team.name}</span>
                                </div>
                                <input
                                    type="number"
                                    placeholder="Puntos"
                                    value={scores[team.id] || ''}
                                    onChange={(e) => setScores({ ...scores, [team.id]: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 w-full md:w-auto justify-center"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Guardando...' : 'Guardar Jornada'}
                    </button>
                </form>
            )}


        </div>
    );
};

export default AdminPanel;

