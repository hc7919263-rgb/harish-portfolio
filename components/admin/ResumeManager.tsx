import React, { useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

const ResumeManager = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage('');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result as string;

            try {
                const token = sessionStorage.getItem('admin_session_token');
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch('/api/upload-resume', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        fileData: base64,
                        fileName: file.name
                    })
                });

                if (res.ok) {
                    setMessage('Success: Resume Updated!');
                    setFile(null);
                } else {
                    setMessage('Error: Upload Failed');
                }
            } catch (err) {
                setMessage('Error: Server unavailable');
            } finally {
                setUploading(false);
            }
        };
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h2 className="text-3xl font-bold text-black mb-2">Resume Management</h2>
                    <p className="text-gray-500">Update your public resume (PDF).</p>
                </div>
            </div>

            <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-gray-300 text-center hover:border-gray-400 transition-colors">
                <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UploadCloud className="w-10 h-10 text-blue-600" />
                </div>

                <h3 className="text-xl font-bold mb-2">Upload New Resume</h3>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">Select a PDF file to replace the current version. This will immediately update the download link on your site.</p>

                <div className="flex flex-col items-center gap-4">
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />

                    {file && (
                        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-sm font-medium text-gray-700 mb-4">{file.name}</p>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                                    ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 hover:scale-105 active:scale-95'}
                                `}
                            >
                                {uploading ? 'Uploading...' : 'Confirm Update'}
                            </button>
                        </div>
                    )}

                    {message && (
                        <div className={`mt-6 px-4 py-2 rounded-lg font-medium ${message.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-10 bg-gray-50 p-6 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                        <FileText className="w-6 h-6 text-gray-700" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">Current File</p>
                        <p className="text-sm text-gray-500">public/assets/resume.pdf</p>
                    </div>
                </div>
                <a href="/assets/resume.pdf" target="_blank" className="text-sm font-bold text-blue-600 hover:underline">Preview</a>
            </div>
        </div>
    );
};

export default ResumeManager;
