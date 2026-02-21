import express from 'express';
import { config } from './config';
import { createTelegramBot } from './telegram/bot';

async function main() {
    const app = express();
    app.use(express.json());

    // Health check
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // GitHub Webhook
    const { handleGithubWebhook } = await import('./github/webhook');
    app.post('/github-webhook', handleGithubWebhook);

    // Initialize Telegram bot
    const bot = await createTelegramBot(app);

    app.listen(config.PORT, () => {
        console.log(`🚀 North Orchestrator running on port ${config.PORT}`);
        console.log(`📡 Telegram bot: ${config.WEBHOOK_URL ? 'Webhook mode' : 'Polling mode'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down...');
        bot.stopPolling?.();
        process.exit(0);
    });
}

main().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
