/**
 * Resend Email Service for MMAI
 * Handles sending transactional emails, patient access keys, and security notifications.
 */

import { Platform } from "react-native";

const RESEND_API_KEY =
  process.env.EXPO_PUBLIC_RESEND_API_KEY ||
  process.env.NEXT_PUBLIC_RESEND_API_KEY ||
  process.env.RESEND_API_KEY ||
  "";

const FROM_EMAIL =
  process.env.EXPO_PUBLIC_RESEND_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  "onboarding@resend.dev";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = FROM_EMAIL,
}: SendEmailOptions) {
  const apiKey =
    process.env.EXPO_PUBLIC_RESEND_API_KEY ||
    process.env.NEXT_PUBLIC_RESEND_API_KEY ||
    process.env.RESEND_API_KEY ||
    RESEND_API_KEY;

  // Do not call the Resend API from the browser — it is blocked by CORS and
  // requires a server-side secret. Fall back to simulated mode on web or when
  // a publishable/public key is present.
  if (Platform.OS === "web") {
    console.log(
      "[Resend Simulated Mode] Running on web — skipping remote send",
      { to, subject },
    );
    return {
      success: true,
      simulated: true,
      message:
        "Email simulated in web environment (avoid browser-side API calls).",
    };
  }

  if (!apiKey || apiKey.includes("your_") || apiKey.includes("_here")) {
    console.log(
      "[Resend Simulated Mode] Email simulated because RESEND_API_KEY is not configured in .env:",
      { to, subject },
    );
    return {
      success: true,
      simulated: true,
      message: "Email simulated because RESEND_API_KEY is not set.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: from.includes("<") ? from : `MMAI Health <${from}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || (text ? `<p>${text}</p>` : ""),
        text: text || "",
      }),
    });

    const responseText = await response.text();
    let data: { message?: string } = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText || "Resend returned an empty response." };
    }

    if (!response.ok) {
      if (
        data?.message?.includes(
          "only send testing emails to your own email address",
        )
      ) {
        const ownerEmail = "guptaakshat98894@gmail.com";
        const targetDesc = Array.isArray(to) ? to.join(", ") : to;
        console.warn(
          `[Resend Notice] Resend test mode restriction: Forwarding email intended for "${targetDesc}" to verified account owner "${ownerEmail}".`,
        );

        // Fallback send to verified owner email so real email arrives in Gmail
        try {
          const fallbackRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: from.includes("<") ? from : `MMAI Health <${from}>`,
              to: [ownerEmail],
              subject: `[For: ${targetDesc}] ${subject}`,
              html:
                `
                <div style="background:#FEF3C7;border:1px solid #F59E0B;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-family:sans-serif;color:#92400E;font-size:13px;line-height:20px;">
                  <strong>Resend Sandbox Notice:</strong> This email was originally addressed to <code>${targetDesc}</code>.<br/>
                  Because Resend requires a custom verified domain to deliver to arbitrary external addresses, it was delivered to your verified Resend account (<code>${ownerEmail}</code>).
                </div>
              ` + (html || (text ? `<p>${text}</p>` : "")),
              text: `[Intended Recipient: ${targetDesc}]\n\n` + (text || ""),
            }),
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackRes.ok) {
            console.log(
              "[Resend Success] Email delivered to verified account:",
              ownerEmail,
              fallbackData,
            );
            return {
              success: true,
              deliveredTo: ownerEmail,
              intendedFor: targetDesc,
              data: fallbackData,
            };
          }
        } catch (fallbackErr) {
          console.error("[Resend Fallback Error]", fallbackErr);
        }

        return {
          success: false,
          error: data.message,
          sandboxRestriction: true,
        };
      }
      throw new Error(data.message || "Failed to send email via Resend");
    }

    console.log("[Resend Success] Email sent successfully to:", to);
    return { success: true, data };
  } catch (err: any) {
    console.error("[Resend Error]", err.message || err);
    throw new Error(err.message || "Email delivery failed");
  }
}

/**
 * Send Patient 6-Digit Access Key
 */
export async function sendPatientAccessKeyEmail({
  to,
  patientName,
  accessCode,
  doctorName = "Your Care Team",
}: {
  to: string;
  patientName: string;
  accessCode: string;
  doctorName?: string;
}) {
  const subject = `Your MMAI Patient Access Code: ${accessCode}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0D0F12; color: #FFFFFF; border-radius: 16px; border: 1px solid #1E232B;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 999px; color: #3B82F6; font-size: 11px; font-weight: 700; letter-spacing: 1px;">
          MMAI SECURE ACCESS
        </span>
      </div>

      <h1 style="font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 8px; color: #FFFFFF;">
        Hello, ${patientName}
      </h1>
      <p style="font-size: 14px; line-height: 22px; text-align: center; color: #94A3B8; margin-bottom: 32px;">
        ${doctorName} has granted you secure patient access to your MMAI workspace. Use your secret key below to log in.
      </p>

      <div style="background: #14181F; border: 1px solid #28303E; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748B; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">
          Your 6-Digit Secret Key
        </span>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38BDF8; font-family: monospace;">
          ${accessCode}
        </div>
      </div>

      <div style="font-size: 12px; color: #64748B; line-height: 18px; border-top: 1px solid #1E232B; padding-top: 20px;">
        <p style="margin: 0 0 6px 0;"><strong>Security Notice:</strong> Never share this 6-digit access code with unauthorized individuals. This key is uniquely linked to your medical profile.</p>
        <p style="margin: 0;">If you did not request this access code, please contact your caretaker immediately.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Your MMAI Patient Access Code is ${accessCode}. Provided by ${doctorName}.`,
  });
}

/**
 * Send Patient Login Verification OTP Email
 */
export async function sendPatientLoginOtpEmail({
  to,
  patientName,
  otpCode,
}: {
  to: string;
  patientName: string;
  otpCode: string;
}) {
  const subject = `Your MMAI Verification Code: ${otpCode}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background: #0D0F12; color: #FFFFFF; border-radius: 16px; border: 1px solid #1E232B;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 999px; color: #3B82F6; font-size: 11px; font-weight: 700; letter-spacing: 1px;">
          MMAI ONE-TIME PASSCODE
        </span>
      </div>

      <h1 style="font-size: 22px; font-weight: 800; text-align: center; margin-bottom: 8px; color: #FFFFFF;">
        Hello, ${patientName}
      </h1>
      <p style="font-size: 14px; line-height: 22px; text-align: center; color: #94A3B8; margin-bottom: 28px;">
        You recently entered your access key to log into MMAI. Use this 6-digit verification code to complete your login.
      </p>

      <div style="background: #14181F; border: 1px solid #28303E; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748B; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">
          Your 6-Digit Login Code
        </span>
        <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #38BDF8; font-family: monospace;">
          ${otpCode}
        </div>
        <span style="font-size: 12px; color: #64748B; display: block; margin-top: 8px;">
          Expires in 15 minutes
        </span>
      </div>

      <div style="font-size: 12px; color: #64748B; line-height: 18px; border-top: 1px solid #1E232B; padding-top: 20px;">
        <p style="margin: 0 0 6px 0;"><strong>Security Notice:</strong> Never share this verification code with anyone. MMAI staff will never ask for your code.</p>
        <p style="margin: 0;">If you did not initiate this login request, please contact your caretaker immediately.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Your MMAI verification code is ${otpCode}. Valid for 15 minutes.`,
  });
}
