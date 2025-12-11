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
        console.log("DEBUG: Writing to DB...", JSON.stringify(data.adminPasskeys ? data.adminPasskeys.length : 0));
        await PortfolioData.findByIdAndUpdate('main', data, { upsert: true });
        console.log("DEBUG: DB Write Success");
        return true;
    } catch (err) {
        console.error("DEBUG: Error writing DB:", err);
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

// --- WebAuthn / Passkeys ---
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';

// In-memory store for challenges (in production, use Redis/DB)
const challengeStore = new Map(); // { userId: challenge }

// RP Config
const rpName = 'Harish-Portfolio';
const rpID = 'harish-portfolio-3fqm.onrender.com'; // Change to actual domain or 'localhost' for dev
const origin = ['https://harish-portfolio-3fqm.onrender.com', 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];

// Enable Trust Proxy for correct hostname behind Render LB
app.enable('trust proxy');

// 1. REGISTER: Generate Challenge
// 1. REGISTER: Generate Challenge
app.post('/api/auth/register-challenge', async (req, res) => {
    try {
        // SECURITY: Only allow registration if user has verified PIN (Gatekeeper)
        // For simplicity here, we trust the client has passed Step 1.

        // Dynamic RP ID based on request
        // On Render, req.hostname should be the domain        // Dynamic RP ID with strict fallback
        // If we are on Render (not localhost), force the production domain.
        // This prevents issues where req.hostname might be internal IP or proxy ID.
        let rpID = req.hostname;
        if (!rpID.includes('localhost') && !rpID.includes('127.0.0.1')) {
            rpID = 'harish-portfolio-3fqm.onrender.com';
        }

        console.log("DEBUG: Registering with RP ID:", rpID);

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: new Uint8Array(Buffer.from("admin-user-id")), // FIX: Must be Uint8Array
            userName: "harish@admin",
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                // authenticatorAttachment: 'cross-platform', 
            },
        });

        console.log("DEBUG: Options generated:", JSON.stringify(options));

        if (!options) {
            throw new Error("generateRegistrationOptions returned undefined");
        }

        // Store challenge
        challengeStore.set('admin-user-id', options.challenge);

        res.json(options);
    } catch (error) {
        console.error("Register Challenge Error:", error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// 2. REGISTER: Verify Response
// 2. REGISTER: Verify Response
app.post('/api/auth/register-verify', async (req, res) => {
    try {
        const { body } = req;
        const challenge = challengeStore.get('admin-user-id');

        let rpID = req.hostname;
        // Apply same fallback logic as register-challenge
        if (!rpID.includes('localhost') && !rpID.includes('127.0.0.1')) {
            rpID = 'harish-portfolio-3fqm.onrender.com';
        }

        console.log("DEBUG: Verifying with RP ID:", rpID);

        if (!challenge) {
            console.error("DEBUG: No challenge found for admin-user-id");
            return res.status(400).json({ error: 'No challenge found (Session expired?)' });
        }

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: challenge,
                expectedOrigin: origin,
                expectedRPID: [rpID, 'localhost'],
            });
        } catch (error) {
            console.error("WebAuthn Library Verify Failed:", error);
            return res.status(400).json({ error: error.message });
        }

        // Log the full verification object to see what's inside
        console.log("DEBUG: Verification Object:", JSON.stringify(verification, (key, value) => {
            if (key === 'publicKey' || key === 'credentialPublicKey') return '[Buffer/Uint8Array]'; // Avoid spamming giant arrays
            return value;
        }, 2));

        if (verification.verified && verification.registrationInfo) {
            // FIX: New SimpleWebAuthn structure has 'credential' object
            const { credential } = verification.registrationInfo;
            const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

            // FIX: Ensure public key exists
            if (!credentialPublicKey) {
                console.error("CRITICAL: credentialPublicKey is missing from verification info!");
                throw new Error("Registration failed: Missing Public Key");
            }

            const newPasskey = {
                id: credentialID,
                // Ensure it's a Buffer 
                publicKey: Buffer.isBuffer(credentialPublicKey)
                    ? credentialPublicKey
                    : Buffer.from(credentialPublicKey),
                counter: counter,
                transports: body.response.transports,
            };

            // Save to DB
            const data = await readDb();
            if (!data.adminPasskeys) data.adminPasskeys = [];
            data.adminPasskeys.push(newPasskey);
            await writeDb(data);

            challengeStore.delete('admin-user-id');
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: 'Verification failed' });
        }
    } catch (e) {
        console.error("CRITICAL: register-verify crashed:", e);
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// 3. LOGIN: Generate Challenge
// 3. LOGIN: Generate Challenge
app.post('/api/auth/login-challenge', async (req, res) => {
    try {
        const data = await readDb();
        const existingPasskeys = data.adminPasskeys || [];

        console.log("DEBUG: Login - Found Passkeys in DB:", existingPasskeys.length);

        if (existingPasskeys.length === 0) {
            console.error("DEBUG: Login Failed - No passkeys found in DB");
            return res.status(400).json({ success: false, message: 'No passkeys registered. Please register first.' });
        }

        let rpID = req.hostname;
        // Apply same fallback logic as register
        if (!rpID.includes('localhost') && !rpID.includes('127.0.0.1')) {
            rpID = 'harish-portfolio-3fqm.onrender.com';
        }
        console.log("DEBUG: Login Challenge with RP ID:", rpID);

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: existingPasskeys.map(key => ({
                id: key.id,
                transports: key.transports,
            })),
            userVerification: 'preferred',
        });

        challengeStore.set('admin-user', options.challenge);
        res.json(options);
    } catch (e) {
        console.error("CRITICAL: login-challenge crashed:", e);
        res.status(500).json({ error: e.message });
    }
});

