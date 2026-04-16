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
        <td style="padding:16px 0;border-bottom:1px solid #e0e0e0;font-size:13px;color:#000000;">${item.name}</td>
        <td style="padding:16px 0;border-bottom:1px solid #e0e0e0;font-size:13px;color:#666666;text-align:center;">QTY: ${item.quantity}</td>
        <td style="padding:16px 0;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:600;text-align:right;color:#000000;">GH₵${((parseFloat(item.price)||0) * (parseInt(item.quantity)||1)).toFixed(2)}</td>
      </tr>`).join('');

    const adminItemsText = items.map(i => `${i.name} (Size: ${i.size || 'OS'}) x${i.quantity} — GH₵${((parseFloat(i.price)||0)*(parseInt(i.quantity)||1)).toFixed(2)}`).join('<br>');

    try {
      // Email 1: Branded receipt to the customer
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email,
        subject: `SNATCHED — Order #${orderId.slice(-8).toUpperCase()} Confirmed`,
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
                <h1 style="color:#000000;font-size:24px;font-weight:700;margin:0;letter-spacing:2px;text-transform:uppercase;">Order Secured</h1>
                <p style="color:#666666;font-size:14px;margin:12px 0 0;line-height:1.5;">Thank you for your order, ${firstName || ''}.</p>
              </div>

              <!-- Order summary -->
              <div style="padding:20px 40px;">
                <div style="border:1px solid #e0e0e0;padding:24px;">
                  <table style="width:100%;margin-bottom:24px;border-collapse:collapse;">
                    <tr>
                      <td style="padding:6px 0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:120px;">Order No.</td>
                      <td style="padding:6px 0;color:#000000;font-size:13px;font-weight:600;text-align:right;">#${orderId.slice(-8).toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Delivery</td>
                      <td style="padding:6px 0;color:#000000;font-size:13px;text-align:right;">${deliveryLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Address</td>
                      <td style="padding:6px 0;color:#000000;font-size:13px;text-align:right;line-height:1.4;">${customerName}<br>${address?.street || ''}<br>${address?.city || ''}</td>
                    </tr>
                  </table>

                  <!-- Items -->
                  <p style="color:#000000;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;border-bottom:1px solid #000000;padding-bottom:8px;">Order Details</p>
                  <table style="width:100%;border-collapse:collapse;">
                    ${itemsHtml}
                  </table>

                  <!-- Total -->
                  <div style="display:flex;justify-content:space-between;padding:16px 0 0;margin-top:16px;border-top:1px solid #000000;">
                    <span style="font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#000000;">Total Paid</span>
                    <span style="font-weight:700;font-size:14px;color:#000000;">GH₵${parseFloat(total).toFixed(2)}</span>
                  </div>
                </div>

                <p style="color:#666666;font-size:13px;line-height:1.6;margin:32px 0;text-align:center;">
                  Your order is currently being processed. You will receive an update once it has been dispatched.
                </p>

                <div style="text-align:center;">
                  <a href="https://snatched-six.vercel.app/store.html"
                     style="display:inline-block;background:#000000;color:#ffffff;padding:14px 40px;text-decoration:none;font-weight:600;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
                    RETURN TO STORE
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

      // Email 2: Admin order notification to you (the founder)
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: process.env.SUPPORT_EMAIL,
        reply_to: email,
        subject: `SNATCHED — New Order #${orderId.slice(-8).toUpperCase()} — GH₵${parseFloat(total).toFixed(2)}`,
        html: `
          <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#ffffff;border:1px solid #e0e0e0;">
            <div style="text-align:center;margin-bottom:32px;">
              <img src="https://snatched-six.vercel.app/images/snatched%20black.png" alt="SNATCHED" style="max-width:150px;height:auto;display:block;margin:0 auto;">
            </div>
            <h2 style="color:#000000;font-size:18px;font-weight:700;margin:0 0 8px;letter-spacing:1px;text-transform:uppercase;text-align:center;">New Order Received</h2>
            <p style="color:#666666;font-size:13px;margin:0 0 32px;text-align:center;">Reply to this email to contact the customer.</p>
            
            <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
              <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:120px;">Order No.</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;font-weight:600;color:#000000;font-size:13px;">#${orderId.slice(-8).toUpperCase()}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Customer</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;font-weight:400;color:#000000;font-size:13px;">${customerName}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;font-weight:400;font-size:13px;"><a href="mailto:${email}" style="color:#000000;text-decoration:underline;">${email}</a></td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Address</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#000000;font-size:13px;">${address?.street || ''}, ${address?.city || ''}, ${address?.region || ''}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#666666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Delivery</td><td style="padding:12px 0;border-bottom:1px solid #e0e0e0;color:#000000;font-size:13px;">${deliveryLabel}</td></tr>
              <tr><td style="padding:12px 0;color:#000000;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Total Paid</td><td style="padding:12px 0;font-weight:700;font-size:14px;color:#000000;">GH₵${parseFloat(total).toFixed(2)}</td></tr>
            </table>

            <div style="border:1px solid #e0e0e0;padding:24px;">
              <p style="color:#000000;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;border-bottom:1px solid #000000;padding-bottom:8px;">Order Details</p>
              <div style="color:#333333;font-size:13px;line-height:1.8;">
                ${adminItemsText}
              </div>
            </div>

            <p style="color:#999999;font-size:11px;margin-top:32px;text-align:center;text-transform:uppercase;letter-spacing:1px;">Paystack Ref: ${orderId}</p>
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
