const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, orderNumber, subject, message } = req.body;

  if (!firstName || !email || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Forward the contact form message to your support inbox.
    // The reply-to is set to the CUSTOMER's email so you can simply
    // hit "Reply" in your email app to respond directly to them.
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: process.env.SUPPORT_EMAIL,
      reply_to: email,
      subject: `SNATCHED Inquiry: ${subject}`,
      html: `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#ffffff;border:1px solid #e0e0e0;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="https://snatched-six.vercel.app/images/snatched%20black.png" alt="SNATCHED" style="max-width:150px;height:auto;display:block;margin:0 auto;">
          </div>
          <h2 style="color:#000000;font-size:18px;font-weight:700;margin:0 0 8px;letter-spacing:1px;text-transform:uppercase;text-align:center;">New Inquiry</h2>
          <p style="color:#666666;font-size:13px;margin:0 0 32px;text-align:center;">Reply to this email to respond directly to the customer.</p>
          
          <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
            <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:120px;">Name</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;font-weight:600;color:#000000;font-size:13px;">${firstName} ${lastName}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;font-weight:400;font-size:13px;"><a href="mailto:${email}" style="color:#000000;text-decoration:underline;">${email}</a></td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Order No.</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#000000;font-size:13px;">${orderNumber || '—'}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Subject</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#000000;font-size:13px;">${subject}</td></tr>
          </table>

          <div style="border:1px solid #e0e0e0;padding:24px;">
            <p style="color:#000000;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;border-bottom:1px solid #000000;padding-bottom:8px;">Message</p>
            <div style="color:#333333;font-size:13px;line-height:1.8;white-space:pre-wrap;">${message}</div>
          </div>
        </div>
      `,
    });

    // Also send an auto-reply confirmation to the customer
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: email,
      subject: `SNATCHED — We've received your message`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;">
            
            <!-- Logo Header -->
            <div style="padding:40px 0;text-align:center;border-bottom:1px solid #000000;">
              <img src="https://snatched-six.vercel.app/images/snatched%20black.png" alt="SNATCHED" style="max-width:200px;height:auto;display:block;margin:0 auto;">
            </div>

            <!-- Minimalist Title -->
            <div style="padding:40px 40px 20px;text-align:center;">
              <h1 style="color:#000000;font-size:24px;font-weight:700;margin:0;letter-spacing:2px;text-transform:uppercase;">Inquiry Received</h1>
              <p style="color:#666666;font-size:14px;margin:12px 0 0;line-height:1.5;">Hello ${firstName}, we have received your message.</p>
            </div>

            <!-- Details -->
            <div style="padding:20px 40px;">
              <div style="border:1px solid #e0e0e0;padding:24px;text-align:center;">
                <p style="color:#000000;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Subject Reference</p>
                <p style="color:#666666;font-size:14px;font-weight:600;margin:0;">${subject}</p>
              </div>

              <p style="color:#666666;font-size:13px;line-height:1.6;margin:32px 0;text-align:center;">
                Our support team will review your inquiry and respond within 3–5 business days. We appreciate your patience.
              </p>

              <div style="text-align:center;">
                <a href="https://snatched-six.vercel.app/store.html"
                   style="display:inline-block;background:#000000;color:#ffffff;padding:14px 40px;text-decoration:none;font-weight:600;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
                  BROWSE STORE
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding:40px;text-align:center;border-top:1px solid #000000;margin-top:20px;">
              <p style="color:#000000;font-size:11px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase;font-weight:700;">SNATCHED</p>
              <p style="color:#666666;font-size:11px;margin:0;">Made in Accra, Ghana.</p>
            </div>

          </div>
        </body>
        </html>
      `,
    });

    return res.status(200).json({ success: true, message: 'Message sent successfully' });

  } catch (error) {
    console.error('Resend contact error:', error);
    return res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
};
