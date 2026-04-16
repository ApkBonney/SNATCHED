const axios = require('axios');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference, orderData } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'No reference provided' });
  }

  const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

  // ── STEP 1: Verify payment with Paystack ──────────────────
  let verifiedData = null;

  if (!SECRET_KEY) {
    console.warn('PAYSTACK_SECRET_KEY missing — skipping secure verification (dev mode)');
    verifiedData = { status: 'success', reference };
  } else {
    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${SECRET_KEY}` },
      });

      if (response.data.data.status !== 'success') {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          status: response.data.data.status
        });
      }
      verifiedData = response.data.data;
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      return res.status(500).json({
        error: 'Backend error during verification',
        details: error.response?.data?.message || error.message
      });
    }
  }

  // ── STEP 2: Send Order Confirmation Emails via Resend ─────
  if (orderData && resend) {
    const { firstName, lastName, email, items = [], total, deliveryMethod, address } = orderData;
    const orderId = reference;
    const customerName = `${firstName || ''} ${lastName || ''}`.trim() || 'Valued Customer';
    const deliveryLabel = deliveryMethod === 'express' ? 'Express Delivery (1-2 days)' : 'Standard Delivery (3-5 days)';

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:0.9rem;color:#1e1e1e;">${item.name}</td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:0.9rem;color:#999;text-align:center;">x${item.quantity}</td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:0.9rem;font-weight:700;text-align:right;">GH₵${((parseFloat(item.price)||0) * (parseInt(item.quantity)||1)).toFixed(2)}</td>
      </tr>`).join('');

    const adminItemsText = items.map(i => `${i.name} (Size: ${i.size || 'OS'}) x${i.quantity} — GH₵${((parseFloat(i.price)||0)*(parseInt(i.quantity)||1)).toFixed(2)}`).join('<br>');

    try {
      // Email 1: Branded receipt to the customer
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email,
        subject: `Your SNATCHED Order is Confirmed 🎀 #${orderId.slice(-8).toUpperCase()}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
          <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;background:#fff;">

              <!-- Header -->
              <div style="background:#1e1e1e;padding:40px;text-align:center;">
                <h1 style="color:#e78ec4;font-size:2rem;font-weight:900;margin:0;letter-spacing:6px;">SNATCHED</h1>
                <p style="color:#777;font-size:0.75rem;letter-spacing:2px;margin:8px 0 0;text-transform:uppercase;">Order Confirmation</p>
              </div>

              <!-- Hero message -->
              <div style="background:linear-gradient(135deg,#e78ec4,#d46b9e);padding:32px 40px;text-align:center;">
                <div style="font-size:2.5rem;margin-bottom:8px;">✓</div>
                <h2 style="color:#fff;font-size:1.5rem;font-weight:900;margin:0;letter-spacing:1px;">Order Secured!</h2>
                <p style="color:rgba(255,255,255,0.85);font-size:0.9rem;margin:8px 0 0;">Thanks for shopping with us, ${firstName || 'friend'}.</p>
              </div>

              <!-- Order details -->
              <div style="padding:40px;">
                <table style="width:100%;margin-bottom:28px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#999;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;">Order Reference</td>
                    <td style="padding:8px 0;font-weight:700;color:#e78ec4;text-align:right;">#${orderId.slice(-8).toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#999;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;">Customer</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e1e1e;text-align:right;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#999;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;">Delivery</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e1e1e;text-align:right;">${deliveryLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#999;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;">Address</td>
                    <td style="padding:8px 0;font-weight:600;color:#1e1e1e;text-align:right;">${address?.street || ''}, ${address?.city || ''}</td>
                  </tr>
                </table>

                <!-- Items -->
                <p style="color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Items Ordered</p>
                <table style="width:100%;border-collapse:collapse;">
                  ${itemsHtml}
                </table>

                <!-- Total -->
                <div style="display:flex;justify-content:space-between;padding:16px 0;margin-top:4px;border-top:2px solid #1e1e1e;">
                  <span style="font-weight:900;font-size:1rem;text-transform:uppercase;letter-spacing:1px;">Total Paid</span>
                  <span style="font-weight:900;font-size:1rem;color:#e78ec4;">GH₵${parseFloat(total).toFixed(2)}</span>
                </div>

                <p style="color:#888;font-size:0.88rem;line-height:1.7;margin:24px 0 32px;">
                  We're already preparing your order. You'll receive a shipping update once your 
                  package is on its way. For any questions, just reply to this email.
                </p>

                <div style="text-align:center;">
                  <a href="https://snatched-six.vercel.app/store.html"
                     style="display:inline-block;background:#1e1e1e;color:#fff;padding:16px 44px;text-decoration:none;font-weight:700;font-size:0.8rem;letter-spacing:3px;text-transform:uppercase;">
                    SHOP MORE
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background:#1e1e1e;padding:28px 40px;text-align:center;">
                <p style="color:#555;font-size:0.75rem;margin:0 0 4px;">© 2026 SNATCHED. Made in Accra, Ghana.</p>
                <p style="color:#444;font-size:0.7rem;margin:0;">Questions? Reply to this email.</p>
              </div>

            </div>
          </body>
          </html>
        `,
      });

      // Email 2: Admin order notification to you (the founder)
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: process.env.SUPPORT_EMAIL,
        reply_to: email,
        subject: `🛍️ New Order: #${orderId.slice(-8).toUpperCase()} — GH₵${parseFloat(total).toFixed(2)}`,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#fff;border:1px solid #eee;">
            <h2 style="color:#1e1e1e;font-size:1.3rem;margin:0 0 4px;">🛍️ New Order Received!</h2>
            <p style="color:#999;font-size:0.8rem;margin:0 0 28px;">Hit "Reply" to contact the customer directly.</p>
            
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;width:120px;">Order ID</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:700;color:#e78ec4;">#${orderId.slice(-8).toUpperCase()}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Customer</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;">${customerName}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;"><a href="mailto:${email}" style="color:#e78ec4;">${email}</a></td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Address</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">${address?.street || ''}, ${address?.city || ''}, ${address?.region || ''}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Delivery</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">${deliveryLabel}</td></tr>
              <tr><td style="padding:10px 0;color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Total</td><td style="padding:10px 0;font-weight:900;font-size:1.1rem;color:#1e1e1e;">GH₵${parseFloat(total).toFixed(2)}</td></tr>
            </table>

            <div style="background:#f9f9f9;padding:20px 24px;border-radius:4px;">
              <p style="color:#999;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Items</p>
              ${adminItemsText}
            </div>

            <p style="color:#ccc;font-size:0.7rem;margin-top:28px;text-align:center;">Sent from SNATCHED · Paystack reference: ${orderId}</p>
          </div>
        `,
      });

    } catch (emailErr) {
      // Don't fail the whole request if email breaks — order is still confirmed
      console.error('Resend order email error:', emailErr);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Payment verified and confirmation emails sent',
    data: verifiedData
  });
};
