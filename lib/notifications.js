// lib/notifications.js
//
// EMAIL NOTIFICATION ENGINE
//
// Sends periodic digest emails to keep users engaged without requiring
// them to open the app. Two triggers, both run via a Vercel Cron job
// hitting /api/cron/daily-digest once per day:
//
//   1. Pending outcome follow-ups — "3 weeks ago hum ne kaha tha X hoga,
//      kya hua?" — this is the trust-building differentiator.
//   2. Notable transit/Sade-Sati changes — only sent when something
//      meaningfully shifted (not spammy daily noise).
//
// Uses Resend (resend.com) — generous free tier (3000 emails/month),
// simple API, no SMTP config needed.

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = 'Luckfixer 2.0 <notifications@luckfixer.jaigahoi.in>';
const LOGO_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

// ── Base email template — consistent branding ──────────────────
function wrapEmailHtml(bodyHtml, unsubscribeUrl) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0efe9;font-family:-apple-system,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0efe9;padding:24px 12px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 24px 8px;text-align:center;">
          <img src="${LOGO_URL}" width="56" height="56" style="border-radius:14px;" alt="Luckfixer"/>
          <p style="font-size:11px;letter-spacing:2px;color:#c8831a;text-transform:uppercase;margin:8px 0 0;font-weight:600;">✦ Luckfixer 2.0</p>
        </td></tr>
        <tr><td style="padding:16px 24px 24px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #eee;text-align:center;">
          <a href="https://luckfixer.jaigahoi.in/chat" style="display:inline-block;background:linear-gradient(135deg,#c8831a,#e8a030);color:#0d0d0f;text-decoration:none;padding:10px 24px;border-radius:10px;font-weight:600;font-size:13px;">Chat खोलें →</a>
          <p style="font-size:10px;color:#999;margin:16px 0 0;">luckfixer.jaigahoi.in ${unsubscribeUrl ? `· <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>` : ''}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Outcome follow-up email ──────────────────────────────────
export async function sendOutcomeFollowUpEmail(toEmail, userName, followUp) {
  if (!resend) {
    console.warn('[Notifications] RESEND_API_KEY not set — skipping email');
    return { skipped: true };
  }

  const name = userName?.split(' ')[0] || 'दोस्त';
  const body = `
    <p style="font-size:16px;color:#1a1a18;margin:0 0 12px;">नमस्ते ${name} जी! 🙏</p>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px;">
      कुछ हफ्ते पहले आपकी कुंडली में हमने एक भविष्यवाणी की थी — <strong>${followUp.prediction_text}</strong>
    </p>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px;">
      यह ${followUp.predicted_window} के दौरान की गई थी। क्या यह सच हुआ? आपका जवाब हमें और सटीक भविष्यवाणी करने में मदद करेगा।
    </p>
  `;
  return await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${name} जी, क्या यह भविष्यवाणी सच हुई? 🔮`,
    html: wrapEmailHtml(body),
  });
}

// ── Notable transit change digest ────────────────────────────
export async function sendTransitAlertEmail(toEmail, userName, transitReport) {
  if (!resend) {
    console.warn('[Notifications] RESEND_API_KEY not set — skipping email');
    return { skipped: true };
  }

  const name = userName?.split(' ')[0] || 'दोस्त';
  const body = `
    <p style="font-size:16px;color:#1a1a18;margin:0 0 12px;">नमस्ते ${name} जी! 🙏</p>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px;">
      आपकी कुंडली में एक महत्वपूर्ण गोचर परिवर्तन हुआ है:
    </p>
    <div style="background:#faeeda;border-radius:10px;padding:14px;margin:0 0 16px;">
      <p style="font-size:14px;color:#854f0b;font-weight:600;margin:0;">${transitReport.headline}</p>
    </div>
    <p style="font-size:13px;color:#666;line-height:1.6;margin:0;">
      विस्तृत जानकारी और उपाय के लिए चैट खोलें।
    </p>
  `;
  return await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${name} जी, आज का महत्वपूर्ण गोचर 🔭`,
    html: wrapEmailHtml(body),
  });
}

// ── Only send transit alerts for genuinely notable changes ───
// Avoid spamming — only trigger on Sade Sati phase changes or
// a strong benefic/malefic entering a kendra from natal Moon.
export function isNotableTransitChange(transitReport, previousSnapshot) {
  if (!transitReport) return false;

  // Sade Sati phase just changed
  const prevPhase = previousSnapshot?.sadeSati?.phase;
  const currPhase = transitReport.sadeSati?.phase;
  if (transitReport.sadeSati?.active && prevPhase !== currPhase) return true;

  // Sade Sati just started or just ended
  const prevActive = previousSnapshot?.sadeSati?.active;
  const currActive = transitReport.sadeSati?.active;
  if (prevActive !== currActive) return true;

  // Jupiter or Saturn changed sign (major transit — happens ~yearly, worth alerting)
  const prevJup = previousSnapshot?.jupiterTransit?.currentSign;
  const currJup = transitReport.jupiterTransit?.currentSign;
  if (prevJup && currJup && prevJup !== currJup) return true;

  const prevSat = previousSnapshot?.saturnTransit?.currentSign;
  const currSat = transitReport.saturnTransit?.currentSign;
  if (prevSat && currSat && prevSat !== currSat) return true;

  return false;
}

// ── Admin broadcast email — "come back and login" style campaign ──
// Sent manually by admin from the admin panel (not automated). Used
// for re-engagement pushes, feature announcements, festival greetings,
// etc. Sends in small batches (Resend allows up to 100 recipients per
// call via the `to` array, but we batch smaller to stay well within
// rate limits and keep each email properly personalized-looking).
export async function sendBroadcastEmail({ recipients, subject, headline, bodyText, ctaLabel, ctaUrl }) {
  if (!resend) {
    return { sent: 0, failed: 0, error: 'RESEND_API_KEY not configured' };
  }

  const cta = ctaUrl || 'https://luckfixer.jaigahoi.in/login';
  const ctaText = ctaLabel || 'Login करें →';

  const body = `
    <p style="font-size:17px;color:#1a1a18;font-weight:600;margin:0 0 12px;">${headline || 'नमस्ते! 🙏'}</p>
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 20px; white-space:pre-line;">${bodyText}</p>
  `;

  const html = wrapEmailHtml(body).replace(
    /href="https:\/\/luckfixer\.jaigahoi\.in\/chat"[^>]*>Chat खोलें →/,
    `href="${cta}" style="display:inline-block;background:linear-gradient(135deg,#c8831a,#e8a030);color:#0d0d0f;text-decoration:none;padding:10px 24px;border-radius:10px;font-weight:600;font-size:13px;">${ctaText}`
  );

  let sent = 0, failed = 0;
  const errors = [];

  // Batch into groups of 40 (safely under Resend's per-call recipient
  // limits) with a small delay between batches to avoid rate-limit hits.
  const BATCH_SIZE = 40;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    try {
      // Send individually within the batch so each email is addressed
      // only to that one recipient (avoids exposing everyone's email
      // address to everyone else via a shared "to" list).
      const results = await Promise.allSettled(
        batch.map((email) => resend.emails.send({ from: FROM_EMAIL, to: email, subject, html }))
      );
      for (const r of results) {
        if (r.status === 'fulfilled') sent++;
        else { failed++; errors.push(r.reason?.message || 'unknown error'); }
      }
    } catch (e) {
      failed += batch.length;
      errors.push(e.message);
    }
    // Small pause between batches
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { sent, failed, errors: errors.slice(0, 5) }; // cap error list for response size
}
