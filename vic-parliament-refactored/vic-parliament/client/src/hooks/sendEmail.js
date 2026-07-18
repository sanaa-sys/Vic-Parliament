// src/utils/sendEmail.js
import emailjs from '@emailjs/browser';

// Initialize with your Public Key (from EmailJS dashboard)
const PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

if (PUBLIC_KEY) {
    emailjs.init({ publicKey: PUBLIC_KEY });
} else {
    console.warn('⚠️ EmailJS Public Key not found. Check .env.local');
}

export async function sendViaEmailjs(toEmails, ccEmail, subject, body) {
    if (!toEmails || toEmails.length === 0) {
        return { ok: false, message: 'No recipients specified.' };
    }

    // EmailJS templates receive comma-separated emails in to_email
    const toField = Array.isArray(toEmails) ? toEmails.join(', ') : toEmails;

    const templateParams = {
        to_email: toField,
        cc_email: ccEmail || '',
        subject: subject,
        message: body,
        from_name: 'Stop Hate CIP',
        reply_to: 'stophate.cip@gmail.com',
    };

    try {
        const response = await emailjs.send(
            process.env.REACT_APP_EMAILJS_SERVICE_ID,
            process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
            templateParams
        );

        return { 
            ok: true, 
            message: `Email sent successfully (${response.status}).`,
            data: response
        };
    } catch (error) {
        console.error('EmailJS send error:', error);
        return { 
            ok: false, 
            message: error?.text || error?.message || 'Failed to send email.' 
        };
    }
}