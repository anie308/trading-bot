import Alpaca from "@alpacahq/alpaca-trade-api";
import dotenv from 'dotenv';

dotenv.config();

const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY,
  secretKey: process.env.ALPACA_SECRET,
  paper: true,
});

export const fetchMarketData = async (symbol, timeframe = "1Min", limit = 500) => {
    try {
      const now = new Date();
      const start = new Date(now.getTime() - 100 * 60 * 1000).toISOString(); // 100 minutes ago
  
      const bars = await alpaca.getCryptoBars([symbol], {
        limit,
        timeframe: alpaca.newTimeframe(1, alpaca.timeframeUnit.MIN),
      });

      // console.table(bars);
  
      if (bars.has(symbol)) {
        return bars.get(symbol).map(bar => ({
          time: bar.Timestamp,
          open: bar.Open,
          high: bar.High,
          low: bar.Low,
          close: bar.Close,
          volume: bar.Volume
        }));
      }
      return [];
    } catch (error) {
      console.error(`Error fetching ${symbol} data:`, error);
      return [];
    }
  };
