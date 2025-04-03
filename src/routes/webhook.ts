import express from 'express';
import { fetchMarketData } from '../services/marketData';
import { detectICTSetup } from '../services/signal';
import { sendTelegramAlert } from '../services/bot';

const router = express.Router();

router.post('/webhook', async (req, res) => {
  try {
    const marketData = await fetchMarketData("BTC/USD");
    const tradeSetup = detectICTSetup(marketData);

    if (tradeSetup) {
      await sendTelegramAlert(tradeSetup);
    }
    res.status(200).json({ message: 'Webhook processed', tradeSetup });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
