/* FlowZen Real Email OTP Dispatcher & Inbox Previewer
   Uses the EmailJS Browser SDK (loaded globally via <script> tag in each
   HTML page — see the setup note below) to actually deliver OTP emails.

   ⚠️ SETUP REQUIRED — replace these three values with YOUR real EmailJS
   account details (emailjs.com → free tier). The values below are
   placeholders and will not send real emails until replaced. */
import { showToast } from "./ui-utils.js";

const SENT_EMAILS_KEY = "flowzen_sent_emails_db";

const EMAILJS_CONFIG = {
  serviceId: "REPLACE_WITH_YOUR_SERVICE_ID",
  templateId: "REPLACE_WITH_YOUR_TEMPLATE_ID",
  publicKey: "REPLACE_WITH_YOUR_PUBLIC_KEY",
};

let emailjsInitialized = false;

function ensureEmailjsInitialized() {
  if (emailjsInitialized) return;
  if (typeof window.emailjs === "undefined") {
    console.warn(
      "FlowZen: the EmailJS SDK script was not found on this page. " +
        'Add <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script> ' +
        "before your module script tag.",
    );
    return;
  }
  window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
  emailjsInitialized = true;
}

/**
 * Dispatches a real 6-digit OTP verification email to the recipient's inbox.
 * Also logs it to a local "sent emails" preview list (localStorage) so you
 * can demo/verify the OTP flow even without checking a real inbox.
 * Returns a Promise that resolves true/false based on actual send success.
 */
export function sendOtpEmail(recipientEmail, recipientName, otpCode) {
  const emailObject = {
    id: "otp_" + Date.now(),
    to: recipientEmail,
    toName: recipientName || recipientEmail.split("@")[0],
    subject: `🔑 ${otpCode} is your FlowZen Email Verification OTP`,
    otpCode,
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
    `,
  };

  // Save to the local sent-emails preview log regardless of real send result
  const sentEmails = getSentEmails();
  sentEmails.unshift(emailObject);
  localStorage.setItem(
    SENT_EMAILS_KEY,
    JSON.stringify(sentEmails.slice(0, 20)),
  );

  return dispatchRealEmail(emailObject);
}

async function dispatchRealEmail(emailObject) {
  ensureEmailjsInitialized();

  if (!emailjsInitialized) {
    showToast(
      `⚠️ Email service not configured — OTP code (${emailObject.otpCode}) is available in the Email Inbox preview instead.`,
      "warning",
      6000,
    );
    return false;
  }

  try {
    await window.emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        to_email: emailObject.to,
        to_name: emailObject.toName,
        otp_code: emailObject.otpCode,
      },
    );

    showToast(
      `📨 A 6-digit OTP code was sent to ${emailObject.to}!`,
      "success",
      5500,
    );
    return true;
  } catch (err) {
    console.error("EmailJS send failed:", err);
    showToast(
      `⚠️ Couldn't send a real email (check EmailJS setup) — OTP code (${emailObject.otpCode}) is available in the Email Inbox preview.`,
      "warning",
      6500,
    );
    return false;
  }
}

export function getSentEmails() {
  try {
    return JSON.parse(localStorage.getItem(SENT_EMAILS_KEY) || "[]");
  } catch (e) {
    return [];
  }
}
