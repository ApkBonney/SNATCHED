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
      subject: `📩 SNATCHED Contact: ${subject}`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fff;border:1px solid #eee;">

          <div style="border-left:4px solid #e78ec4;padding-left:16px;margin-bottom:28px;">
            <h2 style="color:#1e1e1e;font-size:1.3rem;margin:0 0 4px;">New Contact Form Submission</h2>
            <p style="color:#999;font-size:0.8rem;margin:0;">Hit "Reply" to respond directly to the customer.</p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;width:130px;">Name</td>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:700;color:#1e1e1e;">${firstName} ${lastName}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;">Email</td>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:700;color:#e78ec4;"><a href="mailto:${email}" style="color:#e78ec4;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;">Order #</td>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:700;color:#1e1e1e;">${orderNumber || '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;">Subject</td>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:700;color:#1e1e1e;">${subject}</td>
            </tr>
          </table>

          <div style="background:#f9f9f9;padding:20px 24px;border-radius:4px;">
            <p style="color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Message</p>
            <p style="color:#1e1e1e;font-size:0.95rem;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
          </div>

          <p style="color:#ccc;font-size:0.7rem;margin-top:24px;text-align:center;">
            Sent from the SNATCHED contact form · Reply directly to this email to respond to the customer
          </p>
        </div>
      `,
    });

    // Also send an auto-reply confirmation to the customer
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: email,
      subject: `We've received your message, ${firstName} ✅`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;">
          <div style="background:linear-gradient(135deg,#e78ec4 0%,#d46b9e 100%);padding:40px;text-align:center;">
            <h1 style="color:#fff;font-size:2rem;font-weight:900;margin:0;letter-spacing:4px;">SNATCHED</h1>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#1e1e1e;font-size:1.4rem;font-weight:800;margin:0 0 16px;">Message Received, ${firstName}!</h2>
            <p style="color:#555;font-size:0.95rem;line-height:1.7;margin:0 0 16px;">
              Thanks for reaching out. We have received your message and will get back to you within <strong>3–5 business days</strong>.
            </p>
            <div style="background:#fef0f7;border-left:4px solid #e78ec4;padding:16px 20px;margin:24px 0;">
              <p style="color:#999;font-size:0.75rem;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Your subject</p>
              <p style="color:#1e1e1e;font-weight:700;margin:0;">${subject}</p>
            </div>
            <p style="color:#555;font-size:0.9rem;line-height:1.7;">
              In the meantime, do not hesitate to browse our latest collection on the store.
            </p>
            <div style="text-align:center;margin-top:32px;">
              <a href="https://snatched.vercel.app/store.html"
                 style="display:inline-block;background:#1e1e1e;color:#fff;padding:14px 36px;text-decoration:none;font-weight:700;font-size:0.85rem;letter-spacing:2px;text-transform:uppercase;">
                VISIT STORE
              </a>
            </div>
          </div>
          <div style="background:#1e1e1e;padding:24px;text-align:center;">
            <p style="color:#777;font-size:0.75rem;margin:0;">© 2025 SNATCHED. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: 'Message sent successfully' });

  } catch (error) {
    console.error('Resend contact error:', error);
    return res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
};
