export const detectICTSetup = (marketData) => {
    if (marketData.length < 6) return null; // Need more candles to confirm structure

    const lastCandle = marketData[marketData.length - 1];
    const prevCandle = marketData[marketData.length - 2];
    const swingLow = Math.min(marketData[marketData.length - 4].low, prevCandle.low);
    const swingHigh = Math.max(marketData[marketData.length - 4].high, prevCandle.high);

    let tradeSignal = null;
    let entry = lastCandle.close;
    let stopLoss = null;
    let takeProfit = null;
    let reason = '';

    // ✅ Identify Order Blocks (Last Opposite Candle Before Impulse Move)
    const findOrderBlock = (type) => {
        for (let i = marketData.length - 5; i >= 0; i--) {
            const candle = marketData[i];
            if (type === 'bullish' && candle.close < candle.open) return candle; // Last bearish candle
            if (type === 'bearish' && candle.close > candle.open) return candle; // Last bullish candle
        }
        return null;
    };

    // 🔹 Check for Bullish Order Block
    const bullishOB = findOrderBlock('bullish');
    // 🔹 Check for Bearish Order Block
    const bearishOB = findOrderBlock('bearish');

    // ✅ Fair Value Gap (FVG) Check (Imbalance between 3 candles)
    const fvgExists =
        marketData[marketData.length - 3].high < prevCandle.low ||
        marketData[marketData.length - 3].low > prevCandle.high;

    // ✅ Buy Setup: Liquidity Sweep + Order Block + MSS
    if (lastCandle.low < swingLow && lastCandle.close > prevCandle.open && bullishOB) {
        tradeSignal = 'BUY';
        stopLoss = bullishOB.low - (bullishOB.high - bullishOB.low) * 0.2; // Stop under OB
        takeProfit = entry + (entry - stopLoss) * 3; // 3R Take Profit
        reason = 'Liquidity sweep below swing low with bullish close + OB confirmation' + (fvgExists ? ' + FVG' : '');
    }

    // ✅ Sell Setup: Liquidity Sweep + Order Block + MSS
    if (lastCandle.high > swingHigh && lastCandle.close < prevCandle.open && bearishOB) {
        tradeSignal = 'SELL';
        stopLoss = bearishOB.high + (bearishOB.high - bearishOB.low) * 0.2; // Stop above OB
        takeProfit = entry - (stopLoss - entry) * 3; // 3R Take Profit
        reason = 'Liquidity sweep above swing high with bearish close + OB confirmation' + (fvgExists ? ' + FVG' : '');
    }

    return tradeSignal ? { tradeSignal, entry, stopLoss, takeProfit, reason } : null;
};
