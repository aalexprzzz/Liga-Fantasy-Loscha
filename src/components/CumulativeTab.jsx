
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateCumulative } from '../utils/calculations';

const CumulativeTab = ({ teams, scores }) => {
    const cumulativeData = calculateCumulative(teams, scores);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Puntos Acumulados</h2>
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cumulativeData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                                animationDuration={1500}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CumulativeTab;
