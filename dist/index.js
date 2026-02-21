"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const bot_1 = require("./telegram/bot");
async function main() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Health check
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // Initialize Telegram bot
    const bot = await (0, bot_1.createTelegramBot)(app);
    app.listen(config_1.config.PORT, () => {
        console.log(`🚀 North Orchestrator running on port ${config_1.config.PORT}`);
        console.log(`📡 Telegram bot: ${config_1.config.WEBHOOK_URL ? 'Webhook mode' : 'Polling mode'}`);
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
//# sourceMappingURL=index.js.map