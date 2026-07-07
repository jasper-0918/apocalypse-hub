import nodemailer from 'nodemailer';
import { SITE_URL } from './seo';

// Email is optional: it only turns on once Gmail SMTP is configured.
// GMAIL_USER = your gmail address, GMAIL_APP_PASSWORD = a 16-char app password
// (Google Account → Security → 2-Step Verification → App passwords).
export function isEmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

// Shared, branded HTML shell so every email looks consistent.
function wrap(inner: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#ef4444">Apocalypse Blox Hub</h2>
    ${inner}
  </div>`;
}

// One place that knows how to actually send — every helper below funnels through
// here, so there's a single transporter/from/try-catch instead of copies.
async function send(opts: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({ from: `"Apocalypse Blox Hub" <${process.env.GMAIL_USER}>`, ...opts });
    return true;
  } catch {
    return false;
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  // Deep-links into /verify with the code pre-filled (the page auto-submits it).
  const verifyLink = `${SITE_URL}/verify?email=${encodeURIComponent(to)}&code=${encodeURIComponent(code)}`;
  return send({
    to,
    subject: `Your Apocalypse Blox Hub verification code: ${code}`,
    text:
      `Your Apocalypse Blox Hub verification code is ${code}. It expires in 15 minutes.\n\n` +
      `Or verify instantly by opening this link:\n${verifyLink}\n\n` +
      `If you didn't sign up, ignore this email.`,
    html: wrap(`
      <p>Use this code to verify your email:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;background:#111;color:#fff;padding:16px;text-align:center;border-radius:8px">${code}</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${verifyLink}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:8px">Verify my email</a>
      </p>
      <p style="color:#888;font-size:13px">Or paste this link into your browser:<br>
        <a href="${verifyLink}" style="color:#ef4444;word-break:break-all">${verifyLink}</a>
      </p>
      <p style="color:#888">This code and link expire in 15 minutes. If you didn't sign up, ignore this email.</p>`),
  });
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<boolean> {
  return send({
    to,
    subject: 'Reset your Apocalypse Blox Hub password',
    text:
      `We received a request to reset your Apocalypse Blox Hub password.\n\n` +
      `Open this link to choose a new password (expires in 30 minutes):\n${link}\n\n` +
      `If you didn't request this, ignore this email — your password won't change.`,
    html: wrap(`
      <p>We received a request to reset your password. Click the button below to choose a new one:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:8px">Reset password</a>
      </p>
      <p style="color:#888;font-size:13px">Or paste this link into your browser:<br>
        <a href="${link}" style="color:#ef4444;word-break:break-all">${link}</a>
      </p>
      <p style="color:#888">This link expires in 30 minutes. If you didn't request a reset, ignore this email — your password won't change.</p>`),
  });
}

export async function sendPasswordChangedEmail(to: string): Promise<boolean> {
  return send({
    to,
    subject: 'Your Apocalypse Blox Hub password was changed',
    text:
      `Your Apocalypse Blox Hub password was just changed.\n\n` +
      `If this was you, no action is needed. If it wasn't, reset your password now at ` +
      `${SITE_URL}/forgot-password and check your account.`,
    html: wrap(`
      <p>Your password was just changed.</p>
      <p style="color:#888">If this was you, no action is needed. If it wasn't, reset your password immediately:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/forgot-password" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:8px">Reset password</a>
      </p>`),
  });
}

export async function sendLoginAlertEmail(
  to: string,
  info: { ip: string; when: string; userAgent: string }
): Promise<boolean> {
  return send({
    to,
    subject: 'New sign-in to your Apocalypse Blox Hub account',
    text:
      `A new sign-in to your Apocalypse Blox Hub account was detected.\n\n` +
      `When: ${info.when}\nIP: ${info.ip}\nDevice: ${info.userAgent}\n\n` +
      `If this was you, ignore this email. If not, reset your password at ` +
      `${SITE_URL}/forgot-password and use "Log out all devices".`,
    html: wrap(`
      <p>A new sign-in to your account was detected:</p>
      <table style="font-size:14px;color:#ccc">
        <tr><td style="color:#888;padding:2px 12px 2px 0">When</td><td>${info.when}</td></tr>
        <tr><td style="color:#888;padding:2px 12px 2px 0">IP</td><td>${info.ip}</td></tr>
        <tr><td style="color:#888;padding:2px 12px 2px 0">Device</td><td>${info.userAgent}</td></tr>
      </table>
      <p style="color:#888;margin-top:16px">If this was you, no action is needed. If not, <a href="${SITE_URL}/forgot-password" style="color:#ef4444">reset your password</a> and use “Log out all devices”.</p>`),
  });
}
