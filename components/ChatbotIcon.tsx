import React from 'react';

interface ChatbotIconProps {
    onNavigate: (page: 'chatbot') => void;
}

const ChatbotIcon: React.FC<ChatbotIconProps> = ({ onNavigate }) => {
    return (
        <div
            onClick={() => onNavigate('chatbot')}
            className="fixed bottom-6 right-6 z-50 group cursor-pointer"
        >
            {/* Thought Bubble */}
            <div className="absolute bottom-full right-4 mb-4 opacity-0 group-hover:opacity-100 md:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
                <div className="relative bg-white/80 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl shadow-xl shadow-black/5 whitespace-nowrap animate-bounce-subtle">
                    <span className="text-sm font-bold text-gray-800 tracking-tight">I am Analytica...</span>
                    {/* Bubble Tail */}
                    <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white/80 backdrop-blur-md border-r border-b border-white/20 rotate-45"></div>
                </div>
            </div>

            <div className="relative transition-transform duration-300 transform group-hover:scale-110 active:scale-95">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse group-hover:bg-blue-500/30 transition-colors"></div>
                <img
                    src="/assets/chatbot_icon.png"
                    alt="Chatbot"
                    className="w-16 h-16 rounded-full shadow-lg border-2 border-white/50 relative z-10"
                />
                <div className="absolute inset-0 rounded-full bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-20"></div>
            </div>

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default ChatbotIcon;
