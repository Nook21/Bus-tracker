const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10),
    secure: parseInt(process.env.MAIL_PORT, 10) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

// ─── Shared wrapper ────────────────────────────────────────────────────────
const emailWrapper = (accentColor, content) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:${accentColor};border-radius:12px 12px 0 0;padding:32px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">🚌</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Bus Tracker Ethiopia</h1>
            <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;">Official Platform Notification</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:20px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} Bus Tracker Ethiopia. All rights reserved.<br>
              If you did not expect this email, please contact support immediately.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Reusable code box ─────────────────────────────────────────────────────
const codeBox = (code, accentColor = '#1e40af') => `
  <div style="background:#f8faff;border:2px dashed ${accentColor};border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
    <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Your verification code</p>
    <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:${accentColor};font-family:'Courier New',monospace;">${code}</div>
    <p style="color:#ef4444;font-size:12px;margin:12px 0 0;">⏱ Expires in 10 minutes</p>
  </div>`;

const securityNotice = `
  <div style="background:#fef9c3;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin:16px 0;">
    <p style="color:#92400e;font-size:13px;margin:0;">
      <strong>⚠️ Security Notice:</strong> Never share this code with anyone.
      Bus Tracker staff will never ask for your verification code.
    </p>
  </div>`;

// ─── Company Email Verification ────────────────────────────────────────────
const sendCompanyVerificationCode = async ({ companyName, companyEmail, code }) => {
  const transporter = createTransporter();
  const content = `
    <h2 style="color:#1e40af;margin:0 0 8px;font-size:20px;">Verify Your Company Email</h2>
    <p style="color:#4b5563;margin:0 0 4px;">Hello, <strong>${companyName}</strong>!</p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Your company account has been created on Bus Tracker Ethiopia.
      Please use the code below to verify your email address and activate your account.
    </p>
    ${codeBox(code, '#1e40af')}
    ${securityNotice}
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">
      After verification, log in at:<br>
      <a href="${process.env.CLIENT_URL}/company/login" style="color:#1e40af;font-weight:600;">${process.env.CLIENT_URL}/company/login</a>
    </p>`;

  await transporter.sendMail({
    from: `"Bus Tracker Ethiopia" <${process.env.MAIL_USER}>`,
    to: companyEmail,
    subject: '🔐 Verify Your Company Email — Bus Tracker Ethiopia',
    html: emailWrapper('#1e40af', content),
  });
};

// ─── Driver Email Verification ─────────────────────────────────────────────
const sendDriverVerificationCode = async ({ driverName, driverEmail, companyName, code }) => {
  const transporter = createTransporter();
  const content = `
    <h2 style="color:#059669;margin:0 0 8px;font-size:20px;">Verify Your Driver Account</h2>
    <p style="color:#4b5563;margin:0 0 4px;">Hello, <strong>${driverName}</strong>!</p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px;">
      You have been registered as a driver for <strong>${companyName}</strong> on Bus Tracker Ethiopia.
      Please use the code below to verify your email and activate your account.
    </p>
    ${codeBox(code, '#059669')}
    ${securityNotice}
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">
      After verification, log in at:<br>
      <a href="${process.env.CLIENT_URL}/driver/login" style="color:#059669;font-weight:600;">${process.env.CLIENT_URL}/driver/login</a>
    </p>`;

  await transporter.sendMail({
    from: `"Bus Tracker Ethiopia" <${process.env.MAIL_USER}>`,
    to: driverEmail,
    subject: '🔐 Verify Your Driver Account — Bus Tracker Ethiopia',
    html: emailWrapper('#059669', content),
  });
};

// ─── Password Reset ────────────────────────────────────────────────────────
const sendPasswordResetCode = async ({ name, email, code, role = 'company' }) => {
  const transporter = createTransporter();
  const loginPath = `/${role}/login`;
  const content = `
    <h2 style="color:#dc2626;margin:0 0 8px;font-size:20px;">Password Reset Request</h2>
    <p style="color:#4b5563;margin:0 0 4px;">Hello, <strong>${name}</strong>!</p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px;">
      We received a request to reset the password for your Bus Tracker account.
      Use the code below to complete the reset process.
    </p>
    <div style="background:#fff1f2;border:2px dashed #ef4444;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Your password reset code</p>
      <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#dc2626;font-family:'Courier New',monospace;">${code}</div>
      <p style="color:#ef4444;font-size:12px;margin:12px 0 0;">⏱ Expires in 10 minutes</p>
    </div>
    <div style="background:#fef9c3;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin:16px 0;">
      <p style="color:#92400e;font-size:13px;margin:0;">
        <strong>⚠️ Didn't request this?</strong> Ignore this email — your password will remain unchanged.
      </p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">
      Return to login:<br>
      <a href="${process.env.CLIENT_URL}${loginPath}" style="color:#dc2626;font-weight:600;">${process.env.CLIENT_URL}${loginPath}</a>
    </p>`;

  await transporter.sendMail({
    from: `"Bus Tracker Ethiopia" <${process.env.MAIL_USER}>`,
    to: email,
    subject: '🔑 Password Reset Code — Bus Tracker Ethiopia',
    html: emailWrapper('#dc2626', content),
  });
};

module.exports = {
  sendCompanyVerificationCode,
  sendDriverVerificationCode,
  sendPasswordResetCode,
};
