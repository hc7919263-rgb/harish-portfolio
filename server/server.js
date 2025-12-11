import express from 'express';
import 'dotenv/config'; // Load .env
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer'; // Imported

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
// const DB_FILE = path.join(__dirname, 'db.json'); // Deprecated: Local DB
import mongoose from 'mongoose';
import { PortfolioData } from './models/PortfolioData.js';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use(cors());
app.use(bodyParser.json());

// Security Middleware (Simulated Firewall Headers)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Helper to read DB (From MongoDB)
const readDb = async () => {
    try {
        let data = await PortfolioData.findById('main');
        if (!data) {
            // Initial seed if empty
            data = new PortfolioData({ _id: 'main' });
            await data.save();
        }
        return data; // Returns Mongoose Document
    } catch (err) {
        console.error("Error reading DB:", err);
        return { projects: [], foundation: {}, faqs: [], meta: {} };
    }
};

// Helper to write DB (Update MongoDB)
// In Mongoose, we usually update specific fields, but to keep 'server.js' logic similar:
const writeDb = async (data) => {
    try {
        // data is just a POJO or Document. 
        // We update the 'main' document with the new data.
        await PortfolioData.findByIdAndUpdate('main', data, { upsert: true });
        return true;
    } catch (err) {
        console.error("Error writing DB:", err);
        return false;
    }
};

// --- Routes ---

// Get All Data
app.get('/api/data', async (req, res) => {
    const data = await readDb();
    res.json(data);
});

// Update Entire Section
app.post('/api/save', async (req, res) => {
    const { type, data } = req.body;

    try {
        const updateQuery = {};
        updateQuery[type] = data; // e.g. { projects: [...] }

        await PortfolioData.findByIdAndUpdate('main', updateQuery, { upsert: true });
        res.json({ success: true, message: `${type} updated` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save' });
    }
});

// --- File Upload (Resume) ---
// Increase limit for Base64 uploads
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/api/upload-resume', async (req, res) => {
    const { fileData, fileName } = req.body; // fileData is base64
    if (!fileData) return res.status(400).json({ error: 'No data' });

    try {
        // Decode Base64
        const base64Data = fileData.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Ensure public/assets exists
        const assetsDir = path.join(__dirname, '../public/assets');
        if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

        const filePath = path.join(assetsDir, 'resume.pdf'); // Standardize name
        fs.writeFileSync(filePath, buffer);

        await PortfolioData.findByIdAndUpdate('main', { 'meta.resumeLastUpdated': new Date().toISOString() }, { upsert: true });

        res.json({ success: true, message: 'Resume uploaded successfully' });
    } catch (err) {
        console.error("Upload failed", err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.post('/api/upload-profile', async (req, res) => {
    const { fileData } = req.body;
    if (!fileData) return res.status(400).json({ error: 'No data' });

    try {
        const base64Data = fileData.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const assetsDir = path.join(__dirname, '../public/assets');
        if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

        const filePath = path.join(assetsDir, 'profile.jpg'); // Overwrite profile.jpg
        fs.writeFileSync(filePath, buffer);

        await PortfolioData.findByIdAndUpdate('main', { 'meta.profileLastUpdated': new Date().toISOString() }, { upsert: true });

        res.json({ success: true, message: 'Profile image updated successfully' });
    } catch (err) {
        console.error("Upload failed", err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// --- Resume Tracking & Download ---
// --- Resume Tracking & Download ---
app.get('/api/download-resume', async (req, res) => {
    // Increment Count (Atomic update better for concurrency)
    await PortfolioData.findByIdAndUpdate('main', { $inc: { 'meta.resumeDownloads': 1 } }, { upsert: true });

    // Serve File
    const filePath = path.join(__dirname, '../public/assets/resume.pdf');
    if (fs.existsSync(filePath)) {
        res.download(filePath, 'Harish_Chavan_Resume.pdf');
    } else {
        res.status(404).send('Resume not found');
    }
});

// --- OTP Email ---
// --- OTP Email & Verification ---

// --- OTP Email & Verification ---
let otpStore = new Map(); // Store { email: { code, expires } }

// Global Transporter (Reuse connection pool)
// Global Transporter (Reuse connection pool)
// Global Transporter
// FIX: Force IPv4 (family: 4) to prevent IPv6 timeouts on cloud networks.
// Using Port 587 (STARTTLS) which is standard.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    family: 4, // <--- Force IPv4
    connectionTimeout: 60000, // Increase to 60s
    greetingTimeout: 30000
});

// Verify connection once on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP Connection Error:", error);
    } else {
        console.log("✅ SMTP Server is ready to take our messages");
    }
});

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    console.log("Requesting OTP for:", email || "default admin");

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;
    const key = email || 'admin';
    otpStore.set(key, { code: otpCode, expires });

    // SECURE IMPLEMENTATION:
    // Send email from SERVER via EmailJS REST API (Port 443).
    // This keeps otpCode secret and bypasses SMTP port blocking.

    const serviceId = process.env.VITE_ADMIN_SERVICE_ID;
    const templateId = process.env.VITE_ADMIN_TEMPLATE_ID;
    const publicKey = process.env.VITE_ADMIN_PUBLIC_KEY;

    try {
        const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Nodejs/Server'
            },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                template_params: {
                    to_name: "Admin",
                    otp_code: otpCode,
                    message: "Here is your secure OTP for login."
                }
            })
        });

        if (emailResponse.ok) {
            console.log("✅ Secure Email Sent via EmailJS API");
            res.json({ success: true, message: 'OTP sent securely' });
        } else {
            const errText = await emailResponse.text();
            console.error("❌ EmailJS API Error:", errText);
            throw new Error(`EmailJS Error: ${errText}`);
        }
    } catch (error) {
        console.error("Detailed Email Error:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to send secure email',
            error: error.message
        });
    }
});

