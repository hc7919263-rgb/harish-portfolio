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
            {/* Thought Bubble (SVG Cloud Style) */}
            <div className="absolute bottom-full right-0 mb-8 pointer-events-none animate-bubble-loop">
                <div className="relative flex flex-col items-center">
                    {/* SVG Cloud Shape */}
                    <div className="relative">
                        <svg width="180" height="70" viewBox="0 0 180 70" className="drop-shadow-xl filter">
                            <path
                                d="M20,40 Q20,10 50,10 Q60,0 80,5 Q100,-5 120,5 Q140,0 155,15 Q175,20 175,40 Q175,65 145,65 Q130,75 110,65 Q90,75 70,65 Q40,75 20,60 Q5,60 5,45 Q5,30 20,40"
                                fill="rgba(255, 255, 255, 0.95)"
                                stroke="rgba(255, 255, 255, 0.3)"
                                strokeWidth="1"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center pb-1">
                            <span className="text-sm font-black text-gray-800 tracking-tight">Ask me about Harish!</span>
                        </div>
                    </div>

                    {/* Thought Dots */}
                    <div className="flex flex-col items-end w-full pr-12 mt-[-5px] gap-1.5 translate-x-1">
                        <div className="w-3.5 h-3.5 bg-white/95 backdrop-blur-sm rounded-full border border-white/20 shadow-sm"></div>
                        <div className="w-2 h-2 bg-white/95 backdrop-blur-sm rounded-full border border-white/20 shadow-sm mr-1"></div>
                    </div>
                </div>
            </div>

            <div className="relative transition-transform duration-300 transform group-hover:scale-110 active:scale-95">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse group-hover:bg-blue-500/30 transition-colors"></div>
                <img
                    src="/assets/chatbot_icon.png"
                    alt="Chatbot"
                    className="w-16 h-16 rounded-full relative z-10"
                />
                <div className="absolute inset-0 rounded-full bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-20"></div>
            </div>

            <style>{`
                @keyframes bubble-loop {
                    0%, 100% { opacity: 0; transform: translateY(15px) scale(0.85); }
                    5%, 85% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-bubble-loop {
                    animation: bubble-loop 8s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default ChatbotIcon;
