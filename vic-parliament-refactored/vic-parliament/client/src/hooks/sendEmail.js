// src/utils/sendEmail.js
import emailjs from '@emailjs/browser';

// Initialize with your Public Key (from EmailJS dashboard)

emailjs.init("q-ZlQNUARbTo0WPPv");


export async function sendViaEmailjs(toEmails, ccEmail, subject, body, phone) {
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
            "service_7us3jze",
            "template_3a0rs3i",
            templateParams
        );

        const phoneTrimmed = typeof phone === 'string' ? phone.trim() : '';
        if (phoneTrimmed && ccEmail) {
            try {
                await emailjs.send(
                    "service_7us3jze",
                    "template_3a0rs3i",
                    {
                        to_email: ccEmail,
                        cc_email: '',
                        subject: `${subject} — constituent contact number (CC only)`,
                        message:
                            'This message is for CC recipients only and was not included in the email to representatives.\n\n' +
                            `Constituent callback number: ${phoneTrimmed}`,
                        from_name: 'Stop Hate CIP',
                        reply_to: 'stophate.cip@gmail.com',
                    }
                );
            } catch (ccErr) {
                console.error('EmailJS CC-only phone send error:', ccErr);
                return {
                    ok: true,
                    message: `Email sent successfully (${response.status}). The contact number could not be delivered to CC.`,
                    data: response,
                };
            }
        }

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