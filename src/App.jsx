import React, { useState, useEffect } from 'react';
import { Flame, TrendingUp, Sparkles, Calculator, BarChart2, Swords, Mic } from 'lucide-react';
import ClassificationTab from './components/ClassificationTab';
import CumulativeTab from './components/CumulativeTab';
import PredictionTab from './components/PredictionTab';
import CalculatorTab from './components/CalculatorTab';
import StatisticsTab from './components/StatisticsTab';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './supabaseClient';
import { LEAGUE_DATA } from './data/leagueData';
import MatchupsTab from './components/MatchupsTab';
import PressConferencePage from './components/PressConferencePage';
import { MessageSquare } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('classification');
  const [isAdmin, setIsAdmin] = useState(false);
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [currentGameweek, setCurrentGameweek] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('id', { ascending: true });

      if (teamsError) throw teamsError;

      // Fetch Scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*');

      if (scoresError) throw scoresError;

      if (scoresError) throw scoresError;

      // Fetch Matchups
      const { data: matchupsData, error: matchupsError } = await supabase
        .from('weekly_matchups')
        .select('*');

      if (matchupsError) throw matchupsError;

      // Array of { id: 'J1', scores: { teamId: points } }
      const processedScores = [];
      const matchdays = [...new Set(scoresData.map(s => s.matchday))].sort((a, b) => {
        // Extract number from string (e.g., "J1" -> 1, "J10" -> 10)
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      matchdays.forEach(matchday => {
        const matchdayScores = {};
        scoresData
          .filter(s => s.matchday === matchday)
          .forEach(s => {
            matchdayScores[s.team_id] = s.points;
          });
        processedScores.push({ id: matchday, scores: matchdayScores });
      });

      setTeams(teamsData);
      setScores(processedScores);
      setMatchups(matchupsData || []);

      const lastMatchday = matchdays[matchdays.length - 1];
      setCurrentGameweek(lastMatchday);

    } catch (error) {
      console.error('Error fetching data:', error.message);
      // Fallback to mock data if DB is empty or error (optional, maybe just show empty state)
      // For now, let's start empty if DB is empty.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tabs = [
    { id: 'classification', label: 'Clasificación', icon: Flame },
    { id: 'duels', label: 'Duelos', icon: Swords },
    { id: 'press', label: 'Zona Mixta', icon: Mic },
    { id: 'cumulative', label: 'Acumulado', icon: TrendingUp },
    { id: 'prediction', label: 'Predicción', icon: Sparkles },
    { id: 'calculator', label: 'Calculadora', icon: Calculator },
    { id: 'statistics', label: 'Estadísticas', icon: BarChart2 },
  ];

  // Pass data props to children instead of them importing LEAGUE_DATA
  const renderTab = () => {
    if (loading) return <div className="text-center py-20">Cargando datos...</div>;
    if (teams.length === 0) return <div className="text-center py-20">No hay datos en la liga. {isAdmin && 'Añade equipos desde el panel.'}</div>;

    switch (activeTab) {
      case 'classification':
        return <ClassificationTab teams={teams} scores={scores} matchups={matchups} />;
      case 'cumulative':
        return <CumulativeTab teams={teams} scores={scores} />;
      case 'duels':
        return <MatchupsTab teams={teams} scores={scores} matchups={matchups} isAdmin={isAdmin} onUpdate={fetchData} />;
      case 'press':
        return <PressConferencePage />;
      case 'prediction':
        return <PredictionTab teams={teams} scores={scores} />;
      case 'calculator':
        return <CalculatorTab teams={teams} scores={scores} />;
      case 'statistics':
        return <StatisticsTab teams={teams} scores={scores} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <header className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Fantasy League Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Estadísticas en tiempo real, evolución y predicciones.
            </p>
          </div>

          <AdminLogin
            isAdmin={isAdmin}
            onLogin={() => setIsAdmin(true)}
            onLogout={() => setIsAdmin(false)}
          />
        </header>

        {/* Admin Panel (Conditional) */}
        {isAdmin && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <AdminPanel teams={teams} scores={scores} onUpdate={fetchData} />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full sm:w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={twMerge(
                  clsx(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-blue-600 text-white shadow-md transform scale-[1.02]"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  )
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderTab()}
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-500 pb-8">
          <p>© 2025 Fantasy League Dashboard. Built with React & Tailwind.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
