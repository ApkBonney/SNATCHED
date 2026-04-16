const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  // Allow CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, phone } = req.body;

  if (!firstName || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Send a branded welcome email to the new subscriber
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: email,
      subject: 'Welcome to SNATCHED VIP 🎀',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#e78ec4 0%,#d46b9e 100%);padding:48px 40px;text-align:center;">
              <h1 style="color:#fff;font-size:2.5rem;font-weight:900;margin:0;letter-spacing:4px;text-transform:uppercase;">SNATCHED</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:0.85rem;letter-spacing:2px;margin:8px 0 0;text-transform:uppercase;">Members-Only Access</p>
            </div>

            <!-- Body -->
            <div style="padding:48px 40px;">
              <h2 style="font-size:1.6rem;font-weight:800;color:#1e1e1e;margin:0 0 16px;">
                Welcome, ${firstName} 🎉
              </h2>
              <p style="color:#555;font-size:0.95rem;line-height:1.7;margin:0 0 24px;">
                You are officially part of the <strong>SNATCHED inner circle</strong>. You will be the first to know about exclusive drops, new collections, and members-only sales.
              </p>

              <!-- Discount Code -->
              <div style="background:#fef0f7;border-left:4px solid #e78ec4;padding:24px 28px;margin:24px 0;text-align:center;">
                <p style="color:#999;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your Exclusive VIP Code</p>
                <div style="font-size:2.2rem;font-weight:900;color:#e78ec4;letter-spacing:6px;">SNATCHED10</div>
                <p style="color:#999;font-size:0.75rem;margin:8px 0 0;">10% off your first purchase. Single use.</p>
              </div>

              <p style="color:#555;font-size:0.9rem;line-height:1.7;margin:0 0 32px;">
                Use the code above at checkout. Happy shopping!
              </p>

              <div style="text-align:center;">
                <a href="https://snatched.vercel.app/store.html"
                   style="display:inline-block;background:#1e1e1e;color:#fff;padding:16px 40px;text-decoration:none;font-weight:700;font-size:0.85rem;letter-spacing:2px;text-transform:uppercase;">
                  SHOP NOW
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background:#1e1e1e;padding:28px 40px;text-align:center;">
              <p style="color:#777;font-size:0.75rem;margin:0 0 4px;">© 2025 SNATCHED. All rights reserved.</p>
              <p style="color:#555;font-size:0.7rem;margin:0;">
                You received this because you signed up for VIP access on our website.
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    });

    // 2. Notify you (the founder) of the new signup
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: process.env.SUPPORT_EMAIL,
      subject: `🎀 New VIP Signup: ${firstName} ${lastName}`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#fff;border:1px solid #eee;">
          <h2 style="color:#e78ec4;font-size:1.4rem;margin:0 0 20px;">New VIP Subscriber!</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#999;font-size:0.8rem;width:120px;">NAME</td><td style="padding:8px 0;font-weight:700;color:#1e1e1e;">${firstName} ${lastName}</td></tr>
            <tr><td style="padding:8px 0;color:#999;font-size:0.8rem;">EMAIL</td><td style="padding:8px 0;font-weight:700;color:#1e1e1e;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#999;font-size:0.8rem;">PHONE</td><td style="padding:8px 0;font-weight:700;color:#1e1e1e;">${phone || 'Not provided'}</td></tr>
            <tr><td style="padding:8px 0;color:#999;font-size:0.8rem;">SOURCE</td><td style="padding:8px 0;font-weight:700;color:#1e1e1e;">VIP Popup</td></tr>
          </table>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: 'Subscribed successfully' });

  } catch (error) {
    console.error('Resend subscription error:', error);
    return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
};
