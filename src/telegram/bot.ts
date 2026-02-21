import type { Application } from 'express';
import TelegramBot from 'node-telegram-bot-api';
// We replaced runMeeting with executeAgentPipeline
import { executeAgentPipeline } from '../agents';
import { config } from '../config';
import { createRunContext, withContext } from '../core/context';
import { IntentSchema } from '../core/schemas';
import { createIssue, getLastIssue } from '../github/issues';
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

    // Set instance in tools for abstraction
    telegramTools.setInstance(bot);

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = (msg.text ?? '').trim();

        const ctx = createRunContext('telegram');

        return withContext(ctx, `Telegram Message [${chatId}]`, async () => {
            // Security: only allowed user
            if (userId !== config.TELEGRAM_ALLOWED_USER_ID) {
                return telegramTools.sendMessage(ctx, chatId, '🚫 Unauthorized.');
            }

            // Save chat to memory for context
            if (text) {
                await saveRecentChat(ctx, userId.toString(), text);
            }

            try {
                await routeCommand(ctx, chatId, text);
            } catch (err) {
                console.error('Command error:', err);
                await telegramTools.sendMessage(ctx, chatId, `❌ Error: ${(err as Error).message}`);
            }
        });
    });

    return bot;
}

async function routeCommand(ctx: ReturnType<typeof createRunContext>, chatId: number, text: string) {
    // /status
    if (text === '/status') {
        const issue = await getLastIssue();
        const msg = issue
            ? `📋 Last issue: [#${issue.number}](${issue.html_url})\nStatus: ${issue.state}`
            : '📋 No issues found.';
        return telegramTools.sendMessage(ctx, chatId, msg, { parse_mode: 'Markdown' });
    }

    // /memory search <query>
    if (text.startsWith('/memory search ')) {
        const query = text.slice('/memory search '.length).trim();
        return handleMemorySearchCommand(ctx, chatId, query);
    }

    // SAFE: / BUILD: / BUG:
    const prefixMatch = text.match(/^(SAFE|BUILD|BUG):\s*(.+)$/is);
    if (prefixMatch) {
        const [, type, description] = prefixMatch;
        const intent = IntentSchema.parse(type);

        await telegramTools.sendMessage(ctx, chatId, `🤖 Received *${intent}* command. Starting agent pipeline...`, {
            parse_mode: 'Markdown',
        });

        // For now, we still create the GitHub issue directly or let the pipeline do it?
        // The MVP prompt says: "Worker: for now, respond with stub execution OR trigger GitHub issue/PR creation if already supported"
        // Let's keep the legacy issue creation here, but wrap it in executeAgentPipeline.
        const issue = await createIssue(type, description);
        await telegramTools.sendMessage(
            ctx,
            chatId,
            `📌 Created issue [#${issue.number}](${issue.html_url})`,
            { parse_mode: 'Markdown' }
        );

        // Run multi-agent pipeline
        await telegramTools.sendMessage(ctx, chatId, `⚙️ Running multi-agent pipeline...`);

        const result = await executeAgentPipeline(ctx, intent, description, '');

        // Standardized output format requested by user
        const finalMessage = `*${intent}: ${description.slice(0, 30)}...*

*Intent:* ${result.status}
*Trace:* \`${ctx.traceId}\`

*Summary:*
${result.summary}

*Actions Taken:*
${result.actions_taken.map(a => `- ${a}`).join('\n')}

*Links:*
${result.links ? result.links.map(l => `- [Link](${l})`).join('\n') : 'None'}

*Next Steps:*
${result.next_steps ? result.next_steps.map(s => `- ${s}`).join('\n') : 'None'}`;

        return telegramTools.sendMessage(ctx, chatId, finalMessage, { parse_mode: 'Markdown' });
    }

    const helpText = `📖 Available commands:\n- \`SAFE: <description>\`\n- \`BUILD: <description>\`\n- \`BUG: <description>\`\n- \`/status\`\n- \`/memory search <query>\``;

    if (text.toLowerCase() === '/help' || text.toLowerCase() === 'help') {
        return telegramTools.sendMessage(ctx, chatId, helpText, { parse_mode: 'Markdown' });
    }

    // Unknown
    await telegramTools.sendMessage(
        ctx,
        chatId,
        `❓ Unknown command. ${helpText.replace('📖 Available commands:\n', '')}`,
        { parse_mode: 'Markdown' }
    );
}