app.post('/api/verify-otp', (req, res) => {
    const { email, code } = req.body;
    const key = email || 'admin';
    const record = otpStore.get(key);

    if (!record) return res.json({ success: false, message: 'No OTP found' });
    if (Date.now() > record.expires) {
        otpStore.delete(key);
        return res.json({ success: false, message: 'OTP expired' });
    }

    if (record.code === code) {
        otpStore.delete(key); // clear after use
        return res.json({ success: true });
    } else {
        return res.json({ success: false, message: 'Invalid Code' });
    }
});

// --- PIN Verification ---
app.post('/api/verify-pin', (req, res) => {
    const { pin } = req.body;
    // Securely check PIN on server. 
    // Use env var or default to the user's specified PIN if env is missing.
    const CORRECT_PIN = process.env.ADMIN_PIN;

    if (pin === CORRECT_PIN) {
        return res.json({ success: true });
    } else {
        return res.json({ success: false, message: 'Invalid PIN' });
    }
});

// --- Real-Time Analytics ---
let activeSessions = new Map(); // Store { sessionId: timestamp }

app.post('/api/heartbeat', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const now = Date.now();

    // If session is new (or expired/reconnected), increment Total Visitors
    if (!activeSessions.has(sessionId)) {
        await PortfolioData.findByIdAndUpdate('main', { $inc: { 'meta.totalVisitors': 1 } }, { upsert: true });
    }

    // Update timestamp
    activeSessions.set(sessionId, now);

    // Prune stale sessions (> 10 seconds inactive)
    for (const [id, time] of activeSessions) {
        if (now - time > 10000) activeSessions.delete(id);
    }

    const data = await readDb(); // Fetch fresh data for return

    res.json({
        activeUsers: activeSessions.size,
        totalVisitors: data.meta ? data.meta.totalVisitors : 0
    });
});

app.get('/api/analytics', async (req, res) => {
    const data = await readDb();
    res.json({
        activeUsers: activeSessions.size,
        totalVisitors: data.meta ? data.meta.totalVisitors : 0,
        resumeDownloads: data.meta ? (data.meta.resumeDownloads || 0) : 0
    });
});

// --- Serve React Frontend (Production) ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // Express 5 regex wildcard for SPA fallback
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
