//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
extern double MaxRiskPercent = 2.0;  // Max risk per trade (percentage of account balance)
extern double MaxDrawdownLimit = 10.0; // Max allowed drawdown limit (percentage)
extern int FastMAPeriod = 10;         // Fast EMA period
extern int SlowMAPeriod = 50;         // Slow EMA period
extern int RSIPeriod = 14;            // RSI period
extern double RSIOverbought = 70.0;
extern double RSIOverSold = 30.0;
extern int ATRPeriod = 14;            // ATR period for dynamic stop loss and take profit
extern int Slippage = 3;             // Slippage for trade execution

//+------------------------------------------------------------------+
//| Calculate dynamic lot size based on risk percentage               |
//+------------------------------------------------------------------+
double CalculateLotSize(double stopLossDistance) {
    double riskAmount = AccountBalance() * MaxRiskPercent / 100;
    double lotSize = riskAmount / (stopLossDistance * MarketInfo(Symbol(), MODE_POINT) * MarketInfo(Symbol(), MODE_MARGINREQUIRED));
    return NormalizeDouble(lotSize, 2);
}

//+------------------------------------------------------------------+
//| Check if the maximum drawdown limit has been exceeded            |
//+------------------------------------------------------------------+
bool IsDrawdownExceeding() {
    double currentDrawdown = (AccountBalance() - AccountEquity()) / AccountBalance() * 100;
    if (currentDrawdown > MaxDrawdownLimit) {
        Print("Max drawdown exceeded. Stopping trading.");
        return true;
    }
    return false;
}

//+------------------------------------------------------------------+
//| Get the fast and slow EMA values for trend direction             |
//+------------------------------------------------------------------+
double GetFastEMA() {
    return iMA(Symbol(), 0, FastMAPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
}

double GetSlowEMA() {
    return iMA(Symbol(), 0, SlowMAPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
}

//+------------------------------------------------------------------+
//| Get the RSI value for momentum and overbought/oversold conditions |
//+------------------------------------------------------------------+
double GetRSI() {
    return iRSI(Symbol(), 0, RSIPeriod, PRICE_CLOSE, 0);
}

//+------------------------------------------------------------------+
//| Calculate the ATR for dynamic stop loss and take profit levels    |
//+------------------------------------------------------------------+
double CalculateATR() {
    return iATR(Symbol(), 0, ATRPeriod, 0); // Get the ATR value for dynamic adjustments
}

double CalculateStopLoss(double atrValue) {
    return atrValue * 1.5; // Dynamic StopLoss, can adjust the multiplier
}

double CalculateTakeProfit(double atrValue) {
    return atrValue * 3.0; // Dynamic TakeProfit, can adjust the multiplier
}

//+------------------------------------------------------------------+
//| Trailing stop function to lock in profits                       |
//+------------------------------------------------------------------+
void SetTrailingStop(int ticket, double stopLossPrice) {
    double newStopLoss = stopLossPrice;
    if (OrderType() == OP_BUY) {
        if (Bid - newStopLoss > MarketInfo(Symbol(), MODE_POINT) * 10) { // Trailing if price moves 10 pips in our favor
            OrderModify(ticket, OrderOpenPrice(), newStopLoss, OrderTakeProfit(), 0, clrYellow);
        }
    } else if (OrderType() == OP_SELL) {
        if (newStopLoss - Ask > MarketInfo(Symbol(), MODE_POINT) * 10) {
            OrderModify(ticket, OrderOpenPrice(), newStopLoss, OrderTakeProfit(), 0, clrYellow);
        }
    }
}

//+------------------------------------------------------------------+
//| OnTick function to check for trading opportunities               |
//+------------------------------------------------------------------+
void OnTick() {
    // Avoid trading if drawdown exceeds limit
    if (IsDrawdownExceeding()) return;

    double fastEMA = GetFastEMA();
    double slowEMA = GetSlowEMA();
    double rsi = GetRSI();
    
    // ATR-based dynamic adjustments
    double atrValue = CalculateATR();
    double dynamicStopLoss = CalculateStopLoss(atrValue);
    double dynamicTakeProfit = CalculateTakeProfit(atrValue);

    // Calculate lot size based on risk
    double stopLossDistance = dynamicStopLoss * Point;
    double lotSize = CalculateLotSize(stopLossDistance);

    // Get the current price
    double askPrice = Ask;
    double bidPrice = Bid;

    // Define the trade setup based on conditions
    bool isBullish = fastEMA > slowEMA && rsi < RSIOverSold;
    bool isBearish = fastEMA < slowEMA && rsi > RSIOverbought;

    // Opening Buy Order (Bullish Condition)
    if (isBullish) {
        int ticket = OrderSend(Symbol(), OP_BUY, lotSize, askPrice, Slippage, askPrice - dynamicStopLoss, askPrice + dynamicTakeProfit, "Buy order", 0, 0, clrGreen);
        if (ticket > 0) {
            Print("Buy order opened at ", askPrice);
        }
    }

    // Opening Sell Order (Bearish Condition)
    if (isBearish) {
        int ticket = OrderSend(Symbol(), OP_SELL, lotSize, bidPrice, Slippage, bidPrice + dynamicStopLoss, bidPrice - dynamicTakeProfit, "Sell order", 0, 0, clrRed);
        if (ticket > 0) {
            Print("Sell order opened at ", bidPrice);
        }
    }

    // Apply trailing stop logic
    int ticket = OrderSelect(0, SELECT_BY_POS, MODE_TRADES);
    if (ticket > 0) {
        SetTrailingStop(ticket, dynamicStopLoss);
    }
}
