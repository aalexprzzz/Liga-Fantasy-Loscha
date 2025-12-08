
import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AVATAR_EMOJIS = [
    '🚬', // El que fuma en el banquillo
    '🍺', // La cerveza post-partido
    '🥃', // El whisky del presidente
    '💸', // El maletín/soborno
    '🧱', // El defensa leñero/muro
    '🚑', // El lesionado crónico
    '🤡', // El payaso
    '🐀', // La rata/chivato
    '🐖', // La cabeza de cochinillo/traidor
    '🧖‍♂️', // La sauna/fiesta
    '🌭', // El bocadillo de estadio
    '🚓', // La policía/detenido
];

const PressConferencePage = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Fetch messages
    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('press_messages')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        // Realtime subscription
        const channel = supabase
            .channel('public:press_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'press_messages' }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage.trim();
        // Generate a random seed based on... nothing? Random for now. 
        // Or specific to the user? Since it's anonymous, random per message is fine, 
        // OR random per "session" if we wanted to be fancy, but "random assigned to message" is simplest.
        const avatarSeed = Math.floor(Math.random() * AVATAR_EMOJIS.length);

        setNewMessage(''); // Optimistic clear

        try {
            const { error } = await supabase
                .from('press_messages')
                .insert([{ content, avatar_seed: avatarSeed }]);

            if (error) throw error;
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error al enviar mensaje');
        }
    };

    const getEmoji = (seed) => {
        // Safe index access
        const index = seed % AVATAR_EMOJIS.length;
        return AVATAR_EMOJIS[index] || '⚽';
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] container mx-auto max-w-2xl px-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        Zona Mixta
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Declaraciones en caliente, anónimas y sin filtro.
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                {loading ? (
                    <div className="text-center text-gray-400 py-10">Conectando con el vestuario...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-10 italic">
                        Los jugadores aún están en la ducha...
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Avatar */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl shadow-md border-2 border-gray-100 dark:border-gray-700">
                                {getEmoji(msg.avatar_seed)}
                            </div>

                            {/* Bubble */}
                            <div className="flex-1">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm leading-relaxed relative group">
                                    {msg.content}
                                    {/* Timestamp */}
                                    <span className="absolute bottom-1 right-3 text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                        {formatTime(msg.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="relative">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Suelta tu rajada aquí..."
                    className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm border border-transparent focus:border-indigo-500 transition-all placeholder-gray-500 dark:placeholder-gray-500"
                    maxLength={280}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-full transition-colors shadow-sm"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

export default PressConferencePage;
