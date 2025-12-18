import React, { useState, useEffect } from 'react';
import { Settings, Search, Save, Shield, Plus, Trash2, Smartphone, Laptop } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { startRegistration } from '@simplewebauthn/browser';

const SystemSettings = () => {
    // @ts-ignore
    const { meta, updateMeta } = useData();
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDesc, setSeoDesc] = useState('');
    const [msg, setMsg] = useState('');

    // Passkey State
    const [isAddingKey, setIsAddingKey] = useState(false);
    const [pinVal, setPinVal] = useState('');

    const handleAddPasskey = async () => {
        try {
            // 1. Verify PIN to get Session Token
            const res = await fetch('/api/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinVal })
            });
            const data = await res.json();

            if (!data.success || !data.registrationToken) {
                setMsg('Error: Invalid PIN');
                setTimeout(() => setMsg(''), 3000);
                return;
            }

            // 2. Start Registration with Token
            const resp = await fetch('/api/auth/register-challenge', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${data.registrationToken}` }
            });
            const options = await resp.json();

            const attResp = await startRegistration(options);

            const verResp = await fetch('/api/auth/register-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attResp),
            });

            const verification = await verResp.json();
            if (verification.success) {
                setMsg('Success: New Passkey Added!');
                setIsAddingKey(false);
                setPinVal('');
                fetchKeys(); // Refresh list
            } else {
                throw new Error(verification.error);
            }
        } catch (e: any) {
            console.error(e);
            setMsg('Error: ' + (e.message || 'Registration failed'));
        }
        setTimeout(() => setMsg(''), 3000);
    };

    // --- List & Delete Keys ---
    const [keys, setKeys] = useState<any[]>([]);
    const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

    const fetchKeys = async () => {
        try {
            const token = sessionStorage.getItem('admin_session_token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/auth/passkeys', { headers });
            const data = await res.json();
            if (data.success) {
                setKeys(data.keys || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleDeleteKey = async () => {
        if (!keyToDelete) return;
        try {
            const token = sessionStorage.getItem('admin_session_token');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/auth/passkeys', {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ id: keyToDelete, pin: pinVal }) // Re-use pinVal
            });
            const data = await res.json();
            if (data.success) {
                setMsg('Success: Key Deleted');
                setKeyToDelete(null);
                setPinVal('');
                fetchKeys();
            } else {
                setMsg('Error: ' + (data.error || 'Delete failed'));
            }
        } catch (e) {
            setMsg('Error: Connection Failed');
        }
        setTimeout(() => setMsg(''), 3000);
    };


    useEffect(() => {
        if (meta) {
            setMaintenanceMode(!!meta.maintenanceMode);
            setSeoTitle(meta.seoTitle || '');
            setSeoDesc(meta.seoDesc || '');
        }
    }, [meta]);

    const handleSave = () => {
        updateMeta('maintenanceMode', maintenanceMode);
        updateMeta('seoTitle', seoTitle);
        updateMeta('seoDesc', seoDesc);
        setMsg('Success: System settings saved!');
        setTimeout(() => setMsg(''), 3000);
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h2 className="text-3xl font-bold text-black mb-2">System Settings</h2>
                    <p className="text-gray-500">Configure global application settings.</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Application Control */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Settings className="w-5 h-5" /> Application Control
                    </h3>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div>
                            <p className="font-bold text-gray-900">Maintenance Mode</p>
                            <p className="text-sm text-gray-500">Temporarily disable public access to the portfolio.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={maintenanceMode}
                                onChange={(e) => setMaintenanceMode(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                    </div>
                </div>

                {/* SEO Configuration */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Search className="w-5 h-5" /> SEO Configuration
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Site Title</label>
                            <input
                                type="text"
                                value={seoTitle}
                                onChange={(e) => setSeoTitle(e.target.value)}
                                placeholder="Harish Chavan - Portfolio"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-0 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Meta Description</label>
                            <input
                                type="text"
                                value={seoDesc}
                                onChange={(e) => setSeoDesc(e.target.value)}
                                placeholder="Business Analytics Student & Developer..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-0 transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Security / Passkeys */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Security & Passkeys
                    </h3>

                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="font-bold text-gray-900">Passkey Devices</h4>
                                <p className="text-sm text-gray-500">Manage biometric authenticators (TouchID, FaceID).</p>
                            </div>
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                                {keys.length} Active
                            </div>
                        </div>

                        {/* Passkey List */}
                        <div className="space-y-3 mb-6">
                            {keys.map((key, idx) => {
                                // Determine Icon based on name/deviceType
                                let Icon = Shield;
                                if (/Mobile|Phone|Android|iOS/i.test(key.name)) Icon = Smartphone;
                                else if (/Windows|Mac|Linux|Laptop|Desktop/i.test(key.name)) Icon = Laptop;

                                return (
                                    <div key={key.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Icon className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{key.name || `Passkey ${idx + 1}`}</p>
                                                <div className="flex gap-2 text-xs text-gray-500 font-mono">
                                                    <span>ID: {key.id.substring(0, 8)}...</span>
                                                    {/* Show Transports if available */}
                                                    {key.transports && key.transports.length > 0 && (
                                                        <span className="bg-gray-100 px-1.5 rounded text-[10px] uppercase tracking-wider text-gray-600 border border-gray-200">
                                                            {key.transports.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setKeyToDelete(key.id); setPinVal(''); }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Device"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                            {keys.length === 0 && (
                                <p className="text-sm text-gray-400 italic text-center py-2">No active passkeys found.</p>
                            )}
                        </div>

                        <button
                            onClick={() => setIsAddingKey(true)}
                            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add New Passkey
                        </button>

                        {/* PIN Prompt for Adding Key */}
                        {isAddingKey && (
                            <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200 animate-in slide-in-from-top-2">
                                <p className="text-sm font-bold text-gray-900 mb-2">Enter PIN to authorize:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={pinVal}
                                        onChange={(e) => setPinVal(e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                                        placeholder="••••••"
                                    />
                                    <button
                                        onClick={handleAddPasskey}
                                        className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800"
                                    >
                                        Verify & Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* DELETE CONFIRMATION MODAL */}
                        {keyToDelete && (
                            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-in slide-in-from-top-2">
                                <p className="text-sm font-bold text-red-900 mb-2">Authorize Deletion:</p>
                                <p className="text-xs text-red-700 mb-3">Enter Admin PIN to permanently remove this credential.</p>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={pinVal}
                                        onChange={(e) => setPinVal(e.target.value)}
                                        className="flex-1 px-4 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                        placeholder="••••••"
                                    />
                                    <button
                                        onClick={handleDeleteKey}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 whitespace-nowrap"
                                    >
                                        Confirm Delete
                                    </button>
                                    <button
                                        onClick={() => setKeyToDelete(null)}
                                        className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Action */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-all transform hover:-translate-y-1 flex items-center gap-2 shadow-lg"
                    >
                        <Save className="w-5 h-5" /> Save Changes
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`mt-8 px-6 py-4 rounded-xl font-bold text-center animate-in fade-in slide-in-from-bottom-2 ${msg.includes('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {msg}
                </div>
            )}
        </div>
    );
};

export default SystemSettings;
