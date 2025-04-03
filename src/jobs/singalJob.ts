import cron from 'node-cron';
import { fetchMarketData } from '../services/marketData';
import { sendTelegramAlert } from '../services/bot';
// import { detectICTSetup } from '../services/strategy/normal';
import { detectICTScalpingSetup } from '../services/strategy/scalping';

const tradingPairs = ["ETH/USD", "BTC/USD", "AVAX/USD", "LTC/USD", "BCH/USD"];

// Schedule the job to run every minute (adjust as needed)
const tradeSignalJob = cron.schedule('* * * * *', async () => {
  console.log('📡 Checking for trade signals...');

  for (const pair of tradingPairs) {
    try {
      console.log(`🔍 Fetching market data for ${pair}...`);
      const marketData = await fetchMarketData(pair, "1Min");  // 1-Min timeframe for scalping
      // console.table(marketData)
      const tradeSetup = detectICTScalpingSetup(marketData, pair);

      if (tradeSetup) {
        console.log(`🚀 Trade signal detected for ${pair}! Sending alert...`);
        await sendTelegramAlert(tradeSetup);
      } else {
        console.log(`🚫 No valid trade signal detected for ${pair}.`);
      }
      
      // Small delay to avoid API rate limits (Optional)
      await new Promise(resolve => setTimeout(resolve, 1000));  // 1 second delay

    } catch (error) {
      console.error(`❌ Error processing ${pair}:`, error);
    }
  }
  
  // try {
  //   const marketData = await fetchMarketData("ETH/USD");
  //   const tradeSetup = detectICTScalpingSetup(marketData, "ETH/USD");

  //   if (tradeSetup) {
  //     await sendTelegramAlert(tradeSetup);
  //   } else {
  //     console.log('🚫 No valid trade signal detected.');
  //   }
  // } catch (error) {
  //   console.error('❌ Error in trade signal job:', error);
  // }
}, {
  scheduled: true,
  timezone: 'UTC'  // Adjust timezone if needed
});

console.log('✅ Node-cron trade signal job has started.');

export default tradeSignalJob;
