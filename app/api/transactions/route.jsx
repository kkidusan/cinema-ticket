import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const response = await axios.get('https://api.chapa.co/v1/transactions', {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      },
    });

    return res.status(200).json({
      success: true,
      data: response.data.data, // Adjust based on actual API response
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to fetch transactions',
    });
  }
}