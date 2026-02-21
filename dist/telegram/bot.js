"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTelegramBot = createTelegramBot;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const meeting_1 = require("../agents/meeting");
const config_1 = require("../config");
const issues_1 = require("../github/issues");
const supabase_1 = require("../memory/supabase");
async function createTelegramBot(app) {
    let bot;
    if (config_1.config.WEBHOOK_URL) {
        bot = new node_telegram_bot_api_1.default(config_1.config.TELEGRAM_BOT_TOKEN, { webHook: true });
        const webhookPath = `/telegram-webhook`;
        await bot.setWebHook(`${config_1.config.WEBHOOK_URL}${webhookPath}`);
        app.post(webhookPath, (req, res) => {
            bot.processUpdate(req.body);
            res.sendStatus(200);
        });
        console.log('✅ Telegram webhook registered');
    }
    else {
        bot = new node_telegram_bot_api_1.default(config_1.config.TELEGRAM_BOT_TOKEN, { polling: true });
        console.log('✅ Telegram polling started');
    }
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = (msg.text ?? '').trim();
        // Security: only allowed user
        if (userId !== config_1.config.TELEGRAM_ALLOWED_USER_ID) {
            return bot.sendMessage(chatId, '🚫 Unauthorized.');
        }
        try {
            await routeCommand(bot, chatId, text);
        }
        catch (err) {
            console.error('Command error:', err);
            await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
        }
    });
    return bot;
}
async function routeCommand(bot, chatId, text) {
    // /status
    if (text === '/status') {
        const issue = await (0, issues_1.getLastIssue)();
        const msg = issue
            ? `📋 Last issue: [#${issue.number}](${issue.html_url})\nStatus: ${issue.state}`
            : '📋 No issues found.';
        return bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    }
    // /memory search <query>
    if (text.startsWith('/memory search ')) {
        const query = text.slice('/memory search '.length).trim();
        if (!query)
            return bot.sendMessage(chatId, '❓ Please provide a search query.');
        await bot.sendMessage(chatId, `🔍 Searching memory for: "${query}"...`);
        const results = await (0, supabase_1.semanticSearch)(query, 5);
        if (!results.length)
            return bot.sendMessage(chatId, '📭 No relevant memories found.');
        const reply = results
            .map((r, i) => `*${i + 1}.* ${r.summary.slice(0, 200)}...`)
            .join('\n\n');
        return bot.sendMessage(chatId, `🧠 *Memory Results:*\n\n${reply}`, { parse_mode: 'Markdown' });
    }
    // SAFE: / BUILD: / BUG:
    const prefixMatch = text.match(/^(SAFE|BUILD|BUG):\s*(.+)$/is);
    if (prefixMatch) {
        const [, type, description] = prefixMatch;
        await bot.sendMessage(chatId, `🤖 Received *${type}* command. Starting agent meeting...`, {
            parse_mode: 'Markdown',
        });
        // Create GitHub issue first
        const issue = await (0, issues_1.createIssue)(type, description);
        await bot.sendMessage(chatId, `📌 Created issue [#${issue.number}](${issue.html_url})`, { parse_mode: 'Markdown' });
        // Run multi-agent meeting
        await bot.sendMessage(chatId, `⚙️ Running 6-agent meeting... (this may take ~60s)`);
        const result = await (0, meeting_1.runMeeting)({ type, description, issueNumber: issue.number });
        // Post completed plan
        await bot.sendMessage(chatId, `✅ Meeting complete! Plan posted to [#${issue.number}](${issue.html_url})\n\n*Risk Verdict:* ${result.riskVerdict}`, { parse_mode: 'Markdown' });
        return;
    }
    // Unknown
    await bot.sendMessage(chatId, `❓ Unknown command. Use:\n- \`SAFE: <description>\`\n- \`BUILD: <description>\`\n- \`BUG: <description>\`\n- \`/status\`\n- \`/memory search <query>\``, { parse_mode: 'Markdown' });
}
//# sourceMappingURL=bot.js.map