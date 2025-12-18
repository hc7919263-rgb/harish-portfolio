import nodemailer from 'nodemailer';

// --- Email Configuration ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL/TLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    },
    pool: true, // Use a pool for multiple alerts
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
});

// Verify Transporter on Startup
export const verifyTransporter = () => {
    transporter.verify((error, success) => {
        if (error) {
            console.error("❌ SMTP Connection Error:", error.message);
        } else {
            console.log("✅ SMTP Server is ready (Service Mode)");
        }
    });
};

export const sendSecurityAlert = async (type, req) => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        console.warn("Security Alert: SMTP credentials missing (Service Mode). Email not sent.");
        return;
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.get('User-Agent') || 'Unknown Device';
    const timestamp = new Date().toLocaleString();

    const mailOptions = {
        from: `"Security Alert" <${user}>`,
        to: user,
        subject: `⚠️ Admin Login Alert: ${type}`,
        html: `
            <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; max-width: 600px; margin: auto;">
                <h2 style="color: #d32f2f; margin-top: 0;">Security Alert: Successful Admin Login</h2>
                <p style="color: #444; font-size: 16px;">A successful administrative login was detected on your portfolio website.</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Method:</strong> ${type}</p>
                    <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ip}</p>
                    <p style="margin: 5px 0;"><strong>Device Info:</strong> ${ua}</p>
                    <p style="margin: 5px 0;"><strong>Timestamp:</strong> ${timestamp}</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #888; text-align: center;">If this wasn't you, please change your admin PIN immediately.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Security alert email sent via Service for ${type} login.`);
    } catch (error) {
        console.error("❌ Email Service Error:", error.message);
    }
};
