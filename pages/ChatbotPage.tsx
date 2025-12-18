import React, { useState, useEffect, useRef } from 'react';
import { chatData, FAQ, Project } from '../utils/chatData';
import { useData } from '../context/DataContext';
import { GithubIcon } from '../components/icons/GithubIcon';

// --- Subcomponents ---

// 1. FAQ Item
const FAQItem: React.FC<{ faq: FAQ; onAsk: (q: string) => void }> = ({ faq, onAsk }) => {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 bg-white shadow-sm transition-all duration-300 hover:shadow-md group">
            <button
                onClick={() => onAsk(faq.question)}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-medium text-gray-800"
            >
                <span className="text-sm">{faq.question}</span>
                <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Ask <span className="text-lg">→</span>
                </span>
            </button>
        </div>
    );
};

// 2. Project Card
const ProjectCard: React.FC<{ project: any }> = ({ project }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm my-2 max-w-sm">
        <div className="p-4">
            <h3 className="font-bold text-lg text-black">{project.title}</h3>
            {project.skills && project.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 my-2">
                    {project.skills.map((t: string, i: number) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t}</span>
                    ))}
                </div>
            )}
            <p className="text-sm text-gray-600 mb-2">{project.description || project.summary}</p>

            <div className="flex gap-3 mt-3">
                {project.url && (
                    <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                    >
                        <span>🚀</span> View Project
                    </a>
                )}
            </div>
        </div>
    </div>
);

// 3. Message Bubble
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: number;
    projectData?: any;
}
interface MessageProps {
    msg: Message;
}
const MessageBubble: React.FC<MessageProps> = ({ msg }) => {
    const isBot = msg.sender === 'bot';
    const timeString = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex mb-6 ${isBot ? 'justify-start' : 'justify-end'}`}>
            {isBot && (
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mr-2 mt-1 border border-gray-100 shadow-sm">
                    <img src="/assets/chatbot_icon.png" alt="Bot" className="w-full h-full object-cover" />
                </div>
            )}
            <div className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} max-w-[75%]`}>
                <div
                    className={`px-5 py-4 rounded-2xl text-sm leading-relaxed relative shadow-sm ${isBot ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-black text-white rounded-tr-none'
                        }`}
                >
                    {msg.text}
                </div>
                {msg.projectData && <div className="mt-2"><ProjectCard project={msg.projectData} /></div>}
                <span className="text-[10px] text-gray-400 mt-1 px-1">{timeString}</span>
            </div>
        </div>
    );
};

// 4. Input Bar
interface InputBarProps {
    onSend: (text: string) => void;
}
const InputBar: React.FC<InputBarProps> = ({ onSend }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text);
            setText('');
        }
    };

    return (
        <div className="p-4 bg-transparent shrink-0">
            <form onSubmit={handleSubmit} className="mx-auto w-[90%] max-w-2xl p-2 bg-white border border-gray-200 rounded-full shadow-xl flex gap-2 items-center">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-gray-800 placeholder-gray-400"
                />
                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="p-3 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    ➤
                </button>
            </form>
        </div>
    );
};

// --- Main Page Component ---

