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
    // 1. Send test welcome email to the new subscriber
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: email,
      subject: 'Welcome to SNATCHED VIP',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;">
            
            <!-- Logo Header -->
            <div style="padding:40px 0;text-align:center;border-bottom:1px solid #000000;">
              <img src="https://snatched-six.vercel.app/images/snatched%20black.png" alt="SNATCHED" style="max-width:200px;height:auto;display:block;margin:0 auto;">
            </div>

            <!-- Minimalist Title -->
            <div style="padding:40px 40px 20px;text-align:center;">
              <h1 style="color:#000000;font-size:24px;font-weight:700;margin:0;letter-spacing:2px;text-transform:uppercase;">VIP Access Granted</h1>
              <p style="color:#666666;font-size:14px;margin:12px 0 0;line-height:1.5;">Welcome, ${firstName}.</p>
            </div>

            <!-- Body -->
            <div style="padding:20px 40px;">
              <p style="color:#333333;font-size:13px;line-height:1.8;margin:0 0 32px;text-align:center;">
                You are officially part of the SNATCHED inner circle. You will be the first to know about exclusive drops, new collections, and private events.
              </p>

              <!-- Discount Code -->
              <div style="border:1px solid #e0e0e0;padding:32px 24px;margin:32px 0;text-align:center;">
                <p style="color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Your Exclusive VIP Code</p>
                <div style="font-size:32px;font-weight:700;color:#000000;letter-spacing:6px;margin:0 0 16px;">SNATCHED10</div>
                <p style="color:#999999;font-size:12px;margin:0;text-transform:uppercase;letter-spacing:1px;">10% OFF YOUR FIRST PURCHASE</p>
              </div>

              <div style="text-align:center;">
                <a href="https://snatched-six.vercel.app/store.html"
                   style="display:inline-block;background:#000000;color:#ffffff;padding:14px 40px;text-decoration:none;font-weight:600;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
                  SHOP NOW
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding:40px;text-align:center;border-top:1px solid #e0e0e0;margin-top:20px;">
              <p style="color:#000000;font-size:11px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase;font-weight:700;">SNATCHED</p>
              <p style="color:#999999;font-size:11px;margin:0 0 16px;">Made in Accra, Ghana.</p>
              <p style="color:#cccccc;font-size:10px;margin:0;line-height:1.4;">
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
      subject: `SNATCHED VIP Signup: ${firstName} ${lastName}`,
      html: `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#ffffff;border:1px solid #e0e0e0;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="https://snatched-six.vercel.app/images/snatched%20black.png" alt="SNATCHED" style="max-width:150px;height:auto;display:block;margin:0 auto;">
          </div>
          <h2 style="color:#000000;font-size:18px;font-weight:700;margin:0 0 32px;letter-spacing:1px;text-transform:uppercase;text-align:center;">New VIP Subscriber</h2>
          
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:120px;">Name</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;font-weight:600;color:#000000;font-size:13px;">${firstName} ${lastName}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;font-weight:400;font-size:13px;"><a href="mailto:${email}" style="color:#000000;text-decoration:underline;">${email}</a></td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Phone</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#000000;font-size:13px;">${phone || '—'}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Source</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#000000;font-size:13px;">VIP Popup</td></tr>
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
