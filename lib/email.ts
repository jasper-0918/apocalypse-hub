import nodemailer from 'nodemailer';

// Email verification is optional: it only turns on once Gmail SMTP is configured.
// GMAIL_USER = your gmail address, GMAIL_APP_PASSWORD = a 16-char app password
// (Google Account → Security → 2-Step Verification → App passwords).
export function isEmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Apocalypse Hub" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your Apocalypse Hub verification code: ${code}`,
      text: `Your Apocalypse Hub verification code is ${code}. It expires in 15 minutes.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#ef4444">Apocalypse Hub</h2>
          <p>Use this code to verify your email:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px;background:#111;color:#fff;padding:16px;text-align:center;border-radius:8px">${code}</p>
          <p style="color:#888">This code expires in 15 minutes. If you didn't sign up, ignore this email.</p>
        </div>`,
    });
    return true;
  } catch {
    return false;
  }
}