const ChatbotPage: React.FC = () => {
    const { faqs, projects } = useData();
    const [messages, setMessages] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All'); // FAQ Filter State

    // Auto-scroll ref
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);


    // Filter FAQs logic
    const filteredFAQs = activeFilter === 'All'
        ? faqs
        : faqs.filter(faq => faq.category === activeFilter);


    // Bot Logic
    const handleSend = (text: string) => {
        const userMsg: Message = { id: Date.now().toString(), text, sender: 'user', timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        setTimeout(() => {
            const lowerText = text.toLowerCase();
            let botText = chatData.responses.unknown;
            let projectData: any | undefined;

            // 1. Check Greeting
            if (['hi', 'hello', 'hey', 'greetings', 'who are you', 'what is your name'].some(g => lowerText.includes(g))) {
                botText = chatData.responses.greeting;
            }
            // 2. Check Projects
            else if (lowerText.includes('project') || lowerText.includes('work') || lowerText.includes('portfolio') || lowerText.includes('creations')) {
                if (projects && projects.length > 0) {
                    const randomProject = projects[Math.floor(Math.random() * projects.length)];
                    botText = `I found some of Harish's projects. Here is one called "${randomProject.title}":`;
                    projectData = randomProject;
                } else {
                    botText = "Harish hasn't added any projects to the database yet, but you can check his GitHub for more!";
                }
            }
            // 3. Contact
            else if (lowerText.includes('contact') || lowerText.includes('hire') || lowerText.includes('email') || lowerText.includes('phone') || lowerText.includes('linkedin')) {
                botText = chatData.responses.contact;
            }
            // 4. FAQ Match (Dynamic from Context)
            else {
                const faqMatch = faqs.find(f =>
                    lowerText.includes(f.question.toLowerCase()) ||
                    f.question.toLowerCase().includes(lowerText) ||
                    (f.tags && f.tags.some(t => lowerText.includes(t.toLowerCase())))
                );

                if (faqMatch) {
                    botText = faqMatch.answer;
                }
            }

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: botText,
                sender: 'bot',
                timestamp: Date.now(),
                projectData
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 600);
    };

    // Initial Greeting Effect
    useEffect(() => {
        if (messages.length === 0) {
            const initialGreeting: Message = {
                id: 'init-1',
                text: chatData.responses.greeting,
                sender: 'bot',
                timestamp: Date.now()
            };
            setMessages([initialGreeting]);
        }
    }, []); // Run once on mount

    // Reset & Export
    const handleReset = () => {
        setMessages([]);
    };

    const handleExport = () => {
        const textLog = messages.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.text}`).join('\n');
        navigator.clipboard.writeText(textLog);
        alert('Chat copied to clipboard!');

        // Download
        const blob = new Blob([textLog], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat_transcript.txt';
        a.click();
    };


    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row pt-20 h-screen font-['Roboto']">
            {/* LEFT COLUMN: FAQ & Sidebar */}
            <div className="w-full md:w-[40%] bg-white flex flex-col h-[40vh] md:h-full z-10 shadow-lg md:shadow-none">
                <div className="px-6 pt-6 pb-2 bg-white sticky top-0 z-20 text-center">
                    <h2 className="text-2xl font-black text-black mb-4">FAQs</h2>
                    {/* Filter Chips */}
                    <div className="flex flex-wrap justify-center gap-2 mb-2">
                        <button
                            onClick={() => setActiveFilter('All')}
                            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeFilter === 'All'
                                ? 'bg-black text-white shadow-lg'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            All
                        </button>
                        {chatData.chips.map(chip => (
                            <button
                                key={chip.id}
                                onClick={() => setActiveFilter(chip.label)}
                                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeFilter === chip.label
                                    ? 'bg-black text-white shadow-lg toggle-selected'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 space-y-2">
                    {filteredFAQs.map(faq => (
                        <FAQItem key={faq.id} faq={faq} onAsk={handleSend} />
                    ))}
                    {filteredFAQs.length === 0 && <p className="text-center text-gray-400 mt-10">No FAQs found for this filter.</p>}
                </div>
            </div>

            {/* RIGHT COLUMN: Chat Interface */}
            <div className="w-full md:w-[60%] flex flex-col h-[60vh] md:h-full bg-white relative">
                {/* Header */}
                <div className="h-16 bg-white px-6 z-10 shrink-0 flex justify-center items-center relative">
                    <div className="absolute left-6 hidden md:block">
                        {/* Empty/back button space if needed */}
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-black text-xl">Analytica - An Virtual Assistant</h3>
                    </div>
                    <div className="absolute right-6 flex items-center gap-2">
                        <button onClick={handleReset} className="p-2 transition-colors hover:opacity-80" title="Reset Chat">
                            <img src="/assets/reset_icon.png" alt="Reset" className="w-6 h-6 object-contain" />
                        </button>
                        <button onClick={handleExport} className="p-2 transition-colors hover:opacity-80" title="Export Chat">
                            <img src="/assets/export_icon.png" alt="Export" className="w-6 h-6 object-contain" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 pb-6 scroll-smooth">
                    {/* Empty State / Profile Section */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-80">
                            <div className="w-40 h-40 flex items-center justify-center mb-6 transform hover:scale-105 transition-transform duration-300">
                                <img src="/assets/chatbot_icon.png" alt="Bot" className="w-full h-full" />
                            </div>
                            <h2 className="text-2xl font-bold text-black mb-2">Harish's Virtual Assistant</h2>
                            <p className="text-gray-500 max-w-md">
                                I'm here to help you explore Harish's portfolio. Ask me about his projects, skills, or contact info.
                            </p>
                        </div>
                    )}

                    {messages.map(msg => (
                        <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    {isTyping && (
                        <div className="flex items-center gap-1 text-gray-400 text-xs ml-4 mb-4">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <InputBar onSend={handleSend} />
            </div>
        </div>
    );
};

export default ChatbotPage;
