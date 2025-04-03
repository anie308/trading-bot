import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import webhookRoutes from './routes/webhook.js';

import tradeSignalJob from './jobs/singalJob.js';

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use('/api', webhookRoutes);

const PORT = process.env.PORT || 2025;

// Schedule job to check market data every 15 minutes


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Start the cron job
tradeSignalJob.start();
console.log('⏳ Trade signal cron job has been initialized.');