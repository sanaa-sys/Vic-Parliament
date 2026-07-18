// api/send-email.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'onboarding@resend.dev';

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { to, cc, subject, emailBody } = req.body;

        // Basic validation
        if (!Array.isArray(to) || to.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one recipient (to) is required.' });
        }
        if (!subject || !emailBody) {
            return res.status(400).json({ success: false, error: 'Subject and email body are required.' });
        }

        // Resend expects `to` as an array of email strings
        // `cc` can be an array or single string
        const ccValue = Array.isArray(cc) ? cc : cc ? [cc] : [];

        const resendResponse = await resend.emails.send({
            from: FROM_EMAIL,
            to: to,        // e.g. ['rep1@example.com', 'rep2@example.com']
            cc: ccValue,   // e.g. ['jazeer@boiv.org.au']
            subject: subject,
            html: `<html><body><pre style="font-family: sans-serif; white-space: pre-wrap;">${escapeHtml(emailBody)}</pre></body></html>`,
            text: emailBody,
        });

        return res.status(200).json({
            success: true,
            message: `Email sent to ${to.length} recipient${to.length !== 1 ? 's' : ''} successfully.`,
            data: resendResponse,
        });
    } catch (error) {
        console.error('Resend error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || JSON.stringify(error),
        });
    }
}

// Minimal HTML escaping to prevent injection in the HTML version
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}