import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateProjections } from '../utils/calculations';
import { Settings } from 'lucide-react';

const PredictionTab = ({ teams, scores }) => {
  const [weeks, setWeeks] = useState(5);

  const chartData = useMemo(() => {
    const rawData = calculateProjections(teams, scores, weeks);

    // Transform data to split history and projection for each team
    return rawData.map((point, index) => {
      const isProjection = point.isProjection;

      const newPoint = { ...point };

      teams.forEach(team => {
        // History line: exists if NOT projection, OR if it's the connection point (last history)
        // Actually, simpler: History line shows up to last history point.
        // Projection line shows from last history point onwards.

        // We need separate keys for Recharts to draw separate lines
        // team.id -> history
        // team.id_proj -> projection

        if (isProjection) {
          newPoint[`${team.id}_proj`] = point[team.id];
          newPoint[team.id] = null; // Hide from history line
        } else {
          newPoint[team.id] = point[team.id];
          // If this is the last history point, it should also be the start of projection line
          if (index === rawData.findIndex(p => p.isProjection) - 1) {
            newPoint[`${team.id}_proj`] = point[team.id];
          } else {
            newPoint[`${team.id}_proj`] = null;
          }
        }
      });

      return newPoint;
    });
  }, [weeks, teams]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Proyección Algorítmica</h2>

        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-lg">
          <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Proyectar {weeks} jornadas
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
          />
        </div>
      </div>

      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF' }}
              dy={10}
            />
            <YAxis
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
              labelFormatter={(label) => `Jornada ${label}`}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />

            {/* Render History Lines (Solid) */}
            {teams.map((team) => (
              <Line
                key={team.id}
                type="monotone"
                dataKey={team.id}
                name={team.name}
                stroke={team.color}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                connectNulls={false} // Important: don't connect over nulls if we want gap, but here we want continuous look so we overlap
              />
            ))}

            {/* Render Projection Lines (Dashed) */}
            {teams.map((team) => (
              <Line
                key={`${team.id}_proj`}
                type="monotone"
                dataKey={`${team.id}_proj`}
                name={`${team.name} (Proj)`}
                stroke={team.color}
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                legendType="none" // Hide from legend to avoid duplicates
                connectNulls={true} // Connect the first point (overlap) to the rest
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
          * La proyección se basa en la media de puntos de las últimas 3 jornadas de cada equipo.
        </p>
      </div>
    </div>
  );
};

export default PredictionTab;
