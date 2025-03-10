import axios from 'axios';
import OpenAI from "openai";
import express from 'express';
import bodyParser from 'body-parser';
import Alpaca from "@alpacahq/alpaca-trade-api";
import dotenv from 'dotenv';
import brainjs from 'brain.js';

dotenv.config();
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
    apiKey: process.env.DEEP_SEEK_KEY
  },
  telegram: {
    botToken: 'YOUR_TELEGRAM_BOT_TOKEN',
    chatId: 'YOUR_CHAT_ID'
  }
};


const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY,
  secretKey: process.env.ALPACA_SECRET,
  paper: true,
});


let options = {
  start: "2022-09-01",
  end: "2022-09-07",
  timeframe: alpaca.newTimeframe(1, alpaca.timeframeUnit.HOUR),
};


// Initialize clients
// const bybitClient = new RestClientV5({
//   testnet: CONFIG.bybit.testnet
  
// });

const openaiClient = new OpenAI({
  baseURL: CONFIG.deepseek.baseUrl,
  apiKey: CONFIG.deepseek.apiKey
});



// AI Signal service
  const  getTradeSignal = async (marketData) =>  {
    try {
      const net = new brainjs.recurrent.LSTMTimeStep();
      net.fromJSON(JSON.parse(process.env.MODEL));
      // const completion = await openaiClient.chat.completions.create({
      //   messages: [
      //     {
      //       role: "user", 
      //       content: `Based on these prices ${JSON.stringify(marketData)}, should I buy or sell? Provide a concise recommendation.`
      //     }
      //   ],
      //   model: "deepseek-chat"
      // });
      
      // return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error getting AI signal:', error);
      throw error;
    }
  }

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

        const aiPrediction = await getTradeSignal(bars.get("BTC/USD"));
        console.log('AI prediction:', aiPrediction);

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