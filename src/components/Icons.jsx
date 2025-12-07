import React from 'react';
import { Flame } from 'lucide-react';

export const IconFireOrange = ({ className }) => (
    <Flame
        className={`w-6 h-6 text-orange-500 ${className || ''}`}
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 3px #f97316)' }}
    />
);

export const IconFirePurple = ({ className }) => (
    <Flame
        className={`w-6 h-6 text-purple-500 ${className || ''}`}
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 3px #a855f7)' }}
    />
);

export const IconFireBlue = ({ className }) => (
    <Flame
        className={`w-6 h-6 text-cyan-400 ${className || ''}`}
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }}
    />
);

export const IconFireGreen = ({ className }) => (
    <Flame
        className={`w-6 h-6 text-emerald-500 ${className || ''}`}
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 4px #10b981)' }}
    />
);
