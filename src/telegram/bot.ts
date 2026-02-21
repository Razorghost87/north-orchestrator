import type { Application } from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { executeAgentPipeline } from '../agents';
import { config } from '../config';
import { createRunContext, withContext } from '../core/context';
import { IntentSchema } from '../core/schemas';
import { getLastIssue } from '../github/issues';
import { handleMemorySearchCommand, saveRecentChat } from '../memory/commands';
import { telegramTools } from '../tools/telegram';

export async function createTelegramBot(app: Application): Promise<TelegramBot> {
    let bot: TelegramBot;

    if (config.WEBHOOK_URL) {
        bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { webHook: true });

        const webhookPath = `/telegram-webhook`;

        await bot.setWebHook(`${config.WEBHOOK_URL}${webhookPath}`);

        app.post(webhookPath, (req, res) => {
            bot.processUpdate(req.body);
            res.sendStatus(200);
        });

        console.log('✅ Telegram webhook registered');
    } else {
        bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
        console.log('✅ Telegram polling started');
    }

    // Inject bot instance into tool abstraction layer
    telegramTools.setInstance(bot);

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = (msg.text ?? '').trim();

        const ctx = createRunContext('telegram');

        return withContext(ctx, `Telegram Message [${chatId}]`, async () => {

            // 🔐 Security: Only allow configured user
            if (userId !== config.TELEGRAM_ALLOWED_USER_ID) {
                return telegramTools.sendMessage(ctx, chatId, '🚫 Unauthorized.');
            }

            // Save chat into memory context
            if (text) {
                await saveRecentChat(ctx, userId.toString(), text);
            }

            try {
                await routeCommand(ctx, chatId, text);
            } catch (err) {
                console.error(`[${ctx.traceId}] Command error:`, err);
                await telegramTools.sendMessage(
                    ctx,
                    chatId,
                    `❌ Error processing request.\nTrace: \`${ctx.traceId}\``,
                    { parse_mode: 'Markdown' }
                );
            }
        });
    });

    return bot;
}

async function routeCommand(
    ctx: ReturnType<typeof createRunContext>,
    chatId: number,
    text: string
) {

    const helpText =
        `📖 *Available Commands:*\n\n` +
        `- \`SAFE: <description>\`\n` +
        `- \`BUILD: <description>\`\n` +
        `- \`BUG: <description>\`\n` +
        `- \`/status\`\n` +
        `- \`/memory search <query>\``;

    // -------------------------
    // /help
    // -------------------------
    if (text.toLowerCase() === '/help' || text.toLowerCase() === 'help') {
        return telegramTools.sendMessage(ctx, chatId, helpText, {
            parse_mode: 'Markdown',
        });
    }

    // -------------------------
    // /status
    // -------------------------
    if (text === '/status') {
        const issue = await getLastIssue();

        const msg = issue
            ? `📋 *Last Issue:* [#${issue.number}](${issue.html_url})\nStatus: *${issue.state}*`
            : '📋 No issues found.';

        return telegramTools.sendMessage(ctx, chatId, msg, {
            parse_mode: 'Markdown',
        });
    }

    // -------------------------
    // /memory search
    // -------------------------
    if (text.startsWith('/memory search ')) {
        const query = text.slice('/memory search '.length).trim();
        return handleMemorySearchCommand(ctx, chatId, query);
    }

    // -------------------------
    // SAFE / BUILD / BUG
    // -------------------------
    const prefixMatch = text.match(/^(SAFE|BUILD|BUG):\s*(.+)$/is);

    if (prefixMatch) {
        const [, type, description] = prefixMatch;

        const intent = IntentSchema.parse(type);

        await telegramTools.sendMessage(
            ctx,
            chatId,
            `🤖 Received *${intent}* command.\n⚙️ Running multi-agent pipeline...`,
            { parse_mode: 'Markdown' }
        );

        const result = await executeAgentPipeline(ctx, intent, description);

        const finalMessage =
            `*${intent}: ${description.slice(0, 40)}...*\n\n` +
            `*Status:* ${result.status}\n` +
            `*Trace:* \`${ctx.traceId}\`\n\n` +
            `*Summary:*\n${result.summary}\n\n` +
            `*Actions Taken:*\n${
                result.actions_taken?.length
                    ? result.actions_taken.map(a => `- ${a}`).join('\n')
                    : 'None'
            }\n\n` +
            `*Links:*\n${
                result.links?.length
                    ? result.links.map(l => `- [Link](${l})`).join('\n')
                    : 'None'
            }\n\n` +
            `*Next Steps:*\n${
                result.next_steps?.length
                    ? result.next_steps.map(s => `- ${s}`).join('\n')
                    : 'None'
            }`;

        return telegramTools.sendMessage(ctx, chatId, finalMessage, {
            parse_mode: 'Markdown',
        });
    }

    // -------------------------
    // Unknown Command
    // -------------------------
    return telegramTools.sendMessage(
        ctx,
        chatId,
        `❓ Unknown command.\n\n${helpText}`,
        { parse_mode: 'Markdown' }
    );
}