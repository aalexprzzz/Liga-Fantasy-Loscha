import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';

const AdminLogin = ({ isAdmin, onLogin, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
            onLogin();
            setIsOpen(false);
            setPassword('');
            setError(false);
        } else {
            setError(true);
        }
    };

    if (isAdmin) {
        return (
            <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
                <Unlock className="w-4 h-4" />
                Salir Admin
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Lock className="w-4 h-4" />
                Admin
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 z-50">
                    <form onSubmit={handleLogin}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="••••••••"
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-red-500 mb-3">Contraseña incorrecta</p>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
                        >
                            Entrar
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminLogin;
