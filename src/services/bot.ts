import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  const chatId = ctx.chat.id;
  const username = ctx.from.username;
  ctx.reply(
    `👋 Hello, ${username}! \n\n` +
    `Your Chat ID: \`${chatId}\`\n\n` +
    `Use this ID in your environment variables to receive trade signals.`
  );
  console.log(`New user started bot. Chat ID: ${chatId}`);
});

interface TradeSetup {
  tradeSignal: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
}

export const sendTelegramAlert = async (tradeSetup: TradeSetup): Promise<void> => {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) return;
    const { tradeSignal, entry, stopLoss, takeProfit, reason } = tradeSetup;
    const message = `📢 *Trade Alert* 🚀\n\n` +
                    `🔹 *Signal:* ${tradeSignal} BTC/USD\n` +
                    `💰 *Entry:* ${entry}\n` +
                    `🛑 *Stop Loss:* ${stopLoss}\n` +
                    `🎯 *Take Profit:* ${takeProfit}\n` +
                    `📌 *Reason:* ${reason}\n\n` +
                    `⚡ *Stay cautious and manage risk!*`;

    await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID as string, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Telegram alert error:', error);
  }
};

// Start the bot
bot.launch().then(() => console.log("🤖 Telegram bot is running!"));

export default bot;
