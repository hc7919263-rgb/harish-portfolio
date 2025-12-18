import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Shield, AlertTriangle, Fingerprint, Calculator, Plus, Loader2 } from 'lucide-react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onNavigate: (page: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigate }) => {
    // State
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1=PIN, 2=Passkey, 3=Math
    const [inputVal, setInputVal] = useState('');
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Security Token for Registration
    const [regToken, setRegToken] = useState<string | null>(null);
    const [hasKeys, setHasKeys] = useState(false);

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
            const n1 = Math.floor(Math.random() * 20) + 10;
            const n2 = Math.floor(Math.random() * 10) + 1;
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

    // Auto-trigger Passkey Login on Step 2 entry
    useEffect(() => {
        if (step === 2 && !isLoading) {
            // Optional: Automatically try login? 
            // Better to let user click to avoid intrusive popups if they prefer registering
        }
    }, [step]);

    // --- Passkey Handlers ---

    const handleRegisterPasskey = async () => {
        setIsLoading(true);
        setError('');
        try {
            // 1. Get Challenge
            const headers: any = {};
            if (regToken) {
                headers['Authorization'] = `Bearer ${regToken}`;
            }

            const resp = await fetch('/api/auth/register-challenge', {
                method: 'POST',
                headers
            });

            if (resp.status === 401) {
                throw new Error("Session expired. Please re-enter PIN.");
            }

            const options = await resp.json();

            // 2. Browser Native Prompt
            const attResp = await startRegistration(options);

            // 3. Verify
            const verResp = await fetch('/api/auth/register-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attResp),
            });

            const verification = await verResp.json();

            if (verification.success) {
                // Success! Now allow them to proceed to step 3? 
                // Or just say "Registered! Now Login".
                alert("Passkey Registered Successfully! You can now use it to login.");
                // Let them try login now
            } else {
                throw new Error(verification.error || 'Verification failed');
            }
        } catch (e: any) {
            console.error("Passkey Register Error:", e);
            // Show detailed error
            const errMsg = e.message || e.name || 'Registration failed';
            setError(`Registration failed: ${errMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginPasskey = async () => {
        setIsLoading(true);
        setError('');
        try {
            // 1. Get Challenge
            const resp = await fetch('/api/auth/login-challenge', { method: 'POST' });
            const data = await resp.json();

            // FIX: Server returns options directly, OR { success: false, message: ... } on error
            if (data.success === false) {
                setError(data.message || 'No passkeys found. Please Register first.');
                return;
            }

            // 2. Browser Native Prompt
            // Pass 'data' directly as it contains the options
            const asseResp = await startAuthentication(data);

            // 3. Verify
            const verResp = await fetch('/api/auth/login-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asseResp),
            });

            const verification = await verResp.json();

            if (verification.success) {
                setStep(3); // Success -> Math
                setError('');
            } else {
                throw new Error('Authentication failed');
            }
        } catch (e: any) {
            console.error("Passkey Login Error:", e);
            const errMsg = e.message || e.name || 'Login failed';
            setError(`Login failed: ${errMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Submit Handlers ---

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return;

        // Step 1: PIN
        if (step === 1) {
            if (!inputVal) return;
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
                    // Store token for registration
                    if (data.registrationToken) {
                        setRegToken(data.registrationToken);
                        sessionStorage.setItem('admin_session_token', data.registrationToken);
                    }
                    if (data.passkeyCount !== undefined && data.passkeyCount > 0) {
                        setHasKeys(true);
                    } else {
                        setHasKeys(false);
                    }
                } else {
                    handleFail();
                }
            } catch (err) {
                console.error("PIN check failed", err);
                setError("Connection Error");
            }
        }
        // Step 3: Math
        else if (step === 3) {
            if (!inputVal) return;
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
                            {step === 2 && <Fingerprint className="w-8 h-8 text-white" />}
                            {step === 3 && <Calculator className="w-8 h-8 text-white" />}
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                            {step === 1 ? 'Admin Access' : step === 2 ? 'Biometric Auth' : 'Humanity Test'}
                        </h1>
                        <p className="text-gray-400 text-sm font-medium">
                            {step === 1 ? 'Enter your secure PIN to continue.' :
                                step === 2 ? 'Use your device passkey (TouchID/FaceID).' :
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
                        <div className="space-y-8">
                            {/* STEP 1 & 3: Input Form */}
                            {(step === 1 || step === 3) && (
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
                                            className={`w-full bg-gray-950/50 border-2 text-center text-4xl font-bold py-5 rounded-2xl text-white placeholder-gray-800 transition-all focus:outline-none 
                                                ${error
                                                    ? 'border-red-500/50 focus:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                                    : 'border-gray-800 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]'}
                                                ${step !== 3 ? 'tracking-[0.5em]' : 'tracking-widest'}
                                            `}
                                            placeholder={step === 3 ? "?" : "••••••"}
                                        />
                                    </div>

                                    {error && (
                                        <div className="text-red-400 text-sm font-bold text-center animate-in slide-in-from-top-2 flex items-center justify-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={!inputVal}
                                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
                                            ${inputVal
                                                ? 'bg-white text-black hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                                        `}
                                    >
                                        {step === 3 ? 'Unlock Dashboard' : 'Continue'}
                                        <ArrowLeft className="w-5 h-5 rotate-180" />
                                    </button>
                                </form>
                            )}

                            {/* STEP 2: Passkey UI */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    {error && (
                                        <div className="text-red-400 text-sm font-bold text-center animate-in slide-in-from-top-2 flex items-center justify-center gap-2 bg-red-500/10 p-2 rounded-lg">
                                            <AlertTriangle className="w-4 h-4" /> {error}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleLoginPasskey}
                                        disabled={isLoading}
                                        className="w-full py-5 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                <Fingerprint className="w-6 h-6" />
                                                Authenticate with Passkey
                                            </>
                                        )}
                                    </button>

                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-gray-700"></div>
                                        <span className="flex-shrink-0 mx-4 text-gray-600 text-xs uppercase">New Device?</span>
                                        <div className="flex-grow border-t border-gray-700"></div>
                                    </div>

                                    {!hasKeys ? (
                                        <button
                                            onClick={handleRegisterPasskey}
                                            disabled={isLoading}
                                            className="w-full py-4 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Register New Device
                                        </button>
                                    ) : (
                                        <div className="text-center py-2">
                                            <p className="text-gray-500 text-xs italic">Registration disabled on login (Keys exist).</p>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}

                    {/* Footer Status */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-xs text-gray-500 font-mono">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            System Online
                        </div>
                        <div>Secure Enclave</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
