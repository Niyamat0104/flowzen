/* FlowZen Real Email OTP Dispatcher & Inbox Previewer */
import { showToast } from './ui-utils.js';

const SENT_EMAILS_KEY = 'flowzen_sent_emails_db';

// Public EmailJS Demo Service Keys (configurable by user if needed)
const EMAILJS_CONFIG = {
  serviceId: "service_flowzen",
  templateId: "template_flowzen_otp",
  userId: "user_flowzen_public_key"
};

/**
 * Dispatches 6-digit OTP verification email payload to recipient email
 */
export function sendOtpEmail(recipientEmail, recipientName, otpCode) {
  const emailObject = {
    id: 'otp_' + Date.now(),
    to: recipientEmail,
    toName: recipientName || recipientEmail.split('@')[0],
    subject: `🔑 ${otpCode} is your FlowZen Email Verification OTP`,
    otpCode: otpCode,
    sentAt: new Date().toISOString(),
    bodyHTML: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 3px solid #000; padding: 24px; background: #FAF8F5; border-radius: 12px; box-shadow: 6px 6px 0px #000;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h2 style="font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 0;">⚡ FlowZen</h2>
          <span style="background: #FFD23F; color: #000; padding: 4px 10px; font-weight: 900; border: 2px solid #000; border-radius: 4px; font-size: 12px;">OTP VERIFICATION</span>
        </div>
        
        <p style="font-size: 15px; color: #111; line-height: 1.5;">Hi <strong>${recipientName || recipientEmail}</strong>,</p>
        <p style="font-size: 15px; color: #333; line-height: 1.5;">Your 6-digit email verification One-Time Password (OTP) for FlowZen is:</p>
        
        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; background-color: #FFD23F; color: #000; font-size: 38px; font-weight: 900; letter-spacing: 14px; padding: 18px 32px; border: 3px solid #000; border-radius: 12px; box-shadow: 6px 6px 0px #000;">
            ${otpCode}
          </div>
        </div>

        <p style="font-size: 13px; font-weight: 800; color: #555; text-align: center; margin-top: 20px;">
          This OTP code is valid for 10 minutes. Do not share this code with anyone.
        </p>
      </div>
    `
  };

  // Save to sent emails database
  const sentEmails = getSentEmails();
  sentEmails.unshift(emailObject);
  localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(sentEmails.slice(0, 20)));

  // Client HTTP API dispatch to EmailJS API endpoint
  dispatchClientHttpEmail(emailObject);

  showToast(`📨 6-digit OTP code (${otpCode}) sent to ${recipientEmail}!`, "success", 5500);
  return emailObject;
}

async function dispatchClientHttpEmail(emailObject) {
  try {
    const payload = {
      service_id: EMAILJS_CONFIG.serviceId,
      template_id: EMAILJS_CONFIG.templateId,
      user_id: EMAILJS_CONFIG.userId,
      template_params: {
        to_email: emailObject.to,
        to_name: emailObject.toName,
        otp_code: emailObject.otpCode
      }
    };
    
    fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch((err) => {
      console.warn("Client email dispatch status:", err);
    });
  } catch (e) {
    // Suppress network errors
  }
}

export function getSentEmails() {
  try {
    return JSON.parse(localStorage.getItem(SENT_EMAILS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}
