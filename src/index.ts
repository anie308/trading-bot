import axios from 'axios';
import OpenAI from "openai";
import express from 'express';
import bodyParser from 'body-parser';
import { RestClientV5 } from 'bybit-api';
import { bybitClient } from './client';
import Alpaca from "@alpacahq/alpaca-trade-api";
// Configuration
const CONFIG = {
  server: {
    port: 2025
  },
  bybit: {
    testnet: false,
    baseUrl: {
      testnet: "https://api-testnet.bybit.com",
      mainnet: "https://api.bybit.com"
    }
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    apiKey: ''
  },
  telegram: {
    botToken: 'YOUR_TELEGRAM_BOT_TOKEN',
    chatId: 'YOUR_CHAT_ID'
  }
};


const alpaca = new Alpaca({
  keyId: "YOUR_API_KEY",
  secretKey: "YOUR_API_SECRET",
});


let options = {
  start: "2022-09-01",
  end: "2022-09-07",
  timeframe: alpaca.newTimeframe(1, alpaca.timeframeUnit.DAY),
};


// Initialize clients
// const bybitClient = new RestClientV5({
//   testnet: CONFIG.bybit.testnet
  
// });

const openaiClient = new OpenAI({
  baseURL: CONFIG.deepseek.baseUrl,
  apiKey: CONFIG.deepseek.apiKey
});

// Market data service
// const marketService = {
//   async fetchKlineData(symbol = 'BTCUSD', interval = '60', startTime, endTime) {
//     try {
//       const response = await bybitClient.getKline({
//         category: 'inverse',
//         symbol: symbol,
//         interval: '60',
//         start: startTime || 1670601600000,
//         end: endTime || 1670608800000,
//       });
      
//       return response;
//     } catch (error) {
//       console.error('Error fetching market data:', error);
//       throw error;
//     }
//   }
// };

// AI Signal service
const signalService = {
  async getTradeSignal(marketData) {
    try {
      const completion = await openaiClient.chat.completions.create({
        messages: [
          {
            role: "user", 
            content: `Based on these prices ${JSON.stringify(marketData)}, should I buy or sell BTC? Provide a concise recommendation.`
          }
        ],
        model: "deepseek-chat"
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error getting AI signal:', error);
      throw error;
    }
  }
};

// Notification service
const notificationService = {
  async sendTelegramAlert(message) {
    if (!CONFIG.telegram.botToken || CONFIG.telegram.botToken === 'YOUR_TELEGRAM_BOT_TOKEN') {
      console.log('Telegram notification skipped: No valid bot token');
      return;
    }
    
    try {
      const url = `https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: CONFIG.telegram.chatId,
        text: message
      });
      console.log('Telegram notification sent');
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }
};

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Routes
app.post('/webhook', async (req, res) => {
    try {
        // Check connectivity first
        const bars = await alpaca.getCryptoBars(["BTC/USD"], options);

        // Get market data
        console.table(bars.get("BTC/USD"));

        res.status(200).json({ message: 'Webhook received' });
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
});

// Start server
app.listen(CONFIG.server.port, () => {
  console.log(`Server is running on port ${CONFIG.server.port}`);
});