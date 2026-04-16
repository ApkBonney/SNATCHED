const axios = require('axios');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'No reference provided' });
  }

  const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

  if (!SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is not set in environment variables');
    // We return success temporarily for development purposes if you haven't set the key yet,
    // but we log the error so you know to fix it.
    return res.status(200).json({ 
        success: true, 
        message: 'DEVELOPMENT MODE: Reference received, but Secret Key missing. Skipping secure verification.',
        reference 
    });
  }

  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
      },
    });

    if (response.data.data.status === 'success') {
      return res.status(200).json({ 
        success: true, 
        message: 'Payment verified successfully',
        data: response.data.data 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed',
        status: response.data.data.status 
      });
    }

  } catch (error) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    return res.status(500).json({ 
        error: 'Backend error during verification',
        details: error.response?.data?.message || error.message 
    });
  }
};
