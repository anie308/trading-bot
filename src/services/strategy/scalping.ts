export const detectICTScalpingSetup = (marketData, pair) => {
    if (marketData.length < 6) return null; // Need at least 6 candles for confirmation

    const lastCandle = marketData[marketData.length - 1];
    const prevCandle = marketData[marketData.length - 2];
    const swingLow = Math.min(marketData[marketData.length - 4].low, prevCandle.low);
    const swingHigh = Math.max(marketData[marketData.length - 4].high, prevCandle.high);

    let tradeSignal = null;
    let entry = lastCandle.close;
    let stopLoss = null;
    let takeProfit = null;
    let reason = '';

    // ✅ Adjust parameters based on trading pair
    const pairConfigs = {
        "ETH/USD": { slMultiplier: 0.1, tpMultiplier: 2 },
        "BTC/USD": { slMultiplier: 0.15, tpMultiplier: 2.5 },
        "EUR/USD": { slMultiplier: 0.05, tpMultiplier: 1.5 },
        "GBP/USD": { slMultiplier: 0.06, tpMultiplier: 1.8 },
        "XAU/USD": { slMultiplier: 0.2, tpMultiplier: 3 },
        "default": { slMultiplier: 0.1, tpMultiplier: 2 }
    };

    const config = pairConfigs[pair] || pairConfigs["default"];
    
    // ✅ Identify Order Blocks (Last Opposite Candle Before Impulse Move)
    const findOrderBlock = (type) => {
        for (let i = marketData.length - 5; i >= 0; i--) {
            const candle = marketData[i];
            if (type === 'bullish' && candle.close < candle.open) return candle; // Last bearish candle
            if (type === 'bearish' && candle.close > candle.open) return candle; // Last bullish candle
        }
        return null;
    };

    const bullishOB = findOrderBlock('bullish');
    const bearishOB = findOrderBlock('bearish');

    // ✅ Fair Value Gap (FVG) Check (Imbalance between 3 candles)
    const fvgExists =
        marketData[marketData.length - 3].high < prevCandle.low ||
        marketData[marketData.length - 3].low > prevCandle.high;

    // ✅ Session Timing (Only Trade in High Volatility Sessions)
    const currentHour = new Date(lastCandle.timestamp).getUTCHours();
    const isKillzone = (currentHour >= 7 && currentHour <= 10) || (currentHour >= 13 && currentHour <= 16);
    
    if (!isKillzone) return null; // Only trade in London & NY killzones

    // ✅ Buy Setup: Liquidity Sweep + Order Block Retest + MSS
    if (lastCandle.low < swingLow && lastCandle.close > prevCandle.open && bullishOB) {
        tradeSignal = 'BUY';
        entry = bullishOB.low; // Refine entry at the OB
        stopLoss = bullishOB.low - (bullishOB.high - bullishOB.low) * config.slMultiplier; // Dynamic SL
        takeProfit = entry + (entry - stopLoss) * config.tpMultiplier; // Dynamic TP
        reason = `Liquidity sweep below swing low with bullish OB retest + MSS${fvgExists ? ' + FVG' : ''}`;
    }

    // ✅ Sell Setup: Liquidity Sweep + Order Block Retest + MSS
    if (lastCandle.high > swingHigh && lastCandle.close < prevCandle.open && bearishOB) {
        tradeSignal = 'SELL';
        entry = bearishOB.high; // Refine entry at the OB
        stopLoss = bearishOB.high + (bearishOB.high - bearishOB.low) * config.slMultiplier; // Dynamic SL
        takeProfit = entry - (stopLoss - entry) * config.tpMultiplier; // Dynamic TP
        reason = `Liquidity sweep above swing high with bearish OB retest + MSS${fvgExists ? ' + FVG' : ''}`;
    }

    return tradeSignal ? { tradeSignal, entry, stopLoss, takeProfit, reason } : null;
};
