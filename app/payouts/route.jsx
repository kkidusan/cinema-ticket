export default async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  
    const isTestMode = process.env.NEXT_PUBLIC_CHAPA_TEST_MODE === 'true';
  
    try {
      if (isTestMode) {
        // Default mock payouts
        const defaultPayouts = [
          {
            reference: `payout-${Date.now() - 86400000}`,
            amount: 500,
            currency: 'ETB',
            account_name: 'Test Mobile',
            account_number: '251912345678',
            isMobileMoney: true,
            status: 'completed',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            reference: `payout-${Date.now() - 2 * 86400000}`,
            amount: 1000,
            currency: 'ETB',
            account_name: 'Test User',
            account_number: '251900000000',
            bank_code: '001',
            isMobileMoney: false,
            status: 'pending',
            created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ];
  
        // Note: localStorage is client-side, so we rely on client to manage it
        // Server returns defaults to ensure data is always present
        return res.status(200).json({
          success: true,
          data: defaultPayouts,
        });
      } else {
        // Placeholder for real Chapa API call
        return res.status(501).json({
          success: false,
          message: 'Live mode not implemented yet',
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch payouts',
      });
    }
  }