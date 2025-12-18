import React, { useState, useEffect } from 'react';
import { FileText, Users, Save, UploadCloud } from 'lucide-react';
import { useData } from '../../context/DataContext';

const ProfileSettings = () => {
    // @ts-ignore
    const { meta, updateMeta } = useData();
    const [aboutText, setAboutText] = useState(meta?.aboutText || '');
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (meta?.aboutText && !aboutText) {
            setAboutText(meta.aboutText);
        }
    }, [meta]);

    const handleSaveText = () => {
        updateMeta('aboutText', aboutText);
        setMsg('Success: About text saved!');
        setTimeout(() => setMsg(''), 3000);
    };

    const handleProfileUpload = async () => {
        if (!profileFile) return;
        setUploading(true);

        const reader = new FileReader();
        reader.readAsDataURL(profileFile);
        reader.onload = async () => {
            const base64 = reader.result as string;
            try {
                const token = sessionStorage.getItem('admin_session_token');
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch('/api/upload-profile', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ fileData: base64 })
                });
                if (res.ok) {
                    setMsg('Success: Profile Image Updated!');
                    setProfileFile(null);
                    window.location.reload();
                } else {
                    setMsg('Error: Upload Failed');
                }
            } catch (e) {
                setMsg('Error: Server Unavailable');
            } finally {
                setUploading(false);
            }
        };
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h2 className="text-3xl font-bold text-black mb-2">Profile Management</h2>
                    <p className="text-gray-500">Update your bio and profile image.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* About Content */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> About Content
                    </h3>
                    <textarea
                        value={aboutText}
                        onChange={(e) => setAboutText(e.target.value)}
                        className="w-full h-64 p-4 rounded-xl border border-gray-200 focus:border-black focus:ring-0 resize-none font-mono text-sm leading-relaxed"
                        placeholder="Paste your About Me text here..."
                    />
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSaveText}
                            className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> Save Content
                        </button>
                    </div>
                </div>

                {/* Profile Image */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5" /> Profile Image
                    </h3>

                    <div className="flex flex-col items-center">
                        <div className="w-40 h-40 rounded-full border-4 border-gray-100 overflow-hidden mb-6 relative group">
                            <img src="/assets/profile.jpg" alt="Current Profile" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                Current
                            </div>
                        </div>

                        <div className="w-full">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                                className="w-full mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                            />
                            <button
                                onClick={handleProfileUpload}
                                disabled={!profileFile || uploading}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
                                    ${!profileFile || uploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}
                                `}
                            >
                                <UploadCloud className="w-4 h-4" />
                                {uploading ? 'Uploading...' : 'Update Photo'}
                            </button>
                        </div>
                    </div>
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

export default ProfileSettings;
