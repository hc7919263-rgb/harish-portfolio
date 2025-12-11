import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Shield, AlertTriangle, Phone, Mail, CheckCircle, Smartphone, Calculator } from 'lucide-react';
import emailjs from '@emailjs/browser';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onNavigate: (page: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigate }) => {
    // State
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1=PIN, 2=OTP, 3=Math
    const [inputVal, setInputVal] = useState('');
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [isSending, setIsSending] = useState(false);

    // Math State
    const [mathQ, setMathQ] = useState({ q: '', a: 0 });

    // Lockout Timer
    useEffect(() => {
        let timer: any;
        if (isLocked && countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else if (isLocked && countdown === 0) {
            setIsLocked(false);
            setAttempts(0);
            setError('');
        }
        return () => clearTimeout(timer);
    }, [isLocked, countdown]);

    // Generate Math Question
    useEffect(() => {
        if (step === 3) {
            const n1 = Math.floor(Math.random() * 20) + 10; // 10-30
            const n2 = Math.floor(Math.random() * 10) + 1;  // 1-10
            const ops = ['+', '-', '*'];
            const op = ops[Math.floor(Math.random() * 3)];

            let ans = 0;
            if (op === '+') ans = n1 + n2;
            if (op === '-') ans = n1 - n2;
            if (op === '*') ans = n1 * n2;

            setMathQ({ q: `${n1} ${op} ${n2}`, a: ans });
            setInputVal('');
        }
    }, [step]);

    // Handlers
    const handleSendOtp = async () => {
        setIsSending(true);
        setError(''); // Clear previous errors
        try {
            console.log("Requesting OTP...");
            // 1. Ask Server to generate OTP and send email securely
            const res = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // Send to default admin
            });

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();

            if (data.success) {
                console.log("Secure OTP Sent by Server");
            } else {
                console.warn("Server message:", data.message);
                throw new Error(data.message || 'Server failed to generate OTP');
            }
        } catch (err: any) {
            console.error("Failed to send OTP:", err);
            // Show network or parsing errors
            setError(`Failed to send email: ${err.message || 'Network Error'}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleVerifyOtp = async () => {
        setIsLocked(true); // Temp lock UI while validating
        try {
            const res = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: inputVal })
            });
            const data = await res.json();

            if (data.success) {
                setStep(3);
                setError('');
                setIsLocked(false);
            } else {
                setIsLocked(false);
                handleFail();
            }
        } catch (e) {
            setIsLocked(false);
            setError('Verification Error');
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return;
        if (!inputVal) return;

        // Step 1: PIN
        if (step === 1) {
            try {
                const res = await fetch('/api/verify-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: inputVal })
                });
                const data = await res.json();

                if (data.success) {
                    setStep(2);
                    setInputVal('');
                    setError('');
                    handleSendOtp();
                } else {
                    handleFail();
                }
            } catch (err) {
                console.error("PIN check failed", err);
                setError("Connection Error");
            }
        }
        // Step 2: OTP
        else if (step === 2) {
            await handleVerifyOtp();
        }
        // Step 3: Math
        else if (step === 3) {
            if (parseInt(inputVal) === mathQ.a) {
                onLoginSuccess();
            } else {
                handleFail();
            }
        }
    };

    const handleFail = () => {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 3) {
            setIsLocked(true);
            setCountdown(30);
            setError('System Locked');
        } else {
            setError('Invalid Entry');
        }
        setInputVal('');
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <button
                onClick={() => onNavigate('home')}
                className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-white transition-all z-20 group font-medium"
            >
                <div className="p-2 bg-gray-900/50 rounded-full group-hover:bg-gray-800 border border-gray-800 group-hover:border-gray-700 transition-all">
                    <ArrowLeft className="w-4 h-4" />
                </div>
                <span>Back to Portfolio</span>
            </button>

            <div className="w-full max-w-md relative z-10 perspective-1000">
                <div className="bg-gray-900/40 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden">

                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 mb-6 shadow-lg shadow-blue-900/50">
                            {step === 1 && <Lock className="w-8 h-8 text-white" />}
                            {step === 2 && <Shield className="w-8 h-8 text-white" />}
                            {step === 3 && <Calculator className="w-8 h-8 text-white" />}
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                            {step === 1 ? 'Admin Access' : step === 2 ? 'Security Check' : 'Humanity Test'}
                        </h1>
                        <p className="text-gray-400 text-sm font-medium">
                            {step === 1 ? 'Enter your secure PIN to continue.' :
                                step === 2 ? (isSending ? 'Sending OTP via secure channel...' : 'Enter the code sent to your email.') :
                                    'Solve the equation to verify session.'}
                        </p>
                    </div>

                    {isLocked ? (
                        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl text-center mb-4 animate-in zoom-in duration-300">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3 animate-bounce" />
                            <h3 className="font-bold text-red-400 text-lg mb-1">Security Lockout</h3>
                            <p className="text-red-400/80 text-sm mb-4">Too many failed attempts.</p>
                            <div className="text-4xl font-black text-white font-mono">{countdown}s</div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {step === 3 && (
                                <div className="text-center">
                                    <div className="inline-block px-6 py-3 bg-gray-800/50 border border-gray-700 rounded-xl">
                                        <span className="text-3xl font-bold text-white font-mono tracking-wider">{mathQ.q} = ?</span>
                                    </div>
                                </div>
                            )}

                            <div className="relative group">
                                <input
                                    type={step === 3 ? "number" : "password"}
                                    autoFocus
                                    value={inputVal}
                                    onChange={(e) => setInputVal(e.target.value.replace(/\D/g, ''))}
                                    maxLength={step === 3 ? 10 : 6}
                                    disabled={isSending}
                                    className={`w-full bg-gray-950/50 border-2 text-center text-4xl font-bold py-5 rounded-2xl text-white placeholder-gray-800 transition-all focus:outline-none 
                                        ${error
                                            ? 'border-red-500/50 focus:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                            : 'border-gray-800 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]'}
                                        ${step !== 3 ? 'tracking-[0.5em]' : 'tracking-widest'}
                                    `}
                                    placeholder={step === 3 ? "?" : "••••••"}
                                />
                                {step === 2 && isSending && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm font-bold text-center animate-in slide-in-from-top-2 flex items-center justify-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!inputVal || isSending}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
                                    ${inputVal && !isSending
                                        ? 'bg-white text-black hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                                `}
                            >
                                {step === 3 ? 'Unlock Dashboard' : 'Continue'}
                                {!isSending && <ArrowLeft className="w-5 h-5 rotate-180" />}
                            </button>
                        </form>
                    )}

                    {/* Footer Status */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-xs text-gray-500 font-mono">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            System Online
                        </div>
                        <div>Secure Connection</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