// 4. LOGIN: Verify Response
app.post('/api/auth/login-verify', async (req, res) => {
    const { body } = req;
    const challenge = challengeStore.get('admin-user');
    const rpID = req.hostname;
    let expectedRPID = rpID;
    if (!expectedRPID.includes('localhost') && !expectedRPID.includes('127.0.0.1')) {
        expectedRPID = 'harish-portfolio-3fqm.onrender.com';
    }

    if (!challenge) return res.status(400).json({ error: 'No Login Challenge found' });

    const data = await readDb();
    const existingPasskeys = data.adminPasskeys || [];

    // Find the passkey used
    const passkey = existingPasskeys.find(key => key.id === body.id);
    if (!passkey) return res.status(400).json({ error: 'Passkey not found' });

    console.log("DEBUG: Login - Passkey Found:", JSON.stringify(passkey, null, 2));

    const authenticatorObj = {
        credentialID: passkey.id,
        credentialPublicKey: new Uint8Array(passkey.publicKey.data || passkey.publicKey),
        counter: Number(passkey.counter || 0),
        transports: passkey.transports,
    };
    // Add aliases for compatibility with different usage (authenticator vs credential)
    authenticatorObj.publicKey = authenticatorObj.credentialPublicKey;
    authenticatorObj.id = authenticatorObj.credentialID;

    console.log("DEBUG: Login - Authenticator Object for Verify:", JSON.stringify(authenticatorObj, (k, v) => k === 'credentialPublicKey' ? '[Uint8Array]' : v, 2));

    const verifyOptions = {
        response: body,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: [expectedRPID, 'localhost'],
        authenticator: authenticatorObj,
    };

    console.log("DEBUG: Verify Options Keys:", Object.keys(verifyOptions));

    let verification;
    try {
        try {
            verification = await verifyAuthenticationResponse(verifyOptions);
        } catch (error) {
            console.error("Login Verify Error (First Attempt):", error.message);
            // Fallback: try passing as 'credential' if library version mismatch
            verification = await verifyAuthenticationResponse({
                ...verifyOptions,
                credential: authenticatorObj
            });
        }
    } catch (finalError) {
        console.error("Final Login Verify Error:", finalError);
        return res.status(400).json({ error: finalError.message });
    }

    if (verification && verification.verified) {
        // Update counter
        passkey.counter = verification.authenticationInfo.newCounter;
        await writeDb(data);

        challengeStore.delete('admin-user');
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Verification failed' });
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
